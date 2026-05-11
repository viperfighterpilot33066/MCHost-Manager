const express = require('express');
const os = require('os');
const axios = require('axios');
const router = express.Router();

let cachedPublicIp = null;
let cacheTime = 0;

router.get('/info', async (req, res) => {
  const ifaces = os.networkInterfaces();
  const localIps = Object.values(ifaces)
    .flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

  if (!cachedPublicIp || Date.now() - cacheTime > 300000) {
    try {
      const { data } = await axios.get('https://api.ipify.org?format=json', { timeout: 4000 });
      cachedPublicIp = data.ip;
      cacheTime = Date.now();
    } catch {
      cachedPublicIp = null;
    }
  }

  res.json({ localIps, publicIp: cachedPublicIp });
});

module.exports = router;
