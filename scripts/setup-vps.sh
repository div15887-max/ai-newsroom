#!/usr/bin/env bash
# Run once on a fresh Ubuntu 22.04 instance (as root or with sudo)
# Usage: sudo bash setup-vps.sh
set -euo pipefail

echo "==> Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git build-essential

echo "==> Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

echo "==> Installing OpenClaw globally..."
npm install -g openclaw@latest
echo "OpenClaw: $(openclaw --version)"

echo "==> Enabling systemd user linger for ubuntu user..."
loginctl enable-linger ubuntu

echo "==> Creating systemd user directory..."
mkdir -p /home/ubuntu/.config/systemd/user

echo "==> Creating Node.js compile cache directory..."
mkdir -p /var/tmp/openclaw-compile-cache
chown ubuntu:ubuntu /var/tmp/openclaw-compile-cache

echo ""
echo "============================================"
echo "  Setup complete. Next steps:"
echo "  1. exit and re-login as ubuntu (not root)"
echo "  2. git clone your repo"
echo "  3. cd ai-newsroom/agent && npm install"
echo "  4. cp .env.example .env && nano .env"
echo "  5. bash scripts/configure-openclaw.sh"
echo "============================================"
