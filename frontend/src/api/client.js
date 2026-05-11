import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request if present
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('mchost_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mchost_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const auth = {
  status: () => api.get('/auth/status').then(r => r.data),
  login: (password) => api.post('/auth/login', { password }).then(r => r.data),
  logout: () => { localStorage.removeItem('mchost_token'); window.location.reload(); },
};

export const servers = {
  list: () => api.get('/servers').then(r => r.data),
  get: (id) => api.get(`/servers/${id}`).then(r => r.data),
  create: (data) => api.post('/servers', data).then(r => r.data),
  update: (id, data) => api.put(`/servers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/servers/${id}`).then(r => r.data),

  start: (id) => api.post(`/servers/${id}/start`).then(r => r.data),
  stop: (id) => api.post(`/servers/${id}/stop`).then(r => r.data),
  restart: (id) => api.post(`/servers/${id}/restart`).then(r => r.data),
  kill: (id) => api.post(`/servers/${id}/kill`).then(r => r.data),
  command: (id, command) => api.post(`/servers/${id}/command`, { command }).then(r => r.data),

  getConsole: (id, limit = 200) => api.get(`/servers/${id}/console?limit=${limit}`).then(r => r.data),
  getProperties: (id) => api.get(`/servers/${id}/properties`).then(r => r.data),
  setProperties: (id, data) => api.put(`/servers/${id}/properties`, data).then(r => r.data),

  getPlugins: (id) => api.get(`/servers/${id}/plugins`).then(r => r.data),
  deletePlugin: (id, filename) => api.delete(`/servers/${id}/plugins/${encodeURIComponent(filename)}`).then(r => r.data),
  installPlugin: (id, url, filename) => api.post(`/servers/${id}/plugins/install`, { url, filename }).then(r => r.data),
  setupCrossplay: (id) => api.post(`/servers/${id}/setup-crossplay`).then(r => r.data),
  openFirewall: (id) => api.post(`/servers/${id}/firewall`).then(r => r.data),
};

export const network = {
  info: () => api.get('/network/info').then(r => r.data),
};

export const backups = {
  list: (serverId) => api.get(`/backups/${serverId}`).then(r => r.data),
  create: (serverId, name) => api.post(`/backups/${serverId}`, { name }).then(r => r.data),
  restore: (serverId, backupId) => api.post(`/backups/${serverId}/${backupId}/restore`).then(r => r.data),
  delete: (serverId, backupId) => api.delete(`/backups/${serverId}/${backupId}`).then(r => r.data),
};

export const plugins = {
  search: (q, source = 'modrinth', loader = 'paper', version = '') =>
    api.get(`/plugins/search?q=${encodeURIComponent(q)}&source=${source}&loader=${loader}&version=${version}`).then(r => r.data),
  getVersions: (projectId, loader, gameVersion) =>
    api.get(`/plugins/modrinth/${projectId}/versions?loader=${loader}&gameVersion=${gameVersion}`).then(r => r.data),
};

export const versions = {
  paper: () => api.get('/versions/paper').then(r => r.data),
  paperBuilds: (ver) => api.get(`/versions/paper/${ver}`).then(r => r.data),
  vanilla: () => api.get('/versions/vanilla').then(r => r.data),
  fabric: () => api.get('/versions/fabric').then(r => r.data),
  purpur: () => api.get('/versions/purpur').then(r => r.data),
  download: (data) => api.post('/versions/download', data).then(r => r.data),
};

export default api;
