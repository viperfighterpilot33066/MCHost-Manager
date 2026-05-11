const express = require('express');
const router = express.Router();
const backupService = require('../services/backupService');

const mgr = (req) => req.app.locals.serverManager;

// List backups for a server
router.get('/:serverId', async (req, res) => {
  try {
    const backups = await backupService.listBackups(req.params.serverId);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create backup
router.post('/:serverId', async (req, res) => {
  const srv = mgr(req).getServer(req.params.serverId);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  try {
    const backup = await backupService.createBackup(req.params.serverId, srv.dir, req.body.name);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore backup
router.post('/:serverId/:backupId/restore', async (req, res) => {
  const srv = mgr(req).getServer(req.params.serverId);
  if (!srv) return res.status(404).json({ error: 'Server not found' });
  if (srv.status !== 'stopped') return res.status(400).json({ error: 'Server must be stopped to restore' });

  try {
    await backupService.restoreBackup(req.params.serverId, req.params.backupId, srv.dir);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete backup
router.delete('/:serverId/:backupId', async (req, res) => {
  try {
    await backupService.deleteBackup(req.params.serverId, req.params.backupId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
