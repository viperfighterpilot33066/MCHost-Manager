import { useEffect, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useStore from '../../store/useStore';

const MAX_POINTS = 60;

function StatCard({ label, value, unit, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color }}>
        {value}<span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 2 }}>{unit}</span>
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span>
          <strong>{p.value}{p.name === 'CPU' ? '%' : 'MB'}</strong>
        </div>
      ))}
    </div>
  );
};

export default function StatsPanel({ server }) {
  const [history, setHistory] = useState(() => Array(MAX_POINTS).fill({ CPU: 0, RAM: 0, t: '' }));
  const currentServer = useStore(s => s.servers.find(x => x.id === server.id));

  useEffect(() => {
    const stats = currentServer?.stats;
    if (!stats) return;

    const now = new Date();
    const label = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    setHistory(prev => {
      const next = [...prev.slice(1), { CPU: stats.cpu || 0, RAM: stats.ram || 0, t: label }];
      return next;
    });
  }, [currentServer?.stats]);

  const stats = currentServer?.stats || {};
  const players = currentServer?.players || [];
  const isRunning = currentServer?.status === 'running';

  return (
    <div>
      <div className="stats-grid">
        <StatCard
          label="CPU Usage"
          value={isRunning ? `${stats.cpu || 0}` : '—'}
          unit={isRunning ? '%' : ''}
          color={stats.cpu > 80 ? 'var(--danger)' : stats.cpu > 60 ? 'var(--warning)' : 'var(--success)'}
          sub="Process CPU"
        />
        <StatCard
          label="RAM Usage"
          value={isRunning ? `${stats.ram || 0}` : '—'}
          unit={isRunning ? ' MB' : ''}
          color="var(--primary)"
          sub={`Allocated: ${server.maxRam}`}
        />
        <StatCard
          label="Players Online"
          value={players.length}
          unit=""
          color="var(--purple)"
          sub={players.slice(0, 3).join(', ') || 'None'}
        />
        <StatCard
          label="Server Status"
          value={currentServer?.status || 'stopped'}
          unit=""
          color={isRunning ? 'var(--success)' : 'var(--text-muted)'}
          sub={currentServer?.startTime ? `Started ${new Date(currentServer.startTime).toLocaleTimeString()}` : 'Not running'}
        />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">CPU Usage (last 2 min)</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCPU" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={9} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="CPU" stroke="#58a6ff" strokeWidth={2} fill="url(#gradCPU)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">RAM Usage (last 2 min)</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRAM" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={9} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}MB`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="RAM" stroke="#3fb950" strokeWidth={2} fill="url(#gradRAM)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {players.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Online Players ({players.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {players.map(name => (
              <div key={name} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <img
                  src={`https://minotar.net/avatar/${name}/20`}
                  alt={name}
                  style={{ width: 20, height: 20, borderRadius: 3, imageRendering: 'pixelated' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
