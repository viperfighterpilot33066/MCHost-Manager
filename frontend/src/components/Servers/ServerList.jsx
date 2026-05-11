import { useState } from 'react';
import { Plus, Server } from 'lucide-react';
import useStore from '../../store/useStore';
import ServerCard from './ServerCard';
import CreateServerModal from './CreateServerModal';

export default function ServerList() {
  const servers = useStore(s => s.servers);
  const loading = useStore(s => s.loading);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          New Server
        </button>
      </div>

      <div className="page-content">
        {loading && servers.length === 0 && (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading servers...</p>
          </div>
        )}

        {!loading && servers.length === 0 && (
          <div className="empty-state">
            <Server size={48} />
            <h3>No servers yet</h3>
            <p>Create your first Minecraft server to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              Create Server
            </button>
          </div>
        )}

        {servers.length > 0 && (
          <div className="server-grid">
            {servers.map(srv => (
              <ServerCard key={srv.id} server={srv} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
