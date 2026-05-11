import { useNavigate, useLocation } from 'react-router-dom';
import { Server, LayoutDashboard, Plus } from 'lucide-react';
import useStore from '../../store/useStore';
import { useState } from 'react';
import CreateServerModal from '../Servers/CreateServerModal';

function StatusDot({ status }) {
  const colors = {
    running: 'var(--success)',
    starting: 'var(--warning)',
    stopping: 'var(--danger)',
    stopped: 'var(--text-muted)',
  };
  return (
    <span
      className="status-dot"
      style={{
        background: colors[status] || colors.stopped,
        animation: (status === 'running' || status === 'starting') ? 'pulse 2s infinite' : 'none',
      }}
    />
  );
}

export default function Sidebar() {
  const servers = useStore(s => s.servers);
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: 20 }}>⛏</span>
          <span>MCHost <span>Manager</span></span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          <div
            className={`sidebar-item ${location.pathname === '/servers' ? 'active' : ''}`}
            onClick={() => navigate('/servers')}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </div>
        </div>

        <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-label">Servers</div>
          <div className="sidebar-servers">
            {servers.length === 0 && (
              <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                No servers yet
              </div>
            )}
            {servers.map(srv => (
              <div
                key={srv.id}
                className={`sidebar-item ${location.pathname === `/servers/${srv.id}` ? 'active' : ''}`}
                onClick={() => navigate(`/servers/${srv.id}`)}
              >
                <StatusDot status={srv.status} />
                <span className="truncate" style={{ flex: 1 }}>{srv.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {srv.type === 'bedrock' ? 'BDS' : srv.loader || 'Java'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <button
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center' }}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />
            New Server
          </button>
        </div>
      </aside>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
