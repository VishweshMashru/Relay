#!/bin/sh
# Streamo edge agent installer (Linux + macOS).
#
# Usage:
#   curl -fsSL https://streamo.in/install.sh | sh                          # interactive
#   curl -fsSL https://streamo.in/install.sh | RELAY_EDGE_TOKEN=xxx sh     # unattended
#
# What it does:
#   - Detects OS/arch
#   - Downloads the latest relay-edge binary from GitHub Releases
#   - Installs it to /usr/local/bin/relay-edge
#   - Registers it as a system service (systemd on Linux, launchd on macOS)
#   - Enables auto-start on boot
#   - Attempts to install ffmpeg via apt/dnf/brew if missing
#
# Uninstall:
#   sudo systemctl stop relay-edge && sudo systemctl disable relay-edge
#   sudo rm /etc/systemd/system/relay-edge.service /usr/local/bin/relay-edge
#   sudo rm -rf /etc/relay-edge

set -e

REPO="VishweshMashru/Relay"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
CONFIG_DIR="/etc/relay-edge"
RELAY_API_URL="${RELAY_API_URL:-https://api.streamo.in}"

# --- OS / arch detection ------------------------------------------------------
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
  Linux*)  OS=linux  ;;
  Darwin*) OS=darwin ;;
  *) echo "✗ Unsupported OS: $OS" >&2; exit 1 ;;
esac
case "$ARCH" in
  x86_64|amd64)  ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "✗ Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

BINARY="relay-edge-${OS}-${ARCH}"
echo "→ Detected ${OS}/${ARCH}"

# --- Elevate if needed --------------------------------------------------------
SUDO=""
if [ "$(id -u)" != "0" ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "✗ Please run as root or install sudo." >&2
    exit 1
  fi
fi

# --- Locate the release asset -------------------------------------------------
echo "→ Finding latest release..."
LATEST_JSON=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")
LATEST_URL=$(echo "$LATEST_JSON" \
  | grep browser_download_url \
  | grep "/${BINARY}\"" \
  | head -1 \
  | cut -d '"' -f 4)

if [ -z "$LATEST_URL" ]; then
  echo "✗ No release asset found for ${BINARY}." >&2
  echo "  Cut a release from the repo first with:" >&2
  echo "    git tag edge-v0.1.0 && git push origin edge-v0.1.0" >&2
  exit 1
fi

# --- Download + install -------------------------------------------------------
echo "→ Downloading $(basename "$LATEST_URL")..."
TMP=$(mktemp)
curl -fsSL "$LATEST_URL" -o "$TMP"
$SUDO install -m 755 "$TMP" "${INSTALL_DIR}/relay-edge"
rm -f "$TMP"
echo "✓ Installed ${INSTALL_DIR}/relay-edge"

# --- ffmpeg (best-effort) -----------------------------------------------------
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "→ Installing ffmpeg..."
  if [ "$OS" = "linux" ] && command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq && $SUDO apt-get install -y ffmpeg
  elif [ "$OS" = "linux" ] && command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y ffmpeg
  elif [ "$OS" = "linux" ] && command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y ffmpeg
  elif [ "$OS" = "darwin" ] && command -v brew >/dev/null 2>&1; then
    brew install ffmpeg
  else
    echo "! Please install ffmpeg manually (relay-edge needs it to stream)."
  fi
else
  echo "✓ ffmpeg already present"
fi

# --- Config -------------------------------------------------------------------
if [ -z "$RELAY_EDGE_TOKEN" ]; then
  printf "\nPaste your edge token (from the Streamo dashboard): "
  read -r RELAY_EDGE_TOKEN < /dev/tty
fi
if [ -z "$RELAY_EDGE_TOKEN" ]; then
  echo "✗ RELAY_EDGE_TOKEN is required." >&2
  exit 1
fi

$SUDO mkdir -p "$CONFIG_DIR"
$SUDO sh -c "cat > ${CONFIG_DIR}/config" <<EOF
RELAY_API_URL=${RELAY_API_URL}
RELAY_EDGE_TOKEN=${RELAY_EDGE_TOKEN}
RELAY_CAMERAS_FILE=${CONFIG_DIR}/cameras.json
EOF
$SUDO chmod 600 "${CONFIG_DIR}/config"

if [ ! -f "${CONFIG_DIR}/cameras.json" ]; then
  $SUDO sh -c "cat > ${CONFIG_DIR}/cameras.json" <<'EOF'
{
  "cameras": {}
}
EOF
fi

# --- Service registration -----------------------------------------------------
if [ "$OS" = "linux" ] && command -v systemctl >/dev/null 2>&1; then
  $SUDO sh -c "cat > /etc/systemd/system/relay-edge.service" <<'EOF'
[Unit]
Description=Streamo edge agent
Documentation=https://streamo.in
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/relay-edge/config
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/local/bin/relay-edge
Restart=always
RestartSec=5
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable relay-edge >/dev/null 2>&1
  $SUDO systemctl restart relay-edge
  echo ""
  echo "✓ relay-edge running as a systemd service."
  echo "  Status: sudo systemctl status relay-edge"
  echo "  Logs:   sudo journalctl -u relay-edge -f"
elif [ "$OS" = "darwin" ]; then
  PLIST="/Library/LaunchDaemons/in.streamo.edge.plist"
  $SUDO sh -c "cat > $PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>in.streamo.edge</string>
  <key>ProgramArguments</key>
  <array><string>${INSTALL_DIR}/relay-edge</string></array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>RELAY_API_URL</key><string>${RELAY_API_URL}</string>
    <key>RELAY_EDGE_TOKEN</key><string>${RELAY_EDGE_TOKEN}</string>
    <key>RELAY_CAMERAS_FILE</key><string>${CONFIG_DIR}/cameras.json</string>
    <!-- launchd's default PATH excludes /usr/local/bin and /opt/homebrew/bin;
         ffmpeg lives in one of those depending on architecture / Homebrew. -->
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/var/log/relay-edge.log</string>
  <key>StandardErrorPath</key><string>/var/log/relay-edge.log</string>
</dict>
</plist>
EOF
  $SUDO launchctl unload "$PLIST" 2>/dev/null || true
  $SUDO launchctl load -w "$PLIST"
  echo ""
  echo "✓ relay-edge running as a launchd daemon."
  echo "  Logs: sudo tail -f /var/log/relay-edge.log"
fi

echo ""
echo "Next step — add your cameras:"
echo "  sudo nano ${CONFIG_DIR}/cameras.json"
echo ""
echo "Example content:"
cat <<'EOF'
  {
    "cameras": {
      "<camera-uuid-from-dashboard>": "rtsp://user:pass@192.168.1.20:554/Streaming/Channels/101"
    }
  }
EOF
echo ""
echo "After editing, restart with:"
if [ "$OS" = "linux" ]; then
  echo "  sudo systemctl restart relay-edge"
else
  echo "  sudo launchctl unload $PLIST && sudo launchctl load -w $PLIST"
fi
