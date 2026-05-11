const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const config = require('../config');

async function downloadFile(url, dest, onProgress) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 300000,
    headers: { 'User-Agent': 'MCHost-Manager/1.0' },
  });

  const total = parseInt(response.headers['content-length'] || '0', 10);
  let downloaded = 0;

  await fs.ensureDir(path.dirname(dest));
  const writer = fs.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      if (onProgress && total > 0) {
        onProgress({ downloaded, total, percent: Math.round((downloaded / total) * 100) });
      }
    });

    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

async function downloadServerJar(srv, loader, mcVersion, build) {
  let url, jarName;

  switch (loader) {
    case 'paper': {
      let targetBuild = build;
      if (!targetBuild) {
        const { data } = await axios.get(`${config.PAPERMC_API}/projects/paper/versions/${mcVersion}`);
        targetBuild = data.builds[data.builds.length - 1];
      }
      jarName = `paper-${mcVersion}-${targetBuild}.jar`;
      url = `${config.PAPERMC_API}/projects/paper/versions/${mcVersion}/builds/${targetBuild}/downloads/${jarName}`;
      break;
    }

    case 'purpur': {
      url = `https://api.purpurmc.org/v2/purpur/${mcVersion}/latest/download`;
      jarName = `purpur-${mcVersion}.jar`;
      break;
    }

    case 'vanilla': {
      const manifest = await axios.get(config.MOJANG_MANIFEST);
      const ver = manifest.data.versions.find(v => v.id === mcVersion);
      if (!ver) throw new Error(`Version ${mcVersion} not found`);
      const { data: verData } = await axios.get(ver.url);
      url = verData.downloads.server.url;
      jarName = `vanilla-${mcVersion}.jar`;
      break;
    }

    case 'fabric': {
      const { data } = await axios.get(`${config.FABRIC_META}/versions/loader`);
      const loaderVer = data[0].version;
      const { data: installerData } = await axios.get(`${config.FABRIC_META}/versions/installer`);
      const installerVer = installerData[0].version;
      // Download the Fabric server launcher jar
      url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVer}/${installerVer}/server/jar`;
      jarName = `fabric-server-${mcVersion}.jar`;
      break;
    }

    case 'bedrock': {
      const { data: pageHtml } = await axios.get(
        'https://www.minecraft.net/en-us/download/server/bedrock',
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' } }
      );
      // Decode JSON-escaped quotes embedded in page JS blobs
      const decoded = pageHtml.replace(/\\x22/g, '"').replace(/\\u0022/g, '"');
      const bedrockPatterns = [
        /https?:\/\/[^"'\s\\]+bedrock-server-[\d.]+\.zip/,
        /"serverBedrockWindows"\s*:\s*"(https?:\/\/[^"]+\.zip)"/,
        /https?:\/\/[^"'\s]+\/bin-win\/bedrock-server-[\d.]+\.zip/,
        /https?:\/\/[^"'\s]+bedrock[^"'\s]+windows[^"'\s]+\.zip/i,
      ];
      let downloadUrl = null;
      for (const pat of bedrockPatterns) {
        const m = decoded.match(pat);
        if (m) { downloadUrl = m[1] || m[0]; break; }
      }
      if (!downloadUrl) throw new Error('Could not find Bedrock download URL. Download manually from: https://www.minecraft.net/en-us/download/server/bedrock');
      url = downloadUrl;
      jarName = 'bedrock-server.zip';
      break;
    }

    default:
      throw new Error(`Unknown loader: ${loader}`);
  }

  srv._addLog(`[SYSTEM] Downloading ${loader} ${mcVersion}...`);
  srv._addLog(`[SYSTEM] URL: ${url}`);

  const destPath = path.join(srv.dir, jarName);

  let lastLoggedPercent = -1;
  await downloadFile(url, destPath, ({ percent }) => {
    const bucket = Math.floor(percent / 10) * 10;
    if (bucket > lastLoggedPercent) {
      lastLoggedPercent = bucket;
      srv._addLog(`[SYSTEM] Download progress: ${bucket}%`);
    }
  });

  // Handle bedrock zip extraction
  if (loader === 'bedrock') {
    srv._addLog('[SYSTEM] Extracting Bedrock server...');
    await fs.createReadStream(destPath)
      .pipe(unzipper.Extract({ path: srv.dir }))
      .promise();
    await fs.remove(destPath);
    jarName = 'bedrock_server.exe';
  } else {
    // Caller is responsible for persisting the new jarFile via serverManager.updateServer
    srv.jarFile = jarName;
  }

  srv._addLog(`[SYSTEM] Download complete: ${jarName}`);
  return { jarName, loader, mcVersion };
}

module.exports = { downloadFile, downloadServerJar };
