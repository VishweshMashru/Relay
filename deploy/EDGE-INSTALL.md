# Installing the Streamo edge agent

One command on any Windows / Linux / macOS machine on the same LAN as your
cameras. The agent runs as a background service, auto-starts on boot, and
connects out to Streamo over HTTPS. **No inbound ports, no router changes.**

## Windows (factory PC — most common)

Open **PowerShell as Administrator**:

```powershell
iwr https://streamo.in/install.ps1 -useb | iex
```

Or unattended (no prompts):

```powershell
$env:RELAY_EDGE_TOKEN = "eyJhb...your-edge-token"
iwr https://streamo.in/install.ps1 -useb | iex
```

The installer:

- Downloads `relay-edge.exe` to `C:\Program Files\RelayEdge\`
- Installs `ffmpeg` via `winget` if missing
- Prompts for the edge token (skipped if `RELAY_EDGE_TOKEN` env is set)
- Registers a Windows scheduled task **`RelayEdge`** that runs at boot as SYSTEM
- Starts the task immediately

Verify:

```powershell
schtasks /Query /TN RelayEdge
```

Should show **Ready** or **Running**.

## Linux (Ubuntu / Debian / RHEL)

```bash
curl -fsSL https://streamo.in/install.sh | sh
```

Or unattended:

```bash
curl -fsSL https://streamo.in/install.sh | RELAY_EDGE_TOKEN=eyJhb... sh
```

The installer:

- Downloads the right binary (`amd64` or `arm64`) to `/usr/local/bin/relay-edge`
- Installs `ffmpeg` via `apt` / `dnf` / `yum`
- Prompts for the edge token
- Creates a **systemd unit** `relay-edge.service`
- Enables it at boot and starts it

Verify:

```bash
sudo systemctl status relay-edge
sudo journalctl -u relay-edge -f
```

## macOS (dev machine)

Same command as Linux:

```bash
curl -fsSL https://streamo.in/install.sh | sh
```

Installs to `/usr/local/bin/relay-edge` and registers a **launchd** daemon
at `/Library/LaunchDaemons/in.streamo.edge.plist`. Logs to
`/var/log/relay-edge.log`.

## Where the config lives

| Platform | Config file | Cameras file |
|-|-|-|
| Linux | `/etc/relay-edge/config` (env vars) | `/etc/relay-edge/cameras.json` |
| macOS | in the launchd `.plist` | `/etc/relay-edge/cameras.json` |
| Windows | `C:\Program Files\RelayEdge\run.bat` | `C:\ProgramData\RelayEdge\cameras.json` |

## Adding cameras

After install, edit the cameras file:

```json
{
  "cameras": {
    "692d6d4c-e050-499b-bff3-a278943b23df": "rtsp://admin:pass@192.168.1.20:554/Streaming/Channels/101"
  }
}
```

The **key** is the camera's UUID from the Streamo dashboard (or from
`POST /v1/edges/{id}/cameras`). The **value** is the RTSP URL — it stays on
this machine and is never sent to Streamo's cloud.

Restart the agent after editing:

- Linux: `sudo systemctl restart relay-edge`
- macOS: `sudo launchctl kickstart -k system/in.streamo.edge`
- Windows: `schtasks /End /TN RelayEdge; schtasks /Run /TN RelayEdge`

## Uninstalling

### Linux

```bash
sudo systemctl stop relay-edge && sudo systemctl disable relay-edge
sudo rm /etc/systemd/system/relay-edge.service /usr/local/bin/relay-edge
sudo rm -rf /etc/relay-edge
```

### macOS

```bash
sudo launchctl unload /Library/LaunchDaemons/in.streamo.edge.plist
sudo rm /Library/LaunchDaemons/in.streamo.edge.plist /usr/local/bin/relay-edge
sudo rm -rf /etc/relay-edge
```

### Windows

```powershell
schtasks /Delete /F /TN RelayEdge
Remove-Item -Recurse -Force 'C:\Program Files\RelayEdge','C:\ProgramData\RelayEdge'
```

## Troubleshooting

**`curl: (22) The requested URL returned error: 404`** — no release published
yet. Cut one from your local machine:
```bash
git tag edge-v0.1.0
git push origin edge-v0.1.0
```

**`RELAY_EDGE_TOKEN is required`** — either paste the token when prompted or
export it before piping to `sh`.

**`ffmpeg: command not found` in logs** — install ffmpeg manually and restart
the service. The installer tries `apt`/`dnf`/`winget` but some distros need
extra repos.

**Agent starts but never receives commands** — check `RELAY_API_URL` in the
config. Must match your deployed control-plane URL (`https://api.streamo.in`
for the default).

**Windows: task shows "Ready" but nothing is running** — SYSTEM tasks
sometimes get stuck. Reboot the machine or run
`schtasks /End /TN RelayEdge; schtasks /Run /TN RelayEdge`.
