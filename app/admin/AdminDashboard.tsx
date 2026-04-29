'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import type { Store } from '@/lib/types';

export default function AdminDashboard({ initialStores, userEmail }: { initialStores: Store[]; userEmail: string }) {
  const router = useRouter();
  const [stores, setStores] = useState(initialStores);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  async function createStore(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stores')
      .insert({ name: name.trim(), description: desc.trim() || null })
      .select()
      .single();
    setLoading(false);
    if (error) { alert('建立失敗: ' + error.message); return; }
    setStores([data, ...stores]);
    setName(''); setDesc(''); setShowNew(false);
  }

  async function deleteStore(id: string, storeName: string) {
    if (!confirm(`確定刪除「${storeName}」?所有菜單和訂單也會一併刪除`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) { alert('刪除失敗: ' + error.message); return; }
    setStores(stores.filter(s => s.id !== id));
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>店家管理</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{userEmail}</p>
        </div>
        <button onClick={logout} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          登出
        </button>
      </header>

      {!showNew ? (
        <button onClick={() => setShowNew(true)} style={{ padding: '10px 16px', background: 'var(--text)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: '1.5rem' }}>
          + 新增店家
        </button>
      ) : (
        <form onSubmit={createStore} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>新增店家</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="店家名稱(例:7-11、阿姨便當)" required />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="說明(選填)" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: 'var(--text)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14 }}>
                {loading ? '建立中…' : '建立'}
              </button>
              <button type="button" onClick={() => { setShowNew(false); setName(''); setDesc(''); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}>
                取消
              </button>
            </div>
          </div>
        </form>
      )}

      {stores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          還沒有店家。點上方按鈕新增第一間。
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {stores.map(s => (
            <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 500 }}>{s.name}</h3>
                  {s.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{s.description}</p>}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    建立於 {new Date(s.created_at).toLocaleDateString('zh-TW')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/admin/${s.id}`} style={{ padding: '8px 14px', background: 'var(--text)', color: 'white', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                    管理
                  </Link>
                  <button onClick={() => deleteStore(s.id, s.name)} style={{ padding: '8px 12px', background: 'transparent', color: '#dc2626', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
