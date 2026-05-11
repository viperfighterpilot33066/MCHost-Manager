const axios = require('axios');
const config = require('../config');

const modrinth = axios.create({
  baseURL: config.MODRINTH_API,
  headers: { 'User-Agent': 'MCHost-Manager/1.0 (github.com/mchost)' },
  timeout: 15000,
});

const spiget = axios.create({
  baseURL: config.SPIGET_API,
  timeout: 15000,
});

async function searchModrinth(query, loader = 'paper', gameVersion = '') {
  const facets = [['project_type:plugin']];
  if (loader) facets.push([`categories:${loader}`]);
  if (gameVersion) facets.push([`versions:${gameVersion}`]);

  const { data } = await modrinth.get('/search', {
    params: {
      query,
      facets: JSON.stringify(facets),
      limit: 20,
      index: 'relevance',
    },
  });

  return data.hits.map(p => ({
    id: p.project_id,
    slug: p.slug,
    name: p.title,
    description: p.description,
    downloads: p.downloads,
    author: p.author,
    iconUrl: p.icon_url,
    source: 'modrinth',
    pageUrl: `https://modrinth.com/plugin/${p.slug}`,
    categories: p.categories,
    versions: p.versions?.slice(0, 5) || [],
  }));
}

async function getProjectVersions(projectId, loader, gameVersion) {
  const params = {};
  if (loader) params.loaders = JSON.stringify([loader]);
  if (gameVersion) params.game_versions = JSON.stringify([gameVersion]);

  const { data } = await modrinth.get(`/project/${projectId}/version`, { params });

  return data.slice(0, 10).map(v => ({
    id: v.id,
    name: v.name,
    versionNumber: v.version_number,
    gameVersions: v.game_versions,
    loaders: v.loaders,
    downloadUrl: v.files[0]?.url,
    filename: v.files[0]?.filename,
    size: v.files[0]?.size,
    datePublished: v.date_published,
  }));
}

async function searchSpiget(query) {
  const { data } = await spiget.get(`/search/resources/${encodeURIComponent(query)}`, {
    params: { size: 20, sort: '-downloads', fields: 'id,name,tag,downloads,rating,version,file,premium' },
  });

  return data
    .filter(r => !r.premium)
    .map(r => ({
      id: `spiget-${r.id}`,
      slug: String(r.id),
      name: r.name,
      description: r.tag,
      downloads: r.downloads,
      author: r.author?.name || 'Unknown',
      iconUrl: `https://api.spiget.org/v2/resources/${r.id}/icon`,
      source: 'spiget',
      pageUrl: `https://www.spigotmc.org/resources/${r.id}`,
      downloadUrl: `https://api.spiget.org/v2/resources/${r.id}/download`,
      filename: `${r.name.replace(/[^a-zA-Z0-9.-]/g, '_')}.jar`,
      categories: [],
      versions: [],
    }));
}

module.exports = { searchModrinth, searchSpiget, getProjectVersions };
