import { useState, useEffect, useCallback } from 'react';
import { Package, Search, Download, Trash2, RefreshCw, ExternalLink, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { servers as serversApi, plugins as pluginsApi } from '../../api/client';

function formatDownloads(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function CrossplayTab({ server }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const isJavaPlugin = server.type !== 'bedrock' && server.loader !== 'vanilla';
  const alreadyEnabled = server.geyser === true;

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await serversApi.setupCrossplay(server.id);
      setResult(data);
      toast.success('Crossplay enabled! Restart the server to activate.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Crossplay setup failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Header card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ background: 'rgba(88,166,255,0.1)', borderRadius: 8, padding: 10, display: 'flex' }}>
            <Zap size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Java + Bedrock Crossplay</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Powered by GeyserMC + Floodgate</div>
          </div>
          {alreadyEnabled && (
            <span className="badge badge-running" style={{ marginLeft: 'auto', fontSize: 11 }}>
              <span className="badge-dot" />Enabled
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
          Allows <strong style={{ color: 'var(--text)' }}>Bedrock Edition</strong> players (mobile, console, Windows 10/11)
          to join your Java server on the same world — no separate server needed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          {[
            ['GeyserMC', 'Translates the Bedrock protocol so Bedrock players can connect'],
            ['Floodgate', 'Lets Bedrock players authenticate with their Xbox account (no Java account needed)'],
          ].map(([name, desc]) => (
            <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle size={13} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
              <span><strong style={{ color: 'var(--text)' }}>{name}</strong> — {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connection info — always shown on Java plugin servers */}
      {isJavaPlugin && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Connection Ports</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Java Edition players</span>
              <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                port {server.port} (TCP)
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Bedrock / mobile / console</span>
              <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                port {server.bedrockPort || 19132} (UDP)
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Incompatible server type warning */}
      {!isJavaPlugin && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: 14, fontSize: 13 }}>
          <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <div>
            {server.type === 'bedrock'
              ? 'This is a Bedrock server — it already accepts Bedrock players natively. Crossplay setup is for Java servers.'
              : 'Vanilla servers do not support plugins. Create a Paper or Purpur server to use crossplay.'}
          </div>
        </div>
      )}

      {/* Setup / already done */}
      {isJavaPlugin && (
        alreadyEnabled || result ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 8, padding: 14, fontSize: 13 }}>
            <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ color: 'var(--success)' }}>Crossplay is enabled.</strong>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                {result
                  ? `Installed ${result.geyserFile} and ${result.floodgateFile}. `
                  : ''}
                Restart the server to activate GeyserMC. Bedrock players connect on UDP port {server.bedrockPort || 19132}.
              </div>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleSetup} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading
              ? <><div className="spinner" style={{ width: 14, height: 14 }} />Setting up crossplay...</>
              : <><Zap size={14} />Enable Crossplay (GeyserMC + Floodgate)</>}
          </button>
        )
      )}

      {isJavaPlugin && !alreadyEnabled && !result && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
          Downloads ~20 MB. Restart the server after setup to activate.
        </p>
      )}
    </div>
  );
}

export default function PluginManager({ server }) {
  const [tab, setTab] = useState('installed');
  const [installed, setInstalled] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('modrinth');
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(null);

  useEffect(() => {
    if (tab === 'installed') loadInstalled();
  }, [tab, server.id]);

  const loadInstalled = async () => {
    setLoading(true);
    try {
      const data = await serversApi.getPlugins(server.id);
      setInstalled(data);
    } catch {
      toast.error('Failed to load plugins');
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchResults([]);
    try {
      const results = await pluginsApi.search(query, source, server.loader || 'paper', server.version || '');
      setSearchResults(results);
    } catch (err) {
      toast.error('Search failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const handleInstall = async (plugin) => {
    if (!plugin.downloadUrl || !plugin.filename) {
      return toast.error('No direct download available for this plugin');
    }
    setInstalling(plugin.id);
    try {
      await serversApi.installPlugin(server.id, plugin.downloadUrl, plugin.filename);
      toast.success(`${plugin.name} installed!`);
      if (tab === 'installed') loadInstalled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Install failed');
    }
    setInstalling(null);
  };

  const handleInstallFromVersions = async (plugin) => {
    try {
      const versions = await pluginsApi.getVersions(plugin.id, server.loader || 'paper', server.version || '');
      if (!versions.length) return toast.error('No compatible versions found');
      const latest = versions[0];
      if (!latest.downloadUrl) return toast.error('No download URL');
      await serversApi.installPlugin(server.id, latest.downloadUrl, latest.filename);
      toast.success(`${plugin.name} v${latest.versionNumber} installed!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Install failed');
    }
    setInstalling(null);
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;
    try {
      await serversApi.deletePlugin(server.id, filename);
      setInstalled(prev => prev.filter(p => p.filename !== filename));
      toast.success('Plugin deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'installed', label: '📦 Installed' },
          { id: 'modrinth', label: '🟢 Modrinth' },
          { id: 'spiget', label: '🔴 SpigotMC' },
          { id: 'crossplay', label: '⚡ Crossplay' },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setTab(id); if (id === 'modrinth' || id === 'spiget') setSource(id); }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'installed' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{installed.length} plugin(s) installed</span>
            <button className="btn btn-ghost btn-sm" onClick={loadInstalled}><RefreshCw size={12} />Refresh</button>
          </div>

          {loading && <div className="empty-state" style={{ padding: 32 }}><div className="spinner" /><p>Loading...</p></div>}

          {!loading && installed.length === 0 && (
            <div className="empty-state" style={{ padding: 40 }}>
              <Package size={32} />
              <h3>No plugins installed</h3>
              <p>Browse Modrinth or SpigotMC to find plugins.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {installed.map(plugin => (
              <div key={plugin.filename} className="plugin-card">
                <div className="plugin-icon">
                  <Package size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="plugin-info">
                  <div className="plugin-name">{plugin.filename}</div>
                  <div className="plugin-desc" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    Installed plugin
                  </div>
                </div>
                <div className="plugin-actions">
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(plugin.filename)}>
                    <Trash2 size={12} />Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'crossplay' && <CrossplayTab server={server} />}

      {(tab === 'modrinth' || tab === 'spiget') && (
        <>
          <div className="search-bar">
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              placeholder={`Search ${tab === 'modrinth' ? 'Modrinth' : 'SpigotMC'}...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Search'}
            </button>
          </div>

          {searchResults.length === 0 && !loading && (
            <div className="empty-state" style={{ padding: 32 }}>
              <Search size={32} />
              <h3>Search for plugins</h3>
              <p>Type a plugin name above and press Enter or click Search.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.map(plugin => (
              <div key={plugin.id} className="plugin-card">
                {plugin.iconUrl ? (
                  <img
                    className="plugin-icon"
                    src={plugin.iconUrl}
                    alt={plugin.name}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="plugin-icon">
                    <Package size={20} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <div className="plugin-info">
                  <div className="plugin-name">{plugin.name}</div>
                  <div className="plugin-desc">{plugin.description}</div>
                  <div className="plugin-meta">
                    <span>by {plugin.author}</span>
                    <span>↓ {formatDownloads(plugin.downloads)}</span>
                  </div>
                </div>
                <div className="plugin-actions" style={{ flexDirection: 'column' }}>
                  <button
                    className="btn btn-success btn-sm"
                    disabled={installing === plugin.id}
                    onClick={() => {
                      setInstalling(plugin.id);
                      if (plugin.downloadUrl) {
                        handleInstall(plugin).finally(() => setInstalling(null));
                      } else {
                        handleInstallFromVersions(plugin).finally(() => setInstalling(null));
                      }
                    }}
                  >
                    {installing === plugin.id
                      ? <><div className="spinner" style={{ width: 12, height: 12 }} />Installing</>
                      : <><Download size={12} />Install</>}
                  </button>
                  <a href={plugin.pageUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                    <ExternalLink size={11} />Page
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
