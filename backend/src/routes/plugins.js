const express = require('express');
const router = express.Router();
const modrinthService = require('../services/modrinthService');

// Search plugins from Modrinth or Spiget
router.get('/search', async (req, res) => {
  const { q = '', source = 'modrinth', loader = 'paper', version = '' } = req.query;

  try {
    let results;
    if (source === 'spiget') {
      results = await modrinthService.searchSpiget(q);
    } else {
      results = await modrinthService.searchModrinth(q, loader, version);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Modrinth project versions
router.get('/modrinth/:projectId/versions', async (req, res) => {
  try {
    const versions = await modrinthService.getProjectVersions(
      req.params.projectId,
      req.query.loader,
      req.query.gameVersion
    );
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
