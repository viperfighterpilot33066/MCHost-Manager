import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Layout/Sidebar';
import ServerList from './components/Servers/ServerList';
import ServerDetail from './components/Servers/ServerDetail';
import useStore from './store/useStore';
import { connectGlobal } from './hooks/useWebSocket';

export default function App() {
  const fetchServers = useStore(s => s.fetchServers);
  const setServers = useStore(s => s.setServers);

  useEffect(() => {
    fetchServers();
    connectGlobal((serverList) => {
      if (serverList) setServers(serverList);
    });
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/" element={<Navigate to="/servers" replace />} />
          <Route path="/servers" element={<ServerList />} />
          <Route path="/servers/:id" element={<ServerDetail />} />
        </Routes>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'toast',
          duration: 3000,
          style: {
            background: 'var(--card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontSize: '13px',
          },
        }}
      />
    </div>
  );
}
