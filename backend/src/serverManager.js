const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const config = require('./config');

class MinecraftServer extends EventEmitter {
  constructor(cfg) {
    super();
    this.id = cfg.id;
    this.name = cfg.name;
    this.type = cfg.type || 'java'; // java | bedrock
    this.version = cfg.version || '';
    this.loader = cfg.loader || 'paper'; // vanilla | paper | spigot | fabric | forge | bedrock
    this.jarFile = cfg.jarFile || 'server.jar';
    this.port = cfg.port || 25565;
    this.maxRam = cfg.maxRam || '2G';
    this.minRam = cfg.minRam || '512M';
    this.javaPath = cfg.javaPath || config.DEFAULT_JAVA_PATH;
    this.javaArgs = cfg.javaArgs || [];
    this.autoRestart = cfg.autoRestart || false;
    this.autoRestartDelay = cfg.autoRestartDelay || 10;
    this.scheduledRestarts = cfg.scheduledRestarts || [];
    this.geyser = cfg.geyser || false;
    this.bedrockPort = cfg.bedrockPort || 19132;
    this.maxPlayers = cfg.maxPlayers || 20;
    this.onlineMode = cfg.onlineMode !== undefined ? cfg.onlineMode : true;
    this.icon = cfg.icon || null;
    this.description = cfg.description || '';

    this.status = 'stopped';
    this.process = null;
    this.consoleHistory = [];
    this.players = [];
    this.stats = { cpu: 0, ram: 0, ramBytes: 0 };
    this.startTime = null;
    this.pid = null;

    this.dir = path.join(config.SERVERS_DIR, this.id);
    this._autoRestartTimer = null;
    this._statsInterval = null;
    this._crashRestarting = false;
    this._stopping = false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      version: this.version,
      loader: this.loader,
      jarFile: this.jarFile,
      port: this.port,
      maxRam: this.maxRam,
      minRam: this.minRam,
      javaPath: this.javaPath,
      javaArgs: this.javaArgs,
      autoRestart: this.autoRestart,
      autoRestartDelay: this.autoRestartDelay,
      scheduledRestarts: this.scheduledRestarts,
      geyser: this.geyser,
      bedrockPort: this.bedrockPort,
      maxPlayers: this.maxPlayers,
      onlineMode: this.onlineMode,
      description: this.description,
      status: this.status,
      players: this.players,
      stats: this.stats,
      pid: this.pid,
      startTime: this.startTime,
    };
  }

  toConfig() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      version: this.version,
      loader: this.loader,
      jarFile: this.jarFile,
      port: this.port,
      maxRam: this.maxRam,
      minRam: this.minRam,
      javaPath: this.javaPath,
      javaArgs: this.javaArgs,
      autoRestart: this.autoRestart,
      autoRestartDelay: this.autoRestartDelay,
      scheduledRestarts: this.scheduledRestarts,
      geyser: this.geyser,
      bedrockPort: this.bedrockPort,
      maxPlayers: this.maxPlayers,
      onlineMode: this.onlineMode,
      description: this.description,
    };
  }

  async start() {
    if (this.status === 'running' || this.status === 'starting') {
      throw new Error('Server is already running or starting');
    }

    await fs.ensureDir(this.dir);
    this._stopping = false;
    this.status = 'starting';
    this.emit('status', { status: 'starting' });
    this._addLog('[SYSTEM] Starting server...');

    try {
      if (this.type === 'bedrock') {
        await this._startBedrock();
      } else {
        await this._startJava();
      }
    } catch (err) {
      this.status = 'stopped';
      this.emit('status', { status: 'stopped' });
      this._addLog(`[SYSTEM] Failed to start: ${err.message}`);
      throw err;
    }
  }

  async _startJava() {
    const jarPath = path.join(this.dir, this.jarFile);
    if (!await fs.pathExists(jarPath)) {
      throw new Error(`Server JAR not found: ${this.jarFile}. Please download it first.`);
    }

    // Always write eula=true — overwrite even if Minecraft previously wrote eula=false
    await fs.writeFile(
      path.join(this.dir, 'eula.txt'),
      '#By setting eula=true you accept the Minecraft EULA\neula=true\n'
    );

    // Sync server-port so Minecraft always listens on the configured port
    const propsPath = path.join(this.dir, 'server.properties');
    if (await fs.pathExists(propsPath)) {
      const existing = await this.getProperties();
      if (existing['server-port'] !== String(this.port)) {
        await this.setProperties({ 'server-port': String(this.port) });
      }
    } else {
      // Pre-create minimal properties so Minecraft picks up our settings on first run
      await fs.writeFile(propsPath,
        `#Minecraft server properties\nserver-port=${this.port}\nonline-mode=${this.onlineMode ? 'true' : 'false'}\nmax-players=${this.maxPlayers}\n`);
    }

    const args = [
      `-Xms${this.minRam}`,
      `-Xmx${this.maxRam}`,
      ...this.javaArgs,
      '-jar',
      this.jarFile,
      'nogui',
    ];

    this._spawnProcess(this.javaPath, args);
  }

  async _startBedrock() {
    const exeName = process.platform === 'win32' ? 'bedrock_server.exe' : 'bedrock_server';
    const exePath = path.join(this.dir, exeName);

    if (!await fs.pathExists(exePath)) {
      throw new Error('Bedrock server executable not found. Please download it first.');
    }

    // Sync server-port for Bedrock as well
    const propsPath = path.join(this.dir, 'server.properties');
    if (await fs.pathExists(propsPath)) {
      const existing = await this.getProperties();
      if (existing['server-port'] !== String(this.port)) {
        await this.setProperties({ 'server-port': String(this.port) });
      }
    }

    const env = { ...process.env };
    if (process.platform !== 'win32') {
      env.LD_LIBRARY_PATH = '.';
    }

    this._spawnProcess(exePath, [], { env });
  }

  _spawnProcess(cmd, args, extraOptions = {}) {
    this.process = spawn(cmd, args, {
      cwd: this.dir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      ...extraOptions,
    });

    this.pid = this.process.pid;
    this.startTime = new Date().toISOString();

    this.process.stdout.on('data', (data) => {
      data.toString().split('\n').filter(l => l.trim()).forEach(l => this._handleLine(l));
    });

    this.process.stderr.on('data', (data) => {
      data.toString().split('\n').filter(l => l.trim()).forEach(l => this._handleLine(l));
    });

    this.process.on('error', (err) => {
      this._addLog(`[SYSTEM] Process error: ${err.message}`);
      this._cleanup('stopped');
    });

    this.process.on('close', (code, signal) => {
      const wasRunning = ['running', 'starting', 'stopping'].includes(this.status);
      this._addLog(`[SYSTEM] Process exited (code=${code}, signal=${signal})`);
      this._cleanup('stopped');

      if (this.autoRestart && wasRunning && !this._stopping && !this._crashRestarting) {
        this._addLog(`[SYSTEM] Auto-restarting in ${this.autoRestartDelay}s...`);
        this._crashRestarting = true;
        this._autoRestartTimer = setTimeout(() => {
          this._crashRestarting = false;
          this.start().catch(e => this._addLog(`[SYSTEM] Auto-restart failed: ${e.message}`));
        }, this.autoRestartDelay * 1000);
      }
    });

    this._startStats();
  }

  _handleLine(line) {
    this._addLog(line);

    const joinMatch = line.match(/(\w+) joined the game/);
    if (joinMatch && !this.players.includes(joinMatch[1])) {
      this.players.push(joinMatch[1]);
      this.emit('players', { players: this.players });
      return;
    }

    const leaveMatch = line.match(/(\w+) left the game/);
    if (leaveMatch) {
      this.players = this.players.filter(p => p !== leaveMatch[1]);
      this.emit('players', { players: this.players });
      return;
    }

    if (/Done \([\d.]+s\)!/i.test(line) && this.status === 'starting') {
      this.status = 'running';
      this.emit('status', { status: 'running' });
      return;
    }

    const listMatch = line.match(/There are \d+ of a max of \d+ players online: (.*)/);
    if (listMatch) {
      const names = listMatch[1].trim();
      this.players = names ? names.split(', ').map(n => n.trim()).filter(Boolean) : [];
      this.emit('players', { players: this.players });
    }
  }

  _addLog(line) {
    const entry = { t: Date.now(), line };
    this.consoleHistory.push(entry);
    if (this.consoleHistory.length > config.MAX_CONSOLE_LINES) {
      this.consoleHistory.splice(0, this.consoleHistory.length - config.MAX_CONSOLE_LINES);
    }
    this.emit('console', entry);
  }

  async _startStats() {
    let pidusage;
    try {
      pidusage = require('pidusage');
    } catch (_) {
      return;
    }

    this._statsInterval = setInterval(async () => {
      if (!this.pid || this.status === 'stopped') return;
      try {
        const stat = await pidusage(this.pid);
        this.stats = {
          cpu: Math.round(stat.cpu * 10) / 10,
          ram: Math.round(stat.memory / 1024 / 1024),
          ramBytes: stat.memory,
        };
        this.emit('stats', this.stats);
      } catch (_) {
        // Process ended
      }
    }, config.STATS_INTERVAL);
  }

  _cleanup(status) {
    if (this._statsInterval) {
      clearInterval(this._statsInterval);
      this._statsInterval = null;
    }
    this.process = null;
    this.pid = null;
    this.startTime = null;
    this.players = [];
    this.stats = { cpu: 0, ram: 0, ramBytes: 0 };
    this.status = status;
    this.emit('status', { status });
    this.emit('players', { players: [] });
  }

  async stop() {
    if (this.status === 'stopped') return;
    this._stopping = true;
    if (this._autoRestartTimer) {
      clearTimeout(this._autoRestartTimer);
      this._autoRestartTimer = null;
    }

    this.status = 'stopping';
    this.emit('status', { status: 'stopping' });
    this._addLog('[SYSTEM] Stopping server...');

    if (this.process) {
      if (this.type === 'java') {
        this.sendCommand('stop');
      } else {
        this._killProcess();
      }

      // Force kill after 30s
      setTimeout(() => {
        if (this.process) {
          this._addLog('[SYSTEM] Force killing after timeout...');
          this._killProcess();
        }
      }, 30000);
    }
  }

  async restart() {
    this._addLog('[SYSTEM] Restarting server...');
    await this.stop();
    await new Promise(resolve => {
      if (this.status === 'stopped') return resolve();
      const handler = (data) => {
        if (data.status === 'stopped') { this.removeListener('status', handler); resolve(); }
      };
      this.on('status', handler);
      setTimeout(resolve, 35000); // safety timeout
    });
    await this.start();
  }

  async kill() {
    this._stopping = true;
    if (this._autoRestartTimer) {
      clearTimeout(this._autoRestartTimer);
      this._autoRestartTimer = null;
    }
    this._addLog('[SYSTEM] Force killing server...');
    this._killProcess();
  }

  _killProcess() {
    if (!this.process) return;
    try {
      if (process.platform === 'win32' && this.pid) {
        exec(`taskkill /PID ${this.pid} /T /F`, () => {});
      } else {
        this.process.kill('SIGKILL');
      }
    } catch (_) {}
  }

  sendCommand(command) {
    if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
      this.process.stdin.write(command + '\n');
      this._addLog(`> ${command}`);
      return true;
    }
    return false;
  }

  async getProperties() {
    const propsPath = path.join(this.dir, 'server.properties');
    if (!await fs.pathExists(propsPath)) return {};
    const content = await fs.readFile(propsPath, 'utf8');
    const props = {};
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const idx = line.indexOf('=');
        if (idx > -1) {
          props[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
      }
    });
    return props;
  }

  async setProperties(updates) {
    const propsPath = path.join(this.dir, 'server.properties');
    let content = '';
    if (await fs.pathExists(propsPath)) {
      content = await fs.readFile(propsPath, 'utf8');
    }

    const lines = content.split('\n');
    const updated = new Set();

    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.substring(0, idx).trim();
          if (key in updates) {
            updated.add(key);
            return `${key}=${updates[key]}`;
          }
        }
      }
      return line;
    });

    // Add new keys not in file
    Object.entries(updates).forEach(([key, val]) => {
      if (!updated.has(key)) newLines.push(`${key}=${val}`);
    });

    await fs.writeFile(propsPath, newLines.join('\n'));
  }

  async getInstalledPlugins() {
    const pluginsDir = path.join(this.dir, 'plugins');
    if (!await fs.pathExists(pluginsDir)) return [];
    const files = await fs.readdir(pluginsDir);
    return files
      .filter(f => f.endsWith('.jar'))
      .map(f => ({ filename: f, size: 0 }));
  }

  async deletePlugin(filename) {
    const pluginPath = path.join(this.dir, 'plugins', filename);
    await fs.remove(pluginPath);
  }
}

class ServerManager {
  constructor() {
    this.servers = new Map();
    this.wsClients = new Map(); // serverId -> Set<ws>
  }

  async initialize() {
    await fs.ensureDir(config.DATA_DIR);
    await fs.ensureDir(config.SERVERS_DIR);
    await fs.ensureDir(config.BACKUPS_DIR);
    await fs.ensureDir(config.DOWNLOADS_DIR);
    await this._loadServers();
    console.log(`Loaded ${this.servers.size} server(s)`);
  }

  async _loadServers() {
    if (!await fs.pathExists(config.SERVERS_CONFIG)) return;
    try {
      const data = await fs.readJson(config.SERVERS_CONFIG);
      for (const cfg of data) {
        const srv = new MinecraftServer(cfg);
        this.servers.set(srv.id, srv);
        this._attachEvents(srv);
      }
    } catch (err) {
      console.error('Failed to load servers config:', err.message);
    }
  }

  async _saveServers() {
    const data = [...this.servers.values()].map(s => s.toConfig());
    await fs.writeJson(config.SERVERS_CONFIG, data, { spaces: 2 });
  }

  _attachEvents(srv) {
    srv.on('console', (entry) => this._broadcast(srv.id, { type: 'console', serverId: srv.id, data: entry }));
    srv.on('status', (data) => this._broadcast(srv.id, { type: 'status', serverId: srv.id, data: { status: srv.status, ...data } }));
    srv.on('stats', (data) => this._broadcast(srv.id, { type: 'stats', serverId: srv.id, data }));
    srv.on('players', (data) => this._broadcast(srv.id, { type: 'players', serverId: srv.id, data }));
  }

  _broadcast(serverId, msg) {
    const clients = this.wsClients.get(serverId);
    if (!clients || clients.size === 0) return;
    const json = JSON.stringify(msg);
    clients.forEach(ws => {
      try {
        if (ws.readyState === 1) ws.send(json);
      } catch (_) {}
    });
  }

  subscribeClient(serverId, ws) {
    if (!this.wsClients.has(serverId)) this.wsClients.set(serverId, new Set());
    this.wsClients.get(serverId).add(ws);

    const srv = this.servers.get(serverId);
    if (srv) {
      try {
        ws.send(JSON.stringify({
          type: 'init',
          serverId,
          data: {
            status: srv.status,
            players: srv.players,
            stats: srv.stats,
            console: srv.consoleHistory.slice(-200),
          },
        }));
      } catch (_) {}
    }
  }

  unsubscribeClient(serverId, ws) {
    this.wsClients.get(serverId)?.delete(ws);
  }

  unsubscribeClientAll(ws) {
    this.wsClients.forEach(clients => clients.delete(ws));
  }

  _usedPorts(excludeId = null) {
    return [...this.servers.values()]
      .filter(s => s.id !== excludeId)
      .map(s => s.port);
  }

  getNextFreePort(start = 25565) {
    const used = this._usedPorts();
    let port = start;
    while (used.includes(port) && port <= 65534) port++;
    return port <= 65534 ? port : null;
  }

  async createServer(cfg) {
    const port = parseInt(cfg.port) || 25565;
    if (port < 1025 || port > 65534) throw new Error('Port must be between 1025 and 65534');
    if (this._usedPorts().includes(port)) throw new Error(`Port ${port} is already in use by another server. Try port ${this.getNextFreePort(port + 1) || port + 1}.`);

    const id = uuidv4();
    const srv = new MinecraftServer({ ...cfg, port, id });
    await fs.ensureDir(srv.dir);
    this.servers.set(id, srv);
    this._attachEvents(srv);
    await this._saveServers();
    return srv;
  }

  async updateServer(id, updates) {
    const srv = this.servers.get(id);
    if (!srv) throw new Error('Server not found');
    if ('port' in updates) {
      const p = parseInt(updates.port);
      if (p < 1025 || p > 65534) throw new Error('Port must be between 1025 and 65534');
      if (this._usedPorts(id).includes(p)) throw new Error(`Port ${p} is already in use by another server`);
    }
    const allowed = ['name', 'maxRam', 'minRam', 'javaPath', 'javaArgs', 'autoRestart', 'autoRestartDelay', 'scheduledRestarts', 'geyser', 'bedrockPort', 'maxPlayers', 'onlineMode', 'description', 'port'];
    allowed.forEach(k => { if (k in updates) srv[k] = updates[k]; });
    await this._saveServers();
    return srv;
  }

  async deleteServer(id) {
    const srv = this.servers.get(id);
    if (!srv) throw new Error('Server not found');
    if (srv.status !== 'stopped') await srv.kill();
    this.servers.delete(id);
    await this._saveServers();
  }

  getServer(id) { return this.servers.get(id); }
  getAllServers() { return [...this.servers.values()].map(s => s.toJSON()); }
}

module.exports = { ServerManager, MinecraftServer };
