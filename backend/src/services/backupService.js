const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function backupDir(serverId) {
  return path.join(config.BACKUPS_DIR, serverId);
}

async function listBackups(serverId) {
  const dir = backupDir(serverId);
  if (!await fs.pathExists(dir)) return [];

  const files = await fs.readdir(dir);
  const backups = [];

  for (const file of files) {
    if (!file.endsWith('.zip')) continue;
    const full = path.join(dir, file);
    const stat = await fs.stat(full);
    backups.push({
      id: file.replace('.zip', ''),
      filename: file,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    });
  }

  return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createBackup(serverId, serverDir, customName) {
  const dir = backupDir(serverId);
  await fs.ensureDir(dir);

  const id = uuidv4();
  const label = customName || new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${label}_${id.slice(0, 8)}.zip`;
  const dest = path.join(dir, filename);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(dest);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    // Exclude logs directory for smaller backups
    archive.glob('**/*', {
      cwd: serverDir,
      ignore: ['logs/**', '*.log', '*.gz'],
    });

    archive.finalize();
  });

  const stat = await fs.stat(dest);
  return {
    id: filename.replace('.zip', ''),
    filename,
    size: stat.size,
    createdAt: new Date().toISOString(),
  };
}

async function restoreBackup(serverId, backupId, serverDir) {
  const dir = backupDir(serverId);
  const zipPath = path.join(dir, `${backupId}.zip`);

  if (!await fs.pathExists(zipPath)) {
    throw new Error('Backup file not found');
  }

  // Clear world directories (keep server jar and configs)
  const worldDirs = ['world', 'world_nether', 'world_the_end'];
  for (const w of worldDirs) {
    const wPath = path.join(serverDir, w);
    if (await fs.pathExists(wPath)) await fs.remove(wPath);
  }

  // Extract backup
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: serverDir }))
    .promise();
}

async function deleteBackup(serverId, backupId) {
  const dir = backupDir(serverId);
  const zipPath = path.join(dir, `${backupId}.zip`);
  if (!await fs.pathExists(zipPath)) throw new Error('Backup not found');
  await fs.remove(zipPath);
}

module.exports = { listBackups, createBackup, restoreBackup, deleteBackup };
