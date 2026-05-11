import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Play, Square, RotateCcw, Zap, Trash2, Download,
  Terminal, Package, Archive, Users, BarChart2, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { servers as serversApi } from '../../api/client';
import { useServerWS } from '../../hooks/useWebSocket';
import Console from '../Console/Console';
import StatsPanel from '../Monitoring/StatsPanel';
import PluginManager from '../Plugins/PluginManager';
import BackupManager from '../Backups/BackupManager';
import PlayerManager from '../Players/PlayerManager';
import PropertiesEditor from '../Settings/PropertiesEditor';
import VersionManager from './VersionManager';

const TABS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'stats', label: 'Monitoring', icon: BarChart2 },
  { id: 'plugins', label: 'Plugins', icon: Package },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'backups', label: 'Backups', icon: Archive },
  { id: 'properties', label: 'Properties', icon: Settings },
  { id: 'versions', label: 'Versions', icon: Download },
];

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`} style={{ fontSize: 12 }}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export default function ServerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const server = useStore(s => s.servers.find(srv => srv.id === id));
  const removeServer = useStore(s => s.removeServer);
  const updateServer = useStore(s => s.updateServer);
  const [activeTab, setActiveTab] = useState('console');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const ws = useServerWS(id);

  if (!server) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <h3>Server not found</h3>
        <button className="btn btn-ghost" onClick={() => navigate('/servers')}>Back to Dashboard</button>
      </div>
    );
  }

  const act = async (fn, label, optimistic) => {
    if (optimistic) updateServer(id, optimistic);
    try {
      await fn();
    } catch (err) {
      toast.error(`${label} failed: ${err.response?.data?.error || err.message}`);
      if (optimistic) updateServer(id, {}); // revert by re-fetching
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return setDeleteConfirm(true);
    try {
      await serversApi.delete(id);
      removeServer(id);
      navigate('/servers');
      toast.success('Server deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const isRunning = server.status === 'running';
  const isStopped = server.status === 'stopped';
  const isBusy = server.status === 'starting' || server.status === 'stopping';

  return (
    <div className="server-detail">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 15 }}>{server.name}</h1>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {server.type === 'bedrock' ? 'Bedrock' : `${server.loader || 'Java'} ${server.version || ''}`}
              {' · '}Port {server.port}
              {server.players?.length > 0 && ` · ${server.players.length} online`}
            </div>
          </div>
          <StatusBadge status={server.status} />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isStopped && (
            <button className="btn btn-success btn-sm" onClick={() => act(() => serversApi.start(id), 'Start', { status: 'starting' })}>
              <Play size={12} fill="currentColor" />Start
            </button>
          )}
          {isRunning && (
            <>
              <button className="btn btn-warning btn-sm" onClick={() => act(() => serversApi.restart(id), 'Restart')}>
                <RotateCcw size={12} />Restart
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => act(() => serversApi.stop(id), 'Stop', { status: 'stopping' })}>
                <Square size={12} fill="currentColor" />Stop
              </button>
            </>
          )}
          {(isRunning || isBusy) && (
            <button
              className="btn btn-ghost btn-sm"
              title="Force kill"
              onClick={() => {
                if (window.confirm('Force kill the server process?')) {
                  act(() => serversApi.kill(id), 'Kill', { status: 'stopped' });
                }
              }}
            >
              <Zap size={12} />Kill
            </button>
          )}
          {isBusy && <div className="spinner" style={{ width: 16, height: 16 }} />}
          <button
            className={`btn btn-sm ${deleteConfirm ? 'btn-danger' : 'btn-ghost'}`}
            onClick={handleDelete}
            onBlur={() => setTimeout(() => setDeleteConfirm(false), 200)}
            disabled={!isStopped}
            title={isStopped ? 'Delete server' : 'Stop server before deleting'}
          >
            <Trash2 size={12} />
            {deleteConfirm ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="server-detail-body">
        {activeTab === 'console' && (
          <div className="tab-content console-tab">
            <Console serverId={id} ws={ws} isRunning={isRunning} />
          </div>
        )}
        {activeTab === 'stats' && (
          <div className="tab-content">
            <StatsPanel server={server} />
          </div>
        )}
        {activeTab === 'plugins' && (
          <div className="tab-content">
            <PluginManager server={server} />
          </div>
        )}
        {activeTab === 'players' && (
          <div className="tab-content">
            <PlayerManager server={server} ws={ws} />
          </div>
        )}
        {activeTab === 'backups' && (
          <div className="tab-content">
            <BackupManager server={server} />
          </div>
        )}
        {activeTab === 'properties' && (
          <div className="tab-content">
            <PropertiesEditor server={server} />
          </div>
        )}
        {activeTab === 'versions' && (
          <div className="tab-content">
            <VersionManager server={server} />
          </div>
        )}
      </div>
    </div>
  );
}
