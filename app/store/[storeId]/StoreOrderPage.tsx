'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { Store, MenuItem } from '@/lib/types';

type CartItem = { id: string; name: string; price: number; qty: number };

export default function StoreOrderPage({ store, menu }: { store: Store; menu: MenuItem[] }) {
  const [name, setName] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ name: string; total: number } | null>(null);

  // 記住名字
  useEffect(() => {
    const saved = localStorage.getItem('order-platform-name');
    if (saved) setName(saved);
  }, []);
  useEffect(() => {
    if (name.trim()) localStorage.setItem('order-platform-name', name.trim());
  }, [name]);

  function changeQty(id: string, delta: number) {
    setCart(prev => {
      const next = { ...prev };
      const newQty = (next[id] || 0) + delta;
      if (newQty <= 0) delete next[id];
      else next[id] = newQty;
      return next;
    });
  }

  const cartItems: CartItem[] = Object.entries(cart).map(([id, qty]) => {
    const m = menu.find(x => x.id === id)!;
    return { id, name: m.name, price: m.price, qty };
  });
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);

  async function submit() {
    if (!name.trim()) { alert('請先輸入你的名字'); return; }
    if (itemCount === 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('orders').insert({
      store_id: store.id,
      customer_name: name.trim(),
      items: cartItems.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
      total,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) { alert('送出失敗: ' + error.message); return; }
    setSuccess({ name: name.trim(), total });
    setCart({});
    setNote('');
  }

  if (!store.is_open) {
    return (
      <Wrap>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>{store.name}</h1>
        <p style={{ marginTop: 12, padding: '1rem', background: '#fef3c7', borderRadius: 8, fontSize: 14, color: '#92400e' }}>
          目前不接受訂單
        </p>
      </Wrap>
    );
  }

  if (success) {
    return (
      <Wrap>
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, marginBottom: '1rem' }}>✓</div>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>訂單已送出!</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)' }}>
            {success.name},共 ${success.total}
          </p>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
            老闆已收到你的訂單
          </p>
          <button onClick={() => setSuccess(null)} style={{ marginTop: '1.5rem', padding: '10px 20px', background: 'var(--text)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
            再點一單
          </button>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 500 }}>{store.name}</h1>
        {store.description && <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{store.description}</p>}
      </header>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>你的名字</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="例:小明" style={{ width: '100%' }} />
      </div>

      {menu.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          目前沒有可點的餐點
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 8, marginBottom: '1.25rem' }}>
            {menu.map(item => {
              const qty = cart[item.id] || 0;
              return (
                <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>}
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>${item.price}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => changeQty(item.id, -1)} disabled={qty === 0} style={qtyBtn}>−</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: 500 }}>{qty}</span>
                    <button onClick={() => changeQty(item.id, 1)} style={qtyBtn}>+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>備註(選填)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="例:不要香菜" rows={2} style={{ width: '100%', resize: 'vertical' }} />
          </div>

          {/* 底部黏貼結算列 */}
          <div style={{
            position: 'sticky', bottom: 16, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itemCount} 件</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>${total}</div>
            </div>
            <button onClick={submit} disabled={submitting || itemCount === 0} style={{
              padding: '12px 24px',
              background: itemCount === 0 ? '#d6d3d1' : 'var(--text)',
              color: 'white', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 500,
            }}>
              {submitting ? '送出中…' : '送出訂單'}
            </button>
          </div>
        </>
      )}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>{children}</div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 18, color: 'var(--text)',
};
