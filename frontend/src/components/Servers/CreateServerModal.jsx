import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { servers as serversApi, versions as versionsApi } from '../../api/client';
import useStore from '../../store/useStore';

const LOADERS = [
  { id: 'paper', label: 'Paper', icon: '📄', desc: 'Most popular, plugin-compatible' },
  { id: 'purpur', label: 'Purpur', icon: '🟣', desc: 'Paper fork, extra features' },
  { id: 'vanilla', label: 'Vanilla', icon: '🎮', desc: 'Official Mojang server' },
  { id: 'fabric', label: 'Fabric', icon: '🧵', desc: 'Mod-focused, lightweight' },
  { id: 'bedrock', label: 'Bedrock', icon: '💎', desc: 'Windows 10/PE/Console' },
];

const RAM_OPTIONS = ['512M', '1G', '2G', '4G', '6G', '8G', '12G', '16G'];

export default function CreateServerModal({ onClose }) {
  const addServer = useStore(s => s.addServer);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'java',
    loader: 'paper',
    version: '',
    port: '25565',
    bedrockPort: '19132',
    maxRam: '2G',
    minRam: '512M',
    description: '',
    autoRestart: false,
    autoRestartDelay: '10',
    javaArgs: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [versionList, setVersionList] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const selectedLoader = LOADERS.find(l => l.id === form.loader);

  useEffect(() => {
    if (step !== 2) return;
    loadVersions();
  }, [step, form.loader]);

  const loadVersions = async () => {
    setVersionsLoading(true);
    setVersionList([]);
    try {
      let data;
      if (form.loader === 'paper') {
        data = await versionsApi.paper();
        setVersionList(data.versions.slice(0, 30));
      } else if (form.loader === 'purpur') {
        data = await versionsApi.purpur();
        setVersionList(data.versions.slice(0, 30));
      } else if (form.loader === 'vanilla') {
        data = await versionsApi.vanilla();
        setVersionList(data.versions.map(v => v.id).slice(0, 30));
      } else if (form.loader === 'fabric') {
        data = await versionsApi.fabric();
        setVersionList(data.versions.slice(0, 30));
      } else if (form.loader === 'bedrock') {
        setVersionList(['latest']);
      }
      if (versionList.length > 0 && !form.version) {
        set('version', versionList[0]);
      }
    } catch (err) {
      toast.error('Failed to fetch versions');
    }
    setVersionsLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Server name is required');
    setLoading(true);
    try {
      const payload = {
        ...form,
        type: form.loader === 'bedrock' ? 'bedrock' : 'java',
        port: parseInt(form.port) || 25565,
        bedrockPort: parseInt(form.bedrockPort) || 19132,
        autoRestartDelay: parseInt(form.autoRestartDelay) || 10,
        javaArgs: form.javaArgs.trim(),
      };
      const srv = await serversApi.create(payload);
      addServer(srv);
      toast.success(`Server "${form.name}" created!`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Create New Server</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Server Name *</label>
                <input
                  className="form-input"
                  placeholder="My Minecraft Server"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Server Type</label>
                <div className="version-loader-grid">
                  {LOADERS.map(l => (
                    <button
                      key={l.id}
                      className={`loader-btn ${form.loader === l.id ? 'selected' : ''}`}
                      onClick={() => set('loader', l.id)}
                      type="button"
                    >
                      <span style={{ fontSize: 22 }}>{l.icon}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
                {selectedLoader && (
                  <p className="form-hint">{selectedLoader.desc}</p>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.port}
                    onChange={e => set('port', e.target.value)}
                    min="1" max="65535"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max RAM</label>
                  <select className="form-select" value={form.maxRam} onChange={e => set('maxRam', e.target.value)}>
                    {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min RAM</label>
                  <select className="form-select" value={form.minRam} onChange={e => set('minRam', e.target.value)}>
                    {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Auto Restart on Crash</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <label className="toggle">
                      <input type="checkbox" checked={form.autoRestart} onChange={e => set('autoRestart', e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {form.autoRestart ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {form.autoRestart && (
                <div className="form-group">
                  <label className="form-label">Restart Delay (seconds)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.autoRestartDelay}
                    onChange={e => set('autoRestartDelay', e.target.value)}
                    min="0" max="300"
                    style={{ maxWidth: 160 }}
                  />
                  <div className="form-hint">Wait this many seconds before restarting after a crash</div>
                </div>
              )}

              {form.loader === 'bedrock' && (
                <div className="form-group">
                  <label className="form-label">Bedrock Port (UDP)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.bedrockPort}
                    onChange={e => set('bedrockPort', e.target.value)}
                    min="1" max="65535"
                    style={{ maxWidth: 160 }}
                  />
                  <div className="form-hint">Default Bedrock port is 19132</div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, marginBottom: showAdvanced ? 10 : 0 }}
                  onClick={() => setShowAdvanced(s => !s)}
                >
                  {showAdvanced ? '▲ Hide' : '▼ Show'} Advanced (JVM flags)
                </button>
                {showAdvanced && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Custom Java Flags</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                      placeholder="-XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+ParallelRefProcEnabled"
                      value={form.javaArgs}
                      onChange={e => set('javaArgs', e.target.value)}
                    />
                    <div className="form-hint">Space-separated JVM arguments added before -jar. Leave blank for defaults.</div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 13 }}>
                Select the Minecraft version for <strong>{form.name}</strong> ({selectedLoader?.label}).
                You can download the JAR after creating the server.
              </p>

              {versionsLoading && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="spinner" />
                  <p>Loading versions...</p>
                </div>
              )}

              {!versionsLoading && (
                <div className="form-group">
                  <label className="form-label">Minecraft Version</label>
                  <select
                    className="form-select"
                    value={form.version}
                    onChange={e => set('version', e.target.value)}
                    size={8}
                    style={{ height: 'auto' }}
                  >
                    {versionList.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {step < 2 ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!form.name.trim()) return toast.error('Name is required');
                setStep(2);
              }}
            >
              Next
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : 'Create Server'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
