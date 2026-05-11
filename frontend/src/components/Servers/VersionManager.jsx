import { useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { versions as versionsApi } from '../../api/client';

const LOADERS = [
  { id: 'paper', label: 'Paper', icon: '📄' },
  { id: 'purpur', label: 'Purpur', icon: '🟣' },
  { id: 'vanilla', label: 'Vanilla', icon: '🎮' },
  { id: 'fabric', label: 'Fabric', icon: '🧵' },
  { id: 'bedrock', label: 'Bedrock', icon: '💎' },
];

export default function VersionManager({ server }) {
  const [loader, setLoader] = useState(server.loader || 'paper');
  const [mcVersion, setMcVersion] = useState('');
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const fetchVersions = async (l) => {
    setLoading(true);
    setVersions([]);
    setMcVersion('');
    try {
      let data;
      if (l === 'paper') data = (await versionsApi.paper()).versions;
      else if (l === 'purpur') data = (await versionsApi.purpur()).versions;
      else if (l === 'vanilla') data = (await versionsApi.vanilla()).versions.map(v => v.id);
      else if (l === 'fabric') data = (await versionsApi.fabric()).versions;
      else if (l === 'bedrock') data = ['latest'];
      setVersions((data || []).slice(0, 40));
    } catch {
      toast.error('Failed to fetch versions');
    }
    setLoading(false);
  };

  const handleLoaderChange = (l) => {
    setLoader(l);
    setDownloaded(false);
    fetchVersions(l);
  };

  const handleDownload = async () => {
    if (!mcVersion && loader !== 'bedrock') return toast.error('Select a version');
    setDownloading(true);
    setDownloaded(false);
    try {
      await versionsApi.download({
        serverId: server.id,
        loader,
        mcVersion: loader === 'bedrock' ? 'latest' : mcVersion,
      });
      setDownloaded(true);
      toast.success('Download complete! Server JAR is ready.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Download failed');
    }
    setDownloading(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Download Server Files</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Download the server JAR or executable for your chosen platform. The file will be placed in the server directory automatically.
        </p>

        <div className="form-group">
          <label className="form-label">Server Software</label>
          <div className="version-loader-grid">
            {LOADERS.map(l => (
              <button
                key={l.id}
                className={`loader-btn ${loader === l.id ? 'selected' : ''}`}
                onClick={() => handleLoaderChange(l.id)}
                type="button"
              >
                <span style={{ fontSize: 20 }}>{l.icon}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loader !== 'bedrock' && (
          <div className="form-group">
            <label className="form-label">Minecraft Version</label>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <button className="btn btn-ghost btn-sm" onClick={() => fetchVersions(loader)}>
                Load versions
              </button>
            ) : (
              <select
                className="form-select"
                value={mcVersion}
                onChange={e => setMcVersion(e.target.value)}
                size={6}
                style={{ height: 'auto' }}
              >
                <option value="">Select version...</option>
                {versions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading || downloaded}
        >
          {downloading ? (
            <><div className="spinner" style={{ width: 14, height: 14 }} />Downloading...</>
          ) : downloaded ? (
            <><CheckCircle size={14} />Downloaded!</>
          ) : (
            <><Download size={14} />Download {loader} {mcVersion || (loader === 'bedrock' ? 'BDS' : '')}</>
          )}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">GeyserMC (Cross-Platform Bridge)</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          GeyserMC lets Bedrock Edition players join Java servers. Install the Geyser-Spigot plugin via the Plugin Manager tab.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="https://geysermc.org/download"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            Geyser Download Page
          </a>
        </div>
      </div>
    </div>
  );
}
