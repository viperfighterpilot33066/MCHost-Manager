import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { servers as serversApi } from '../../api/client';

const PROPERTY_GROUPS = [
  {
    title: 'World Settings',
    keys: [
      { key: 'level-name', label: 'World Name', type: 'text' },
      { key: 'level-seed', label: 'World Seed', type: 'text', hint: 'Leave blank for random' },
      { key: 'level-type', label: 'World Type', type: 'select', options: ['minecraft:default', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified', 'minecraft:single_biome_surface'] },
      { key: 'gamemode', label: 'Default Gamemode', type: 'select', options: ['survival', 'creative', 'adventure', 'spectator'] },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'] },
      { key: 'hardcore', label: 'Hardcore Mode', type: 'boolean' },
      { key: 'pvp', label: 'PvP', type: 'boolean' },
    ],
  },
  {
    title: 'Server Settings',
    keys: [
      { key: 'server-port', label: 'Port', type: 'number' },
      { key: 'server-ip', label: 'Bind IP', type: 'text', hint: 'Leave blank to bind all interfaces' },
      { key: 'max-players', label: 'Max Players', type: 'number' },
      { key: 'view-distance', label: 'View Distance (chunks)', type: 'number' },
      { key: 'simulation-distance', label: 'Simulation Distance (chunks)', type: 'number' },
      { key: 'motd', label: 'MOTD (Server Description)', type: 'text' },
      { key: 'online-mode', label: 'Online Mode (Requires auth)', type: 'boolean' },
      { key: 'white-list', label: 'Whitelist', type: 'boolean' },
    ],
  },
  {
    title: 'Gameplay',
    keys: [
      { key: 'spawn-monsters', label: 'Spawn Monsters', type: 'boolean' },
      { key: 'spawn-animals', label: 'Spawn Animals', type: 'boolean' },
      { key: 'spawn-npcs', label: 'Spawn NPCs (Villagers)', type: 'boolean' },
      { key: 'generate-structures', label: 'Generate Structures', type: 'boolean' },
      { key: 'allow-flight', label: 'Allow Flight', type: 'boolean' },
      { key: 'allow-nether', label: 'Allow Nether', type: 'boolean' },
      { key: 'enable-command-block', label: 'Command Blocks', type: 'boolean' },
      { key: 'max-world-size', label: 'Max World Size', type: 'number' },
    ],
  },
  {
    title: 'Performance',
    keys: [
      { key: 'max-tick-time', label: 'Max Tick Time (ms)', type: 'number', hint: '-1 to disable watchdog' },
      { key: 'network-compression-threshold', label: 'Compression Threshold', type: 'number' },
      { key: 'entity-broadcast-range-percentage', label: 'Entity Broadcast Range %', type: 'number' },
    ],
  },
];

function PropertyField({ propDef, value, onChange }) {
  const { key, label, type, options, hint } = propDef;

  if (type === 'boolean') {
    const checked = value === 'true';
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
          {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</div>}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(key, e.target.checked ? 'true' : 'false')}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{label}</label>
        <select
          className="form-select"
          value={value || ''}
          onChange={e => onChange(key, e.target.value)}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {hint && <div className="form-hint">{hint}</div>}
      </div>
    );
  }

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type={type === 'number' ? 'number' : 'text'}
        value={value || ''}
        onChange={e => onChange(key, e.target.value)}
      />
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export default function PropertiesEditor({ server }) {
  const [props, setProps] = useState({});
  const [raw, setRaw] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    load();
  }, [server.id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await serversApi.getProperties(server.id);
      setProps(data);
      setRaw(data);
    } catch (err) {
      if (err.response?.status === 500) {
        toast('No server.properties yet. Start the server first to generate one.', { icon: 'ℹ️' });
      }
    }
    setLoading(false);
  };

  const handleChange = (key, val) => {
    setProps(p => ({ ...p, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await serversApi.setProperties(server.id, props);
      toast.success('Properties saved!');
      if (server.status === 'running') {
        toast('Restart the server to apply changes.', { icon: '⚠️' });
      }
    } catch (err) {
      toast.error('Save failed: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="empty-state"><div className="spinner" /><p>Loading properties...</p></div>;
  }

  if (Object.keys(props).length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <h3>No server.properties found</h3>
        <p>Start the server once to generate the properties file.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${!showRaw ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowRaw(false)}>
            Friendly View
          </button>
          <button className={`btn btn-sm ${showRaw ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowRaw(true)}>
            Raw View
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={12} />Reload
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Saving...</> : <><Save size={12} />Save</>}
          </button>
        </div>
      </div>

      {server.status === 'running' && (
        <div style={{ background: 'var(--warning-muted)', border: '1px solid var(--warning)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--warning)' }}>
          ⚠️ Server is running. Save changes then restart to apply them.
        </div>
      )}

      {showRaw ? (
        <div>
          {Object.entries(props).map(([key, val]) => (
            <div key={key} className="form-group">
              <label className="form-label" style={{ fontFamily: 'monospace' }}>{key}</label>
              <input
                className="form-input"
                style={{ fontFamily: 'monospace' }}
                value={val}
                onChange={e => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          {PROPERTY_GROUPS.map(group => (
            <div key={group.title} className="props-group">
              <div className="props-group-title">{group.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {group.keys.map(propDef => (
                  <div key={propDef.key} style={propDef.type === 'text' && propDef.key === 'motd' ? { gridColumn: '1 / -1' } : {}}>
                    <PropertyField
                      propDef={propDef}
                      value={props[propDef.key] ?? ''}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Unknown keys */}
          {(() => {
            const knownKeys = PROPERTY_GROUPS.flatMap(g => g.keys.map(k => k.key));
            const unknownEntries = Object.entries(props).filter(([k]) => !knownKeys.includes(k));
            if (unknownEntries.length === 0) return null;
            return (
              <div className="props-group">
                <div className="props-group-title">Other Properties</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {unknownEntries.map(([key, val]) => (
                    <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontFamily: 'monospace' }}>{key}</label>
                      <input
                        className="form-input"
                        value={val}
                        onChange={e => handleChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Saving...</> : <><Save size={14} />Save Properties</>}
        </button>
      </div>
    </div>
  );
}
