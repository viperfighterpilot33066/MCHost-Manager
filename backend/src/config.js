const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

module.exports = {
  PORT: process.env.PORT || 3001,
  DATA_DIR: path.join(__dirname, '..', 'data'),
  SERVERS_DIR: path.join(__dirname, '..', 'servers'),
  BACKUPS_DIR: path.join(__dirname, '..', 'backups'),
  DOWNLOADS_DIR: path.join(__dirname, '..', 'downloads'),
  SERVERS_CONFIG: path.join(__dirname, '..', 'data', 'servers.json'),
  MAX_CONSOLE_LINES: 1500,
  STATS_INTERVAL: 2000,
  DEFAULT_JAVA_PATH: 'java',
  PAPERMC_API: 'https://api.papermc.io/v2',
  FABRIC_META: 'https://meta.fabricmc.net/v2',
  MOJANG_MANIFEST: 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
  MODRINTH_API: 'https://api.modrinth.com/v2',
  SPIGET_API: 'https://api.spiget.org/v2',
};
