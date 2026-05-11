const express = require('express');
const router = express.Router();
const downloadService = require('../services/downloadService');
const axios = require('axios');
const config = require('../config');

// Get available Paper versions + builds
router.get('/paper', async (req, res) => {
  try {
    const { data } = await axios.get(`${config.PAPERMC_API}/projects/paper`);
    const versions = data.versions.slice().reverse();
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/paper/:version', async (req, res) => {
  try {
    const { data } = await axios.get(`${config.PAPERMC_API}/projects/paper/versions/${req.params.version}`);
    const builds = data.builds.slice().reverse();
    res.json({ builds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get vanilla versions
router.get('/vanilla', async (req, res) => {
  try {
    const { data } = await axios.get(config.MOJANG_MANIFEST);
    const releases = data.versions.filter(v => v.type === 'release');
    res.json({ versions: releases.map(v => ({ id: v.id, url: v.url })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Fabric versions
router.get('/fabric', async (req, res) => {
  try {
    const [gameRes, loaderRes] = await Promise.all([
      axios.get(`${config.FABRIC_META}/versions/game`),
      axios.get(`${config.FABRIC_META}/versions/loader`),
    ]);
    const stable = gameRes.data.filter(v => v.stable).map(v => v.version);
    const loader = loaderRes.data[0]?.version;
    res.json({ versions: stable, loaderVersion: loader });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Purpur versions
router.get('/purpur', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.purpurmc.org/v2/purpur');
    res.json({ versions: data.versions.slice().reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a server JAR
router.post('/download', async (req, res) => {
  const { serverId, loader, mcVersion, build } = req.body;
  if (!serverId || !loader || !mcVersion) {
    return res.status(400).json({ error: 'serverId, loader, mcVersion required' });
  }

  const serverManager = req.app.locals.serverManager;
  const srv = serverManager.getServer(serverId);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  try {
    const result = await downloadService.downloadServerJar(srv, loader, mcVersion, build);
    // Persist the updated jarFile
    if (result.jarName && loader !== 'bedrock') {
      await serverManager.updateServer(serverId, { jarFile: result.jarName });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
