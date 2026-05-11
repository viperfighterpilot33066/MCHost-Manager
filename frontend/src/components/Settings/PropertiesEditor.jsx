import { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { servers as serversApi } from '../../api/client';
import useStore from '../../store/useStore';

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
  {
    title: 'Access & Security',
    keys: [
      { key: 'spawn-protection', label: 'Spawn Protection Radius', type: 'number', hint: '0 to disable' },
      { key: 'enforce-whitelist', label: 'Enforce Whitelist (kick unlisted on reload)', type: 'boolean' },
      { key: 'player-idle-timeout', label: 'Idle Timeout (minutes)', type: 'number', hint: '0 to disable' },
      { key: 'op-permission-level', label: 'OP Permission Level', type: 'select', options: ['1', '2', '3', '4'] },
      { key: 'function-permission-level', label: 'Function Permission Level', type: 'select', options: ['1', '2', '3', '4'] },
      { key: 'force-gamemode', label: 'Force Gamemode on Join', type: 'boolean' },
      { key: 'broadcast-console-to-ops', label: 'Broadcast Console to OPs', type: 'boolean' },
    ],
  },
  {
    title: 'Resource Pack',
    keys: [
      { key: 'resource-pack', label: 'Resource Pack URL', type: 'text', hint: 'Direct download URL (.zip)' },
      { key: 'resource-pack-sha1', label: 'Resource Pack SHA-1', type: 'text', hint: 'Optional hash for verification' },
      { key: 'resource-pack-prompt', label: 'Prompt Message', type: 'text', hint: 'Shown when player is asked to accept' },
      { key: 'require-resource-pack', label: 'Require Resource Pack', type: 'boolean' },
    ],
  },
  {
    title: 'Remote Access (RCON)',
    keys: [
      { key: 'enable-rcon', label: 'Enable RCON', type: 'boolean' },
      { key: 'rcon.port', label: 'RCON Port', type: 'number', hint: 'Default: 25575' },
      { key: 'rcon.password', label: 'RCON Password', type: 'password' },
      { key: 'enable-query', label: 'Enable Query (GameSpy4)', type: 'boolean' },
      { key: 'query.port', label: 'Query Port', type: 'number', hint: 'Default: 25565' },
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
        type={type === 'number' ? 'number' : type === 'password' ? 'password' : 'text'}
        value={value || ''}
        onChange={e => onChange(key, e.target.value)}
      />
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

const SCHEDULE_PRESETS = [
  { label: 'Daily 4 AM', cron: '0 4 * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Every 12 hours', cron: '0 */12 * * *' },
  { label: 'Weekly (Sun 4 AM)', cron: '0 4 * * 0' },
  { label: 'Custom', cron: '' },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

function ScheduleManager({ server }) {
  const updateServer = useStore(s => s.updateServer);
  const [schedules, setSchedules] = useState(server.scheduledRestarts || []);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSched, setNewSched] = useState({ preset: 0, cron: SCHEDULE_PRESETS[0].cron, timezone: 'UTC', enabled: true });

  const saveSchedules = async (list) => {
    setSaving(true);
    try {
      await serversApi.update(server.id, { scheduledRestarts: list });
      updateServer(server.id, { scheduledRestarts: list });
      toast.success('Schedules saved');
    } catch (err) {
      toast.error('Save failed: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const toggleSchedule = (i) => {
    const next = schedules.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s);
    setSchedules(next);
    saveSchedules(next);
  };

  const deleteSchedule = (i) => {
    const next = schedules.filter((_, idx) => idx !== i);
    setSchedules(next);
    saveSchedules(next);
  };

  const addSchedule = () => {
    const cron = newSched.preset < SCHEDULE_PRESETS.length - 1
      ? SCHEDULE_PRESETS[newSched.preset].cron
      : newSched.cron.trim();
    if (!cron) return toast.error('Enter a cron expression');
    const next = [...schedules, { cron, timezone: newSched.timezone, enabled: newSched.enabled }];
    setSchedules(next);
    saveSchedules(next);
    setShowAdd(false);
    setNewSched({ preset: 0, cron: SCHEDULE_PRESETS[0].cron, timezone: 'UTC', enabled: true });
  };

  const handlePresetChange = (idx) => {
    const preset = SCHEDULE_PRESETS[parseInt(idx)];
    setNewSched(n => ({ ...n, preset: parseInt(idx), cron: preset?.cron || '' }));
  };

  return (
    <div className="props-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="props-group-title" style={{ margin: 0 }}>Scheduled Restarts</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(s => !s)}>
          <Plus size={12} />{showAdd ? 'Cancel' : 'Add Schedule'}
        </button>
      </div>

      {schedules.length === 0 && !showAdd && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
          No schedules configured. Add one to auto-restart the server.
        </div>
      )}

      {schedules.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, marginBottom: 6 }}>
          <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <code style={{ fontSize: 12, color: 'var(--primary)' }}>{s.cron}</code>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{s.timezone || 'UTC'}</span>
          </div>
          <label className="toggle" style={{ flexShrink: 0 }}>
            <input type="checkbox" checked={s.enabled} onChange={() => toggleSchedule(i)} />
            <span className="toggle-slider" />
          </label>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteSchedule(i)} title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {showAdd && (
        <div style={{ background: 'var(--surface)', borderRadius: 6, padding: 14, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Preset</label>
            <select className="form-select" value={newSched.preset} onChange={e => handlePresetChange(e.target.value)}>
              {SCHEDULE_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
            </select>
          </div>
          {newSched.preset === SCHEDULE_PRESETS.length - 1 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cron Expression</label>
              <input
                className="form-input"
                style={{ fontFamily: 'monospace' }}
                placeholder="0 4 * * *"
                value={newSched.cron}
                onChange={e => setNewSched(n => ({ ...n, cron: e.target.value }))}
              />
              <div className="form-hint">minute hour day month weekday — e.g. <code>0 4 * * *</code> = 4 AM daily</div>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Timezone</label>
            <select className="form-select" value={newSched.timezone} onChange={e => setNewSched(n => ({ ...n, timezone: e.target.value }))}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addSchedule} disabled={saving}>
            {saving ? 'Saving...' : <><Plus size={12} />Add Schedule</>}
          </button>
        </div>
      )}
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
                  <div key={propDef.key} style={propDef.type === 'text' && (propDef.key === 'motd' || propDef.key === 'resource-pack' || propDef.key === 'resource-pack-prompt') ? { gridColumn: '1 / -1' } : {}}>
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

      <ScheduleManager server={server} />
    </div>
  );
}
