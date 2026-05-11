import { useState } from 'react';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../api/client';

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const { token } = await auth.login(password);
      localStorage.setItem('mchost_token', token);
      onLogin();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 40, width: 340, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'var(--primary-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>MCHost Manager</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !password}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} />Logging in...</> : 'Log In'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20, textAlign: 'center', lineHeight: 1.5 }}>
          Set <code style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: 3 }}>MCHOST_PASSWORD</code> in your <code style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: 3 }}>.env</code> file to change or disable the password.
        </p>
      </div>
    </div>
  );
}
