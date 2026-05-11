import { useState } from 'react';
import { Shield, ShieldOff, UserX, Ban, Star, UserPlus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';

export default function PlayerManager({ server, ws }) {
  const currentServer = useStore(s => s.servers.find(x => x.id === server.id));
  const players = currentServer?.players || [];
  const isRunning = currentServer?.status === 'running';
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');

  const cmd = (command) => {
    if (!isRunning) return toast.error('Server is not running');
    ws?.sendCommand(command);
  };

  const playerAction = (action, player, extra = '') => {
    const commands = {
      op: `op ${player}`,
      deop: `deop ${player}`,
      kick: `kick ${player}${extra ? ' ' + extra : ''}`,
      ban: `ban ${player}${extra ? ' ' + extra : ''}`,
      unban: `pardon ${player}`,
      'whitelist-add': `whitelist add ${player}`,
      'whitelist-remove': `whitelist remove ${player}`,
      gamemode_survival: `gamemode survival ${player}`,
      gamemode_creative: `gamemode creative ${player}`,
    };
    if (commands[action]) {
      cmd(commands[action]);
      toast.success(`Sent: /${commands[action]}`);
    }
  };

  const refreshList = () => {
    cmd('list');
    toast.success('Refreshing player list...');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>
          Online Players ({players.length})
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={refreshList} disabled={!isRunning}>
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {players.length === 0 && (
        <div className="empty-state" style={{ padding: 40 }}>
          <Star size={32} />
          <h3>No players online</h3>
          <p>{isRunning ? 'No players are currently connected.' : 'Start the server to see players.'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {players.map(name => (
          <div key={name} className="player-item">
            <img
              className="player-avatar"
              src={`https://minotar.net/avatar/${name}/32`}
              alt={name}
              style={{ imageRendering: 'pixelated' }}
              onError={e => { e.target.src = ''; e.target.style.background = 'var(--surface)'; }}
            />
            <span className="player-name">{name}</span>
            <div className="player-actions">
              <button
                className="btn btn-ghost btn-icon btn-sm"
                title="OP"
                onClick={() => playerAction('op', name)}
              >
                <Shield size={13} />
              </button>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                title="Deop"
                onClick={() => playerAction('deop', name)}
              >
                <ShieldOff size={13} />
              </button>
              <button
                className="btn btn-warning btn-icon btn-sm"
                title="Kick"
                onClick={() => playerAction('kick', name)}
              >
                <UserX size={13} />
              </button>
              <button
                className="btn btn-danger btn-icon btn-sm"
                title="Ban"
                onClick={() => {
                  const r = window.prompt(`Ban reason for ${name}:`, '');
                  if (r !== null) playerAction('ban', name, r);
                }}
              >
                <Ban size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="divider" />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Manual Player Actions</span>
        </div>

        <div className="form-group">
          <label className="form-label">Player Name</label>
          <input
            className="form-input"
            placeholder="Username"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Reason (for kick/ban)</label>
          <input
            className="form-input"
            placeholder="Optional reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('op', target)}>
            <Shield size={12} />OP
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('deop', target)}>
            <ShieldOff size={12} />DEOP
          </button>
          <button className="btn btn-warning btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('kick', target, reason)}>
            <UserX size={12} />Kick
          </button>
          <button className="btn btn-danger btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('ban', target, reason)}>
            <Ban size={12} />Ban
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('unban', target)}>
            Unban
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('whitelist-add', target)}>
            <UserPlus size={12} />Whitelist +
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!target || !isRunning} onClick={() => playerAction('whitelist-remove', target)}>
            Whitelist −
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Quick Commands</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'List Players', cmd: 'list' },
            { label: 'Save World', cmd: 'save-all' },
            { label: 'Whitelist On', cmd: 'whitelist on' },
            { label: 'Whitelist Off', cmd: 'whitelist off' },
            { label: 'Whitelist List', cmd: 'whitelist list' },
            { label: 'Say Hello', cmd: 'say Welcome to the server!' },
          ].map(({ label, cmd: c }) => (
            <button
              key={label}
              className="btn btn-ghost btn-sm"
              disabled={!isRunning}
              onClick={() => cmd(c)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
