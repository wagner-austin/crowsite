import { Logger } from '../core/logger.js';

export class Terminal {
    constructor(outputSelector, inputSelector) {
        this.logger = new Logger('Terminal');
        this.output = document.querySelector(outputSelector);
        this.input = document.querySelector(inputSelector);
        this.history = [];
        this.historyIndex = 0;
        this.commands = new Map();

        this.registerDefaultCommands();
    }

    init() {
        if (!this.output || !this.input) {
            this.logger.error('Terminal elements not found');
            return;
        }

        this.input.addEventListener('keydown', this.handleInput.bind(this));
        this.addLine('Terminal initialized. Type "help" for available commands.');
        this.logger.info('Terminal initialized');
    }

    registerDefaultCommands() {
        this.register('help', () => this.showHelp());
        this.register('clear', () => this.clear());
        this.register('about', () => this.showAbout());
        this.register('skills', () => this.showSkills());
        this.register('projects', () => this.showProjects());
        this.register('contact', () => this.showContact());
        this.register('theme', args => this.changeTheme(args));
        this.register('echo', args => this.echo(args));
        this.register('date', () => this.showDate());
        this.register('time', () => this.showTime());
        this.register('weather', () => this.showWeather());
        this.register('whoami', () => this.whoami());
        this.register('ls', () => this.listSections());
        this.register('cd', args => this.navigateTo(args));
        this.register('cat', args => this.showContent(args));
        this.register('matrix', () => this.startMatrix());
        this.register('game', () => this.startGame());
        this.register('hack', () => this.startHacking());
        this.register('sudo', args => this.sudo(args));
        this.register('history', () => this.showHistory());
        this.register('export', () => this.exportHistory());
        this.register('neofetch', () => this.neofetch());
    }

    register(command, handler) {
        this.commands.set(command.toLowerCase(), handler);
        this.logger.debug(`Command registered: ${command}`);
    }

    handleInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const command = this.input.value.trim();

            if (command) {
                this.execute(command);
                this.history.push(command);
                this.historyIndex = this.history.length;
            }

            this.input.value = '';
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex -= 1;
                this.input.value = this.history[this.historyIndex];
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex += 1;
                this.input.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.input.value = '';
            }
        } else if (event.key === 'Tab') {
            event.preventDefault();
            this.autocomplete();
        }
    }

    execute(commandLine) {
        this.addLine(`$ ${commandLine}`, 'command');

        const [command, ...args] = commandLine.toLowerCase().split(' ');
        const handler = this.commands.get(command);

        if (handler) {
            try {
                const result = handler(args);
                if (result instanceof Promise) {
                    result
                        .then(output => {
                            if (output) {
                                this.addLine(output);
                            }
                        })
                        .catch(error => {
                            this.addLine(`Error: ${error.message}`, 'error');
                        });
                } else if (result) {
                    this.addLine(result);
                }
            } catch (error) {
                this.addLine(`Error executing command: ${error.message}`, 'error');
                this.logger.error(`Command execution failed: ${command}`, error);
            }
        } else {
            this.addLine(
                `Command not found: ${command}. Type "help" for available commands.`,
                'error'
            );
        }
    }

    addLine(text, type = 'default') {
        const line = document.createElement('p');
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    addHTML(html, type = 'default') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.innerHTML = html;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    clear() {
        this.output.innerHTML = '';
        this.addLine('Terminal cleared');
        return null;
    }

    showHelp() {
        const commands = [
            { cmd: 'help', desc: 'Show available commands' },
            { cmd: 'clear', desc: 'Clear terminal output' },
            { cmd: 'about', desc: 'Display information about me' },
            { cmd: 'skills', desc: 'List technical skills' },
            { cmd: 'projects', desc: 'Show recent projects' },
            { cmd: 'contact', desc: 'Display contact information' },
            { cmd: 'theme [name]', desc: 'Change theme (cyberpunk/synthwave/matrix/vaporwave)' },
            { cmd: 'echo [text]', desc: 'Print text to terminal' },
            { cmd: 'date', desc: 'Show current date' },
            { cmd: 'time', desc: 'Show current time' },
            { cmd: 'weather', desc: 'Display weather information' },
            { cmd: 'whoami', desc: 'Display user information' },
            { cmd: 'ls', desc: 'List available sections' },
            { cmd: 'cd [section]', desc: 'Navigate to section' },
            { cmd: 'cat [file]', desc: 'Display file contents' },
            { cmd: 'matrix', desc: 'Start matrix rain effect' },
            { cmd: 'game', desc: 'Launch mini game' },
            { cmd: 'hack', desc: 'Initialize hacking sequence' },
            { cmd: 'neofetch', desc: 'Display system information' },
            { cmd: 'history', desc: 'Show command history' },
        ];

        this.addLine('Available Commands:');
        this.addLine('═══════════════════════════════════════');

        commands.forEach(({ cmd, desc }) => {
            const padding = ' '.repeat(20 - cmd.length);
            this.addLine(`  ${cmd}${padding}${desc}`, 'info');
        });

        return null;
    }

    showAbout() {
        const about = `
╔══════════════════════════════════════╗
║           ABOUT DEVELOPER            ║
╠══════════════════════════════════════╣
║ Name:       Developer                ║
║ Role:       Full-Stack Engineer       ║
║ Location:   Cyberspace               ║
║ Interests:  AI, Blockchain, Gaming   ║
║ Status:     Available for hire        ║
╚══════════════════════════════════════╝
        `;
        this.addHTML(`<pre>${about}</pre>`, 'success');
        return null;
    }

    showSkills() {
        const skills = {
            Languages: ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go'],
            Frontend: ['React', 'Vue', 'Angular', 'WebGL', 'WASM'],
            Backend: ['Node.js', 'Express', 'Django', 'FastAPI', 'GraphQL'],
            Database: ['PostgreSQL', 'MongoDB', 'Redis', 'ElasticSearch'],
            DevOps: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform'],
        };

        Object.entries(skills).forEach(([category, items]) => {
            this.addLine(`[${category}]`, 'info');
            this.addLine(`  ${items.join(' | ')}`, 'success');
        });

        return null;
    }

    showProjects() {
        this.addLine('Recent Projects:', 'info');
        this.addLine('1. Neural Network Visualizer - Interactive 3D ML visualization');
        this.addLine('2. Quantum Computing Sim - Browser-based quantum simulator');
        this.addLine('3. Blockchain Explorer - Real-time transaction explorer');
        this.addLine('4. AR Game Engine - WebXR-based gaming platform');
        return null;
    }

    showContact() {
        this.addLine('Contact Information:', 'info');
        this.addLine('Email: developer@example.com');
        this.addLine('GitHub: github.com/developer');
        this.addLine('LinkedIn: linkedin.com/in/developer');
        this.addLine('Twitter: @developer');
        return null;
    }

    changeTheme(args) {
        const [theme] = args;
        const validThemes = ['cyberpunk', 'synthwave', 'matrix', 'vaporwave'];

        if (!theme) {
            return `Current theme: ${document.documentElement.dataset.theme}. Available: ${validThemes.join(', ')}`;
        }

        if (validThemes.includes(theme)) {
            document.documentElement.dataset.theme = theme;
            this.addLine(`Theme changed to: ${theme}`, 'success');
        } else {
            this.addLine(`Invalid theme. Available: ${validThemes.join(', ')}`, 'error');
        }

        return null;
    }

    echo(args) {
        return args.join(' ');
    }

    showDate() {
        return new Date().toLocaleDateString();
    }

    showTime() {
        return new Date().toLocaleTimeString();
    }

    async showWeather() {
        this.addLine('Fetching weather data...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'Weather: 72°F | Partly Cloudy | Humidity: 45%';
    }

    whoami() {
        return 'guest@dev-terminal';
    }

    listSections() {
        const sections = ['about', 'projects', 'skills', 'terminal', 'contact'];
        this.addLine('Available sections:', 'info');
        sections.forEach(section => {
            this.addLine(`  ./${section}`, 'success');
        });
        return null;
    }

    navigateTo(args) {
        const [section] = args;
        const element = document.getElementById(section);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            this.addLine(`Navigated to: ${section}`, 'success');
        } else {
            this.addLine(`Section not found: ${section}`, 'error');
        }

        return null;
    }

    showContent(args) {
        const [file] = args;
        const contents = {
            readme: 'DEV_TERMINAL v1.0 - A retro-futuristic developer portfolio',
            license: 'MIT License - Free to use and modify',
            package: '{ "name": "dev-terminal", "version": "1.0.0" }',
        };

        return contents[file] || `File not found: ${file}`;
    }

    startMatrix() {
        this.addLine('Initiating Matrix rain...', 'success');
        document.documentElement.dataset.theme = 'matrix';
        return 'Welcome to the Matrix, Neo.';
    }

    startGame() {
        this.addLine('Loading game...', 'info');
        this.addLine('Game: Snake Terminal Edition', 'success');
        this.addLine('Use arrow keys to move. Press Q to quit.', 'info');
        return 'Feature coming soon!';
    }

    startHacking() {
        this.addLine('INITIALIZING HACK SEQUENCE...', 'warning');
        const chars = '0123456789ABCDEF';

        for (let i = 0; i < 5; i++) {
            let line = '';
            for (let j = 0; j < 32; j++) {
                line += chars[Math.floor(Math.random() * chars.length)];
            }
            this.addLine(line, 'success');
        }

        return 'ACCESS GRANTED';
    }

    sudo(args) {
        if (args.join(' ') === 'rm -rf /') {
            this.addLine('Nice try! 😏', 'error');
            return 'Permission denied: Attempted to destroy the universe';
        }
        return 'sudo: command not found (this is a simulation)';
    }

    showHistory() {
        if (this.history.length === 0) {
            return 'No commands in history';
        }

        this.history.forEach((cmd, index) => {
            this.addLine(`  ${index + 1}  ${cmd}`, 'info');
        });

        return null;
    }

    exportHistory() {
        const data = JSON.stringify(this.history, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-history-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return 'History exported to file';
    }

    neofetch() {
        const info = `
        ████████████████        developer@dev-terminal
        ████████████████        ----------------------
        ████████████████        OS: WebOS 1.0
        ████████████████        Host: ${window.location.hostname}
        ████████████████        Kernel: JavaScript ES2024
        ████████████████        Uptime: ${Math.floor(performance.now() / 1000)} seconds
        ████████████████        Shell: Terminal.js 1.0
        ████████████████        Resolution: ${window.innerWidth}x${window.innerHeight}
        ████████████████        Browser: ${navigator.userAgent.split(' ').pop()}
        ████████████████        Theme: ${document.documentElement.dataset.theme}
        ████████████████        Memory: ${performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 'N/A'}
        `;

        this.addHTML(`<pre style="color: var(--color-primary)">${info}</pre>`);
        return null;
    }

    autocomplete() {
        const currentInput = this.input.value.toLowerCase();
        const matches = Array.from(this.commands.keys()).filter(cmd =>
            cmd.startsWith(currentInput)
        );

        if (matches.length === 1) {
            [this.input.value] = matches;
        } else if (matches.length > 1) {
            this.addLine(`Suggestions: ${matches.join(', ')}`, 'info');
        }
    }
}
