'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push('/admin');
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>管理員登入</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>登入後可建立店家與管理訂單</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
          </div>
          {error && <div style={{ fontSize: 13, color: '#dc2626', padding: 8, background: '#fef2f2', borderRadius: 6 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '10px 16px', background: 'var(--text)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
            {loading ? '登入中…' : '登入'}
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: '1.5rem', textAlign: 'center' }}>
          沒有帳號?請在 Supabase Dashboard 建立(見 README)
        </p>
      </div>
    </div>
  );
}
