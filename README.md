# ⛏ MCHost Manager

A full-featured, self-hosted **Minecraft server manager** with a polished dark web UI. Run multiple Java and Bedrock servers from one dashboard — with live console streaming, plugin management, world backups, player controls, and real-time CPU/RAM graphs.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Multiple Servers** | Manage unlimited Java and Bedrock Dedicated Server instances |
| **Live Console** | Full terminal emulator (xterm.js) with color codes, command history, and Minecraft § formatting |
| **Start / Stop / Restart / Kill** | Full process lifecycle controls with status badges |
| **Auto-Restart on Crash** | Configurable delay, auto-detects crashes and restarts automatically |
| **Scheduled Restarts** | cron-based restart scheduling (e.g. `0 4 * * *` for 4 AM daily) |
| **CPU & RAM Graphs** | Live 2-minute rolling charts per server (powered by Recharts) |
| **Plugin Manager** | Browse and install from **Modrinth** and **SpigotMC (Spiget)** directly in the UI |
| **World Backups** | One-click ZIP backups with timestamps; restore or delete from the UI |
| **Player Manager** | See who's online; OP, DEOP, kick, ban, whitelist players with one click |
| **Server Properties** | Friendly form UI for `server.properties` — no manual file editing needed |
| **Version Switcher** | Download **Paper, Purpur, Vanilla, Fabric,** or **Bedrock** JARs automatically |
| **GeyserMC Support** | Info panel + plugin install for cross-platform Java ↔ Bedrock play |
| **Dark UI** | GitHub-dark color scheme, responsive layout, native-app feel |

---

## 📋 Prerequisites

Before installing MCHost Manager, make sure you have:

### Required
- **[Node.js LTS](https://nodejs.org/)** (v18 or newer) — the backend and frontend both require this
  - Download the **LTS** installer from nodejs.org and run it
  - Restart your terminal after installing

### For Java servers
- **Java** (JDK 17+ recommended for modern Minecraft versions)
  - [Download from Adoptium](https://adoptium.net/) (free, open source)
  - Or install via: `winget install EclipseAdoptium.Temurin.21.JDK`

### For Bedrock servers (Windows only)
- Windows 10/11 (64-bit)
- The Bedrock Dedicated Server files will be downloaded automatically

---

## 🚀 Installation

### Option 1 — Windows (Recommended)

1. **Download or clone** this repository:
   ```
   git clone https://github.com/viperfighterpilot33066/MCHost-Manager.git
   cd MCHost-Manager
   ```

2. **Run the installer** (installs all Node.js dependencies):
   ```
   install.bat
   ```

3. **Launch the app:**
   ```
   start.bat
   ```

   This opens two terminal windows (backend + frontend) and automatically opens your browser to `http://localhost:3000`.

### Option 2 — Manual (any platform)

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Start the backend (in one terminal)
cd ../backend
node src/index.js

# Start the frontend (in another terminal)
cd ../frontend
npm run dev
```

Then open `http://localhost:3000` in your browser.

---

## 🖥️ How to Use

### Creating Your First Server

1. Click **"New Server"** in the sidebar or dashboard
2. Enter a **name** and choose your **server type**:
   - `Paper` — Best for plugins, most popular
   - `Purpur` — Paper fork with extra features
   - `Vanilla` — Official Mojang server, no mods/plugins
   - `Fabric` — Mod-focused, lightweight
   - `Bedrock` — Windows 10/PE/Console players
3. Set your **port** (default `25565`), **max RAM**, and whether to **auto-restart on crash**
4. Click **Create Server**

### Downloading the Server JAR

After creating a server, go to the **Versions** tab:
1. Select your **server software** (Paper, Vanilla, etc.)
2. Choose a **Minecraft version** from the dropdown
3. Click **Download** — the JAR is fetched automatically and placed in the server folder

### Starting a Server

- Click **Start** on the server card or in the server detail header
- Watch the **Console** tab for startup output
- The status badge turns green when the server is ready (you'll see `Done (X.Xs)!`)

### Console

- The **Console** tab shows a live terminal with all server output
- Type commands in the input bar at the bottom and press **Enter** to send
- Use **↑/↓ arrow keys** to navigate command history
- Click the trash icon to clear the display (doesn't affect server)

### Plugin Manager

1. Go to **Plugins** tab → click **Modrinth** or **SpigotMC**
2. Search for a plugin by name
3. Click **Install** — the `.jar` is downloaded directly into the server's `plugins/` folder
4. **Restart** the server to load the plugin

### Backups

1. Go to **Backups** tab
2. Optionally type a backup name, then click **Create Backup**
3. The entire server directory is zipped (excluding logs) and timestamped
4. To **restore**: stop the server first, then click **Restore** on any backup

> ⚠️ Restore overwrites your world files. Create a backup before restoring.

### Player Manager

- The **Players** tab shows who's currently online
- Click the icons to **OP**, **DEOP**, **kick**, or **ban** a player
- Use the manual action form to manage offline players (ban, unban, whitelist)

### Server Properties

1. Go to **Properties** tab
2. Edit settings in the friendly form (world name, gamemode, max players, etc.)
3. Click **Save** — changes are written to `server.properties`
4. **Restart** the server to apply them

### Scheduled Restarts

Edit the server config (update via the API or directly in `backend/data/servers.json`):

```json
{
  "scheduledRestarts": [
    { "cron": "0 4 * * *", "enabled": true, "timezone": "America/New_York" }
  ]
}
```

This restarts the server at 4:00 AM Eastern every day.

### GeyserMC (Cross-Platform Play)

GeyserMC lets Bedrock Edition players (mobile, console, Windows 10) join Java servers:

1. Your server must be running **Paper or Spigot**
2. Go to **Plugins** tab → search for `Geyser-Spigot` on Modrinth
3. Install it, then **restart** the server
4. Bedrock players connect on port `19132` (UDP)

---

## 📁 Project Structure

```
MCHost-Manager/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── index.js         # Entry point (Express + WebSocket)
│   │   ├── serverManager.js # Core server process management
│   │   ├── routes/          # REST API endpoints
│   │   └── services/        # Download, backup, Modrinth, scheduler
│   └── package.json
├── frontend/                # React + Vite UI
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css          # Global dark theme
│   │   ├── components/      # All UI components
│   │   ├── hooks/           # WebSocket hook
│   │   ├── store/           # Zustand state
│   │   └── api/             # Axios API client
│   └── package.json
├── install.bat              # First-time dependency installer
├── start.bat                # Launch script (auto-installs if needed)
└── README.md
```

Server files are stored in `backend/servers/<id>/` and backups in `backend/backups/<id>/`. These are gitignored and never uploaded.

---

## ⚙️ Configuration

| Setting | Default | Description |
|---|---|---|
| Backend port | `3001` | Set `PORT=3002` env var to change |
| Frontend port | `3000` | Edit `frontend/vite.config.js` |
| Max console lines | `1500` | Edit `backend/src/config.js` |
| Stats update interval | `2s` | Edit `STATS_INTERVAL` in config |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, `ws` (WebSockets) |
| Process management | Node.js `child_process.spawn` |
| Scheduling | `node-cron` |
| Monitoring | `pidusage` (per-process CPU/RAM) |
| Backups | `archiver` (zip), `unzipper` |
| Plugin APIs | Modrinth API v2, Spiget API v2 |
| Frontend | React 18, Vite |
| State | Zustand |
| Charts | Recharts |
| Terminal | @xterm/xterm |
| Icons | lucide-react |
| Notifications | react-hot-toast |

---

## 🔒 Security Notes

- MCHost Manager is designed to run **locally** or on a **private/trusted network**
- There is no authentication layer by default — do not expose port `3001` or `3000` to the public internet
- If you want remote access, put it behind a reverse proxy (Nginx/Caddy) with authentication

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for the Minecraft community.*
