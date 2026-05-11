import { useState, useEffect } from 'react';
import { Archive, Plus, RotateCcw, Trash2, Clock, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { backups as backupsApi } from '../../api/client';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

export default function BackupManager({ server }) {
  const [backupList, setBackupList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [backupName, setBackupName] = useState('');

  useEffect(() => {
    loadBackups();
  }, [server.id]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await backupsApi.list(server.id);
      setBackupList(data);
    } catch (err) {
      toast.error('Failed to load backups');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const backup = await backupsApi.create(server.id, backupName || undefined);
      setBackupList(prev => [backup, ...prev]);
      setBackupName('');
      toast.success('Backup created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Backup failed');
    }
    setCreating(false);
  };

  const handleRestore = async (backupId) => {
    if (server.status !== 'stopped') {
      return toast.error('Stop the server before restoring a backup');
    }
    if (!window.confirm('Restore this backup? World files will be overwritten.')) return;
    try {
      await backupsApi.restore(server.id, backupId);
      toast.success('Backup restored!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Restore failed');
    }
  };

  const handleDelete = async (backupId) => {
    if (!window.confirm('Delete this backup?')) return;
    try {
      await backupsApi.delete(server.id, backupId);
      setBackupList(prev => prev.filter(b => b.id !== backupId));
      toast.success('Backup deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Create Backup</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            placeholder="Backup name (optional)"
            value={backupName}
            onChange={e => setBackupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating} style={{ flexShrink: 0 }}>
            {creating ? (
              <><div className="spinner" style={{ width: 14, height: 14 }} />Creating...</>
            ) : (
              <><Plus size={14} />Create Backup</>
            )}
          </button>
        </div>
        <p className="form-hint" style={{ marginTop: 8 }}>
          Backs up the entire server directory (excluding logs). Server does not need to be stopped.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Backups ({backupList.length})</h3>
        <button className="btn btn-ghost btn-sm" onClick={loadBackups} disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Refresh'}
        </button>
      </div>

      {loading && backupList.length === 0 && (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="spinner" />
          <p>Loading backups...</p>
        </div>
      )}

      {!loading && backupList.length === 0 && (
        <div className="empty-state" style={{ padding: 40 }}>
          <Archive size={32} />
          <h3>No backups yet</h3>
          <p>Create your first backup above.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {backupList.map(backup => (
          <div key={backup.id} className="backup-item">
            <Archive size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="backup-name">{backup.filename}</div>
              <div className="backup-meta" style={{ display: 'flex', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} />{formatDate(backup.createdAt)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <HardDrive size={11} />{formatBytes(backup.size)}
                </span>
              </div>
            </div>
            <div className="backup-actions">
              <button
                className="btn btn-warning btn-sm"
                onClick={() => handleRestore(backup.id)}
                title="Restore this backup"
                disabled={server.status !== 'stopped'}
              >
                <RotateCcw size={12} />Restore
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(backup.id)}
                title="Delete backup"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
