const express = require('express');
const router = express.Router();

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
    const { downloadFile } = require('../services/downloadService');
    const path = require('path');
    const fs = require('fs-extra');
    const pluginsDir = path.join(srv.dir, 'plugins');
    await fs.ensureDir(pluginsDir);
    await downloadFile(url, path.join(pluginsDir, filename));
    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
