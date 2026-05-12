const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { downloadFile } = require('../services/downloadService');
const config = require('../config');

const mgr = (req) => req.app.locals.serverManager;

// Opens one Windows Firewall inbound rule — idempotent (removes existing first)
function addFirewallRule(safeName, proto, port) {
  return new Promise((resolve, reject) => {
    const displayName = `MCHost-${safeName}-${proto}`;
    const psCmd =
      `Remove-NetFirewallRule -DisplayName '${displayName}' -ErrorAction SilentlyContinue; ` +
      `New-NetFirewallRule -DisplayName '${displayName}' -Direction Inbound ` +
      `-Protocol ${proto} -LocalPort ${port} -Action Allow -Profile Any -ErrorAction Stop`;
    exec(`powershell.exe -NoProfile -NonInteractive -Command "${psCmd}"`,
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || stdout || err.message));
        resolve();
      });
  });
}

const actionLimiter = rateLimit({
  windowMs: 60_000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many server actions. Please slow down.' },
});
const cmdLimiter = rateLimit({
  windowMs: 10_000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many commands. Please slow down.' },
});

// List all servers
router.get('/', (req, res) => {
  res.json(mgr(req).getAllServers());
});

// Create server
router.post('/', async (req, res) => {
  try {
    const srv = await mgr(req).createServer(req.body);
    res.status(201).json(srv.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Port info — used ports + suggested next free port (must be before /:id)
router.get('/ports', (req, res) => {
  const m = mgr(req);
  const used = [...m.servers.values()].map(s => s.port).sort((a, b) => a - b);
  const suggested = m.getNextFreePort();
  res.json({ used, suggested });
});

// Get server
router.get('/:id', (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  res.json(srv.toJSON());
});

// Update server config
router.put('/:id', async (req, res) => {
  try {
    const srv = await mgr(req).updateServer(req.params.id, req.body);
    res.json(srv.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete server
router.delete('/:id', async (req, res) => {
  try {
    await mgr(req).deleteServer(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Control actions
router.post('/:id/start', actionLimiter, async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    await srv.start();
    res.json({ ok: true, status: srv.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/stop', actionLimiter, async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    await srv.stop();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/restart', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    srv.restart(); // non-blocking
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/kill', actionLimiter, async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    await srv.kill();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Send console command
router.post('/:id/command', cmdLimiter, (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'command is required' });
  const ok = srv.sendCommand(command);
  res.json({ ok });
});

// Get console history
router.get('/:id/console', (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  const limit = parseInt(req.query.limit) || 200;
  res.json(srv.consoleHistory.slice(-limit));
});

// Server properties
router.get('/:id/properties', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    const props = await srv.getProperties();
    res.json(props);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/properties', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    await srv.setProperties(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Installed plugins
router.get('/:id/plugins', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    const plugins = await srv.getInstalledPlugins();
    res.json(plugins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/plugins/:filename', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    await srv.deletePlugin(req.params.filename);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/plugins/install', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const { url, filename } = req.body;
  if (!url || !filename) return res.status(400).json({ error: 'url and filename required' });

  try {
    const pluginsDir = path.join(srv.dir, 'plugins');
    await fs.ensureDir(pluginsDir);
    await downloadFile(url, path.join(pluginsDir, filename));
    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Open Windows Firewall for game ports (TCP Java + UDP Bedrock)
router.post('/:id/firewall', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  if (process.platform !== 'win32') {
    return res.status(400).json({ error: 'Firewall automation is only supported on Windows. Add the rules manually on your OS.' });
  }

  const safeName = srv.name.replace(/['"\\]/g, '').replace(/[^a-zA-Z0-9 _-]/g, '-').trim();

  const isBedrockServer = srv.type === 'bedrock';
  try {
    if (isBedrockServer) {
      await addFirewallRule(safeName, 'UDP', srv.port);
    } else {
      await addFirewallRule(safeName, 'TCP', srv.port);
      if (srv.geyser) await addFirewallRule(safeName, 'UDP', srv.bedrockPort || 19132);
    }
    const portDesc = isBedrockServer
      ? `UDP ${srv.port}`
      : `TCP ${srv.port}${srv.geyser ? ` and UDP ${srv.bedrockPort || 19132}` : ''}`;
    res.json({ ok: true, message: `Firewall rule added for ${portDesc}` });
  } catch (err) {
    res.status(500).json({ error: `Firewall rule failed: ${err.message}. Run MCHost as Administrator (right-click start.bat → Run as administrator).` });
  }
});

// Setup crossplay via GeyserMC + Floodgate
router.post('/:id/setup-crossplay', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  if (srv.type === 'bedrock') {
    return res.status(400).json({ error: 'Crossplay setup is only for Java servers. Bedrock servers cannot run GeyserMC.' });
  }
  if (srv.loader === 'vanilla') {
    return res.status(400).json({ error: 'Vanilla servers do not support plugins. Use Paper or Purpur for crossplay.' });
  }

  try {
    const pluginsDir = path.join(srv.dir, 'plugins');
    await fs.ensureDir(pluginsDir);

    const bedrockPort = srv.bedrockPort || 19132;
    const modrinthHeaders = { 'User-Agent': 'MCHost-Manager/1.0', timeout: 15000 };

    // Geyser publishes platform-specific JARs (Spigot, Velocity, BungeeCord…) as
    // separate files within each version — loader filtering returns nothing.
    // Fetch all versions unfiltered and find the file with "Spigot" in the name.
    const findSpigotFile = (versions, label) => {
      for (const ver of versions) {
        const file = (ver.files || []).find(f => /spigot/i.test(f.filename));
        if (file) return file;
      }
      // Fallback: first file of latest version
      const fallback = versions[0]?.files?.[0];
      if (fallback) return fallback;
      throw new Error(`No ${label} JAR found on Modrinth`);
    };

    // Download GeyserMC
    srv._addLog('[SYSTEM] Crossplay setup: fetching GeyserMC from Modrinth...');
    const { data: geyserVersions } = await axios.get(
      `${config.MODRINTH_API}/project/geyser/version`,
      { headers: modrinthHeaders }
    );
    if (!geyserVersions?.length) throw new Error('No GeyserMC versions found — check your internet connection');
    const geyserFile = findSpigotFile(geyserVersions, 'GeyserMC');
    srv._addLog(`[SYSTEM] Downloading ${geyserFile.filename}...`);
    await downloadFile(geyserFile.url, path.join(pluginsDir, geyserFile.filename));
    srv._addLog(`[SYSTEM] GeyserMC downloaded: ${geyserFile.filename}`);

    // Download Floodgate
    srv._addLog('[SYSTEM] Crossplay setup: fetching Floodgate from Modrinth...');
    const { data: floodgateVersions } = await axios.get(
      `${config.MODRINTH_API}/project/floodgate/version`,
      { headers: modrinthHeaders }
    );
    if (!floodgateVersions?.length) throw new Error('No Floodgate versions found');
    const floodgateFile = findSpigotFile(floodgateVersions, 'Floodgate');
    srv._addLog(`[SYSTEM] Downloading ${floodgateFile.filename}...`);
    await downloadFile(floodgateFile.url, path.join(pluginsDir, floodgateFile.filename));
    srv._addLog(`[SYSTEM] Floodgate downloaded: ${floodgateFile.filename}`);

    // Write GeyserMC config pre-configured for this server.
    // auth-type: online  — Geyser proxies Microsoft/Bedrock account auth itself.
    // auth-type: floodgate would require Floodgate to generate key.pem on first
    // server start before any Bedrock client could connect, causing silent failures.
    const geyserConfigDir = path.join(pluginsDir, 'Geyser-Spigot');
    await fs.ensureDir(geyserConfigDir);
    const authType = srv.onlineMode !== false ? 'online' : 'offline';
    const configYml = [
      '# Auto-generated by MCHost Manager — do not edit bedrock.port or remote settings manually',
      'bedrock:',
      '  address: 0.0.0.0',
      `  port: ${bedrockPort}`,
      '  clone-remote-port: false',
      `  motd1: "${srv.name}"`,
      '  motd2: "Java + Bedrock Crossplay"',
      `  server-name: "${srv.name}"`,
      '  compression-level: 6',
      '  enable-proxy-protocol: false',
      'remote:',
      '  address: auto',
      `  port: ${srv.port}`,
      `  auth-type: ${authType}`,
    ].join('\n');
    await fs.writeFile(path.join(geyserConfigDir, 'config.yml'), configYml, 'utf8');
    srv._addLog('[SYSTEM] GeyserMC config written.');

    // Mark server as crossplay-enabled
    await mgr(req).updateServer(srv.id, { geyser: true });
    srv._addLog(`[SYSTEM] Crossplay ready! Bedrock/mobile/console players connect on UDP port ${bedrockPort}.`);
    srv._addLog('[SYSTEM] Restart the server to activate GeyserMC.');

    // Auto-open firewall — best-effort, don't abort setup if this fails (e.g. not running as admin)
    let firewallOpened = false;
    let firewallError = null;
    if (process.platform === 'win32') {
      const safeName = srv.name.replace(/['"\\]/g, '').replace(/[^a-zA-Z0-9 _-]/g, '-').trim();
      try {
        await addFirewallRule(safeName, 'TCP', srv.port);
        await addFirewallRule(safeName, 'UDP', bedrockPort);
        firewallOpened = true;
        srv._addLog(`[SYSTEM] Firewall rules opened: TCP ${srv.port} (Java) + UDP ${bedrockPort} (Bedrock).`);
      } catch (fwErr) {
        firewallError = fwErr.message;
        srv._addLog(`[SYSTEM] Firewall auto-open failed: ${fwErr.message}`);
        srv._addLog('[SYSTEM] Fix: right-click start.bat → Run as administrator, then Connect tab → Open Firewall Ports.');
      }
    }

    res.json({ ok: true, bedrockPort, geyserFile: geyserFile.filename, floodgateFile: floodgateFile.filename, firewallOpened, firewallError });
  } catch (err) {
    srv._addLog(`[SYSTEM] Crossplay setup failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
