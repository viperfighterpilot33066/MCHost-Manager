import { useNavigate } from 'react-router-dom';
import { Play, Square, RotateCcw, Users, Cpu, MemoryStick } from 'lucide-react';
import toast from 'react-hot-toast';
import { servers as serversApi } from '../../api/client';
import useStore from '../../store/useStore';
import { useServerWS } from '../../hooks/useWebSocket';

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export default function ServerCard({ server }) {
  const navigate = useNavigate();
  const updateServer = useStore(s => s.updateServer);

  useServerWS(server.id);

  const action = async (fn, label) => {
    try {
      await fn();
    } catch (err) {
      toast.error(`${label} failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleStart = (e) => {
    e.stopPropagation();
    updateServer(server.id, { status: 'starting' });
    action(() => serversApi.start(server.id), 'Start');
  };

  const handleStop = (e) => {
    e.stopPropagation();
    updateServer(server.id, { status: 'stopping' });
    action(() => serversApi.stop(server.id), 'Stop');
  };

  const handleRestart = (e) => {
    e.stopPropagation();
    action(() => serversApi.restart(server.id), 'Restart');
    toast.success('Restarting server...');
  };

  const stats = server.stats || {};
  const players = server.players || [];
  const isRunning = server.status === 'running';
  const isStopped = server.status === 'stopped';

  return (
    <div className="server-card" onClick={() => navigate(`/servers/${server.id}`)}>
      <div className="server-card-header">
        <div>
          <div className="server-card-name">{server.name}</div>
          <div className="server-card-type">
            {server.type === 'bedrock' ? 'Bedrock' : `${server.loader || 'Java'} ${server.version || ''}`}
            {' · '}Port {server.port}
          </div>
        </div>
        <StatusBadge status={server.status} />
      </div>

      <div className="server-card-stats">
        <div className="stat-item">
          <span className="stat-label">Players</span>
          <span className="stat-value" style={{ color: 'var(--primary)' }}>
            {players.length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">CPU</span>
          <span className="stat-value" style={{ color: stats.cpu > 80 ? 'var(--danger)' : 'var(--text)' }}>
            {isRunning ? `${stats.cpu || 0}%` : '—'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">RAM</span>
          <span className="stat-value" style={{ color: 'var(--text)' }}>
            {isRunning ? `${stats.ram || 0}MB` : '—'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max RAM</span>
          <span className="stat-value" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {server.maxRam}
          </span>
        </div>
      </div>

      <div className="server-card-actions">
        {isStopped && (
          <button className="btn btn-success btn-sm" onClick={handleStart}>
            <Play size={12} fill="currentColor" />
            Start
          </button>
        )}
        {isRunning && (
          <>
            <button className="btn btn-danger btn-sm" onClick={handleStop}>
              <Square size={12} fill="currentColor" />
              Stop
            </button>
            <button className="btn btn-warning btn-sm" onClick={handleRestart}>
              <RotateCcw size={12} />
              Restart
            </button>
          </>
        )}
        {(server.status === 'starting' || server.status === 'stopping') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 14, height: 14 }} />
            {server.status === 'starting' ? 'Starting...' : 'Stopping...'}
          </div>
        )}
      </div>
    </div>
  );
}
