import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Layout/Sidebar';
import ServerList from './components/Servers/ServerList';
import ServerDetail from './components/Servers/ServerDetail';
import LoginPage from './components/Auth/LoginPage';
import useStore from './store/useStore';
import { connectGlobal } from './hooks/useWebSocket';
import { auth } from './api/client';

export default function App() {
  const fetchServers = useStore(s => s.fetchServers);
  const setServers = useStore(s => s.setServers);
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'required' | 'ok'

  useEffect(() => {
    auth.status().then(({ authEnabled }) => {
      if (!authEnabled) {
        setAuthState('ok');
        return;
      }
      const token = localStorage.getItem('mchost_token');
      setAuthState(token ? 'ok' : 'required');
    }).catch(() => setAuthState('ok'));
  }, []);

  useEffect(() => {
    if (authState !== 'ok') return;
    fetchServers();
    connectGlobal((serverList) => {
      if (serverList) setServers(serverList);
    });
  }, [authState]);

  if (authState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (authState === 'required') {
    return (
      <>
        <LoginPage onLogin={() => setAuthState('ok')} />
        <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '13px' } }} />
      </>
    );
  }

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
