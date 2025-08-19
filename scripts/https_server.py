#!/usr/bin/env python3
from __future__ import annotations
import os, sys, ssl, socket, tempfile, shutil, subprocess, signal, threading, webbrowser, time
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

# Serve from project root
ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)

def lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to reach 8.8.8.8; just picks the right NIC
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

def ensure_certs(cert: Path, key: Path, ip: str) -> None:
    """If certs are missing, try to generate a self-signed cert with SAN for localhost + LAN IP using OpenSSL.
       If OpenSSL isn't available, fail with a clear message (no hacks)."""
    if cert.exists() and key.exists():
        return

    openssl = shutil.which('openssl')
    if not openssl:
        print("ERROR: cert.pem/key.pem not found and OpenSSL is not installed.\n"
              " - Install OpenSSL (or use mkcert), or\n"
              " - Drop valid cert.pem/key.pem into the project root.\n")
        sys.exit(1)

    san = f"DNS:localhost,IP:127.0.0.1,IP:{ip}"
    cnf = f"""[req]
distinguished_name=req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
CN=localhost
[v3_req]
subjectAltName = {san}
"""
    with tempfile.NamedTemporaryFile('w', delete=False, suffix='.cnf') as f:
        f.write(cnf)
        cfg = f.name

    try:
        subprocess.run(
            [openssl, 'req', '-x509',
             '-newkey', 'rsa:2048',
             '-keyout', str(key),
             '-out', str(cert),
             '-days', '365',
             '-nodes',
             '-config', cfg],
            check=True,
            capture_output=True
        )
        print(f"Generated self-signed certificate (SAN: localhost, 127.0.0.1, {ip})")
    finally:
        try: os.unlink(cfg)
        except OSError: pass

class QuietHandler(SimpleHTTPRequestHandler):
    # Less noisy, one-line request log
    def log_request(self, code='-', size='-'):
        ts = time.strftime("%m/%d/%Y %I:%M:%S %p")
        client = self.client_address[0]
        print(f" HTTP  {ts} {client} {self.command} {self.path}")
        print(f" HTTP  {ts} {client} Returned {code}")

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--port', type=int, default=int(os.environ.get('PORT', '3000')))
    p.add_argument('--host', default='0.0.0.0')  # reachable from phone
    p.add_argument('--no-open', action='store_true')
    args = p.parse_args()

    ip = lan_ip()
    cert = Path('cert.pem')
    key = Path('key.pem')
    ensure_certs(cert, key, ip)

    httpd = ThreadingHTTPServer((args.host, args.port), QuietHandler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=str(cert), keyfile=str(key))
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    local_url = f"https://localhost:{args.port}"
    net_url   = f"https://{ip}:{args.port}"

    print()
    print("Starting HTTPS dev server...")
    print(f"  Local:   {local_url}")
    print(f"  Network: {net_url}")
    print()
    print("  ⚠️  IMPORTANT: Use HTTPS (not HTTP) and accept the certificate warning")
    print("  Press Ctrl+C to stop")
    print()

    if not args.no_open:
        try: webbrowser.open_new_tab(local_url)
        except Exception: pass

    def shutdown_signal(_sig, _frm):
        print("\n INFO  Gracefully shutting down. Please wait...")
        threading.Thread(target=httpd.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, shutdown_signal)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, shutdown_signal)

    try:
        httpd.serve_forever(poll_interval=0.2)
    finally:
        httpd.server_close()

if __name__ == '__main__':
    main()