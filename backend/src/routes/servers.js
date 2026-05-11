const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const { downloadFile } = require('../services/downloadService');
const { getProjectVersions } = require('../services/modrinthService');

const mgr = (req) => req.app.locals.serverManager;

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
router.post('/:id/start', async (req, res) => {
  const srv = mgr(req).getServer(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  try {
    await srv.start();
    res.json({ ok: true, status: srv.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
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

router.post('/:id/kill', async (req, res) => {
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
router.post('/:id/command', (req, res) => {
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
    // Use paper loader for both paper and purpur since both are spigot-compatible
    const modrinthLoader = srv.loader === 'fabric' ? 'fabric' : 'spigot';

    // Download GeyserMC
    srv._addLog('[SYSTEM] Crossplay setup: fetching GeyserMC from Modrinth...');
    const geyserVersions = await getProjectVersions('aXf2OSFU', modrinthLoader, '');
    if (!geyserVersions.length) throw new Error('No GeyserMC versions found — check your internet connection');
    const geyser = geyserVersions[0];
    srv._addLog(`[SYSTEM] Downloading ${geyser.filename}...`);
    await downloadFile(geyser.downloadUrl, path.join(pluginsDir, geyser.filename));
    srv._addLog(`[SYSTEM] GeyserMC downloaded: ${geyser.filename}`);

    // Download Floodgate (lets Bedrock players authenticate with Xbox instead of Java account)
    srv._addLog('[SYSTEM] Crossplay setup: fetching Floodgate from Modrinth...');
    const floodgateVersions = await getProjectVersions('bWrNNfkb', modrinthLoader, '');
    if (!floodgateVersions.length) throw new Error('No Floodgate versions found');
    const floodgate = floodgateVersions[0];
    srv._addLog(`[SYSTEM] Downloading ${floodgate.filename}...`);
    await downloadFile(floodgate.downloadUrl, path.join(pluginsDir, floodgate.filename));
    srv._addLog(`[SYSTEM] Floodgate downloaded: ${floodgate.filename}`);

    // Write GeyserMC config pre-configured for this server
    const geyserConfigDir = path.join(pluginsDir, 'Geyser-Spigot');
    await fs.ensureDir(geyserConfigDir);
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
      '  auth-type: floodgate',
      'floodgate-key-file: key.pem',
    ].join('\n');
    await fs.writeFile(path.join(geyserConfigDir, 'config.yml'), configYml, 'utf8');
    srv._addLog('[SYSTEM] GeyserMC config written.');

    // Mark server as crossplay-enabled
    await mgr(req).updateServer(srv.id, { geyser: true });
    srv._addLog(`[SYSTEM] Crossplay ready! Bedrock/mobile/console players connect on UDP port ${bedrockPort}.`);
    srv._addLog('[SYSTEM] Restart the server to activate GeyserMC.');

    res.json({ ok: true, bedrockPort, geyserFile: geyser.filename, floodgateFile: floodgate.filename });
  } catch (err) {
    srv._addLog(`[SYSTEM] Crossplay setup failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
