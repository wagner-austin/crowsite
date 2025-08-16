#!/usr/bin/env bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         RETRO DEV PORTFOLIO - Quick Start Setup             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ Node modules already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Setting up Python environment...${NC}"
if command -v poetry &> /dev/null; then
    poetry install
else
    echo -e "${YELLOW}Poetry not found, skipping Python setup${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Setting up Git hooks...${NC}"
if [ ! -d ".husky" ]; then
    npx husky install
else
    echo -e "${GREEN}✓ Husky already configured${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Running initial checks...${NC}"
bash scripts/check-setup.sh

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${CYAN}Start developing with:${NC}"
echo -e "  ${GREEN}make serve${NC}  - Start the development server"
echo -e "  ${GREEN}make help${NC}   - See all available commands"