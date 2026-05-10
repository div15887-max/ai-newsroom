#!/usr/bin/env bash
# Run as the ubuntu user (not root) after setup-vps.sh
# Sets up OpenClaw config and skill files from the repo
# Usage: cd ~/ai-newsroom && bash scripts/configure-openclaw.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_ENV="$REPO_DIR/agent/.env"

if [ ! -f "$AGENT_ENV" ]; then
  echo "ERROR: $AGENT_ENV not found. Create it first: cp agent/.env.example agent/.env"
  exit 1
fi

# Load env vars
set -a; source "$AGENT_ENV"; set +a

echo "==> Creating ~/.openclaw directories..."
mkdir -p ~/.openclaw/workspace/skills

echo "==> Copying openclaw.json template..."
cp "$REPO_DIR/agent/openclaw/config/openclaw.json.template" ~/.openclaw/openclaw.json

echo "==> Copying skill files..."
cp -r "$REPO_DIR/agent/openclaw/skills/"* ~/.openclaw/workspace/skills/

echo "==> Writing ~/.openclaw/env (secrets for systemd EnvironmentFile)..."
cat > ~/.openclaw/env << EOF
OLLAMA_API_KEY=${OLLAMA_API_KEY}
OLLAMA_BASE_URL=${OLLAMA_BASE_URL}
OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
EOF
chmod 600 ~/.openclaw/env

echo "==> Replacing placeholders in openclaw.json..."
sed -i "s|\${OLLAMA_BASE_URL}|${OLLAMA_BASE_URL}|g" ~/.openclaw/openclaw.json
sed -i "s|\${OLLAMA_API_KEY}|${OLLAMA_API_KEY}|g"   ~/.openclaw/openclaw.json
sed -i "s|\${OPENCLAW_GATEWAY_TOKEN}|${OPENCLAW_GATEWAY_TOKEN}|g" ~/.openclaw/openclaw.json

echo ""
echo "OpenClaw configured. Test the gateway with:"
echo "  openclaw gateway --port 18789 &"
echo "  sleep 5"
echo "  curl -s http://127.0.0.1:18789/health"
