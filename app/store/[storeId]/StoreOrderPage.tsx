'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { Store, MenuItem, AddOn } from '@/lib/types';

type CartLine = {
  lineId: string;
  itemId: string;
  itemName: string;
  basePrice: number;
  selectedAddOns: AddOn[];
  qty: number;
};

export default function StoreOrderPage({ store, menu }: { store: Store; menu: MenuItem[] }) {
  const [name, setName] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ name: string; total: number } | null>(null);
  const [pendingAddOns, setPendingAddOns] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const saved = localStorage.getItem('order-platform-name');
    if (saved) setName(saved);
  }, []);
  useEffect(() => {
    if (name.trim()) localStorage.setItem('order-platform-name', name.trim());
  }, [name]);

  function toggleAddOn(itemId: string, addOnId: string) {
    setPendingAddOns(prev => {
      const next = { ...prev };
      const current = new Set(next[itemId] || []);
      if (current.has(addOnId)) current.delete(addOnId);
      else current.add(addOnId);
      next[itemId] = current;
      return next;
    });
  }

  function calcUnitPrice(item: MenuItem): number {
    const selected = pendingAddOns[item.id] || new Set();
    const addOnTotal = (item.add_ons || []).filter(a => selected.has(a.id)).reduce((s, a) => s + a.price, 0);
    return item.price + addOnTotal;
  }

  function addToCart(item: MenuItem) {
    const selected = pendingAddOns[item.id] || new Set();
    const selectedAddOnList = (item.add_ons || []).filter(a => selected.has(a.id));
    const lineKey = item.id + '|' + selectedAddOnList.map(a => a.id).sort().join(',');

    setCart(prev => {
      const existing = prev.find(l => l.lineId === lineKey);
      if (existing) {
        return prev.map(l => l.lineId === lineKey ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        lineId: lineKey,
        itemId: item.id,
        itemName: item.name,
        basePrice: item.price,
        selectedAddOns: selectedAddOnList,
        qty: 1,
      }];
    });

    setPendingAddOns(prev => ({ ...prev, [item.id]: new Set() }));
  }

  function changeCartQty(lineId: string, delta: number) {
    setCart(prev => {
      const next = prev.map(l => l.lineId === lineId ? { ...l, qty: l.qty + delta } : l);
      return next.filter(l => l.qty > 0);
    });
  }

  const total = cart.reduce((s, l) => {
    const addOnSum = l.selectedAddOns.reduce((ss, a) => ss + a.price, 0);
    return s + (l.basePrice + addOnSum) * l.qty;
  }, 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  async function submit() {
    if (!name.trim()) { alert('請先輸入你的名字'); return; }
    if (itemCount === 0) return;
    setSubmitting(true);
    const supabase = createClient();

    const items = cart.map(l => {
      const addOnSum = l.selectedAddOns.reduce((s, a) => s + a.price, 0);
      return {
        name: l.itemName,
        price: l.basePrice + addOnSum,
        qty: l.qty,
        base_price: l.basePrice,
        selected_add_ons: l.selectedAddOns.map(a => ({ name: a.name, price: a.price })),
      };
    });

    const { error } = await supabase.from('orders').insert({
      store_id: store.id,
      customer_name: name.trim(),
      items,
      total,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) { alert('送出失敗: ' + error.message); return; }
    setSuccess({ name: name.trim(), total });
    setCart([]);
    setNote('');
    setPendingAddOns({});
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
          <div style={{ display: 'grid', gap: 10, marginBottom: '1.25rem' }}>
            {menu.map(item => (
              <MenuItemRow
                key={item.id}
                item={item}
                pendingSelected={pendingAddOns[item.id] || new Set()}
                unitPrice={calcUnitPrice(item)}
                onToggleAddOn={(addOnId) => toggleAddOn(item.id, addOnId)}
                onAddToCart={() => addToCart(item)}
              />
            ))}
          </div>

          {cart.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>已選餐點</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {cart.map(line => {
                  const unit = line.basePrice + line.selectedAddOns.reduce((s, a) => s + a.price, 0);
                  return (
                    <div key={line.lineId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{line.itemName}</div>
                        {line.selectedAddOns.length > 0 && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            +{line.selectedAddOns.map(a => a.name).join('、')}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>${unit} × {line.qty} = ${unit * line.qty}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => changeCartQty(line.lineId, -1)} style={qtyBtnSmall}>−</button>
                        <span style={{ minWidth: 20, textAlign: 'center', fontSize: 14 }}>{line.qty}</span>
                        <button onClick={() => changeCartQty(line.lineId, 1)} style={qtyBtnSmall}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>備註(選填)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="例:不要香菜" rows={2} style={{ width: '100%', resize: 'vertical' }} />
          </div>

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

function MenuItemRow({ item, pendingSelected, unitPrice, onToggleAddOn, onAddToCart }: {
  item: MenuItem;
  pendingSelected: Set<string>;
  unitPrice: number;
  onToggleAddOn: (addOnId: string) => void;
  onAddToCart: () => void;
}) {
  const addOns = item.add_ons || [];
  const hasAddOns = addOns.length > 0;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
          {item.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>}
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>${item.price}</div>
        </div>
      </div>

      {hasAddOns && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>加料(可複選)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {addOns.map(a => {
              const checked = pendingSelected.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => onToggleAddOn(a.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    borderRadius: 6,
                    border: '1px solid ' + (checked ? 'var(--text)' : 'var(--border)'),
                    background: checked ? 'var(--text)' : 'var(--surface)',
                    color: checked ? 'white' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <span>{checked ? '✓' : ''}</span>
                  <span>{a.name}</span>
                  <span style={{ opacity: 0.7 }}>{a.price > 0 ? `+$${a.price}` : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {hasAddOns && pendingSelected.size > 0 && `小計 $${unitPrice}`}
        </div>
        <button
          onClick={onAddToCart}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            background: 'var(--text)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
          }}
        >
          + 加入訂單 {hasAddOns && pendingSelected.size > 0 ? `($${unitPrice})` : ''}
        </button>
      </div>
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>{children}</div>
  );
}

const qtyBtnSmall: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 16, color: 'var(--text)',
};
