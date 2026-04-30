'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import type { Store, MenuItem, Order, AddOn } from '@/lib/types';

export default function StoreManager({
  store, initialMenu, initialOrders,
}: {
  store: Store; initialMenu: MenuItem[]; initialOrders: Order[];
}) {
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [menu, setMenu] = useState(initialMenu);
  const [orders, setOrders] = useState(initialOrders);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders:${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              osc.start(); osc.stop(ctx.currentTime + 0.3);
            } catch {}
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === (payload.new as Order).id ? payload.new as Order : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store.id]);

  function copyLink() {
    const url = `${window.location.origin}/store/${store.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const paidRevenue = orders.filter(o => o.is_paid).reduce((s, o) => s + o.total, 0);
  const pendingPickup = orders.filter(o => !o.is_picked_up).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/admin" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← 返回店家列表</Link>

      <header style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500 }}>{store.name}</h1>
          {store.description && <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{store.description}</p>}
        </div>
        <button onClick={copyLink} style={{ padding: '10px 16px', background: copied ? '#10b981' : 'var(--text)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, transition: 'background 0.2s' }}>
          {copied ? '✓ 已複製連結' : '複製同學點餐連結'}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: '1.5rem' }}>
        <Stat label="訂單數" value={String(orders.length)} />
        <Stat label="總金額" value={`$${totalRevenue}`} />
        <Stat label="已收款" value={`$${paidRevenue}`} />
        <Stat label="未取餐" value={String(pendingPickup)} />
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')}>
          訂單 ({orders.length})
        </TabBtn>
        <TabBtn active={tab === 'menu'} onClick={() => setTab('menu')}>
          菜單 ({menu.length})
        </TabBtn>
      </div>

      {tab === 'orders' && <OrdersPanel orders={orders} setOrders={setOrders} storeName={store.name} />}
      {tab === 'menu' && <MenuPanel storeId={store.id} menu={menu} setMenu={setMenu} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', background: 'transparent', border: 'none',
      borderBottom: active ? '2px solid var(--text)' : '2px solid transparent',
      marginBottom: -1, fontSize: 14, fontWeight: active ? 500 : 400,
      color: active ? 'var(--text)' : 'var(--text-muted)',
    }}>{children}</button>
  );
}

// =============== 訂單面板 ===============
function OrdersPanel({ orders, setOrders, storeName }: { orders: Order[]; setOrders: (o: Order[] | ((prev: Order[]) => Order[])) => void; storeName: string }) {
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'unpicked'>('all');

  async function togglePaid(o: Order) {
    const supabase = createClient();
    const { error } = await supabase.from('orders').update({ is_paid: !o.is_paid }).eq('id', o.id);
    if (error) alert('更新失敗: ' + error.message);
  }
  async function togglePicked(o: Order) {
    const supabase = createClient();
    const { error } = await supabase.from('orders').update({ is_picked_up: !o.is_picked_up }).eq('id', o.id);
    if (error) alert('更新失敗: ' + error.message);
  }
  async function removeOrder(o: Order) {
    if (!confirm(`刪除 ${o.customer_name} 的訂單?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('orders').delete().eq('id', o.id);
    if (error) alert('刪除失敗: ' + error.message);
  }
  async function clearAll() {
    if (!confirm(`確定清空「${storeName}」所有訂單?無法復原`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('orders').delete().eq('store_id', orders[0]?.store_id || '');
    if (error) alert('清空失敗: ' + error.message);
  }

  function exportDetailCSV() {
    const rows: (string | number)[][] = [['時間', '姓名', '餐點', '加料', '數量', '單價', '小計', '備註', '已收款', '已取餐']];
    orders.forEach(o => {
      const t = new Date(o.created_at);
      const tStr = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      o.items.forEach(i => {
        const addOnsStr = i.selected_add_ons?.map(a => a.name).join('、') || '';
        rows.push([tStr, o.customer_name, i.name, addOnsStr, i.qty, i.price, i.price * i.qty, o.note || '', o.is_paid ? '是' : '否', o.is_picked_up ? '是' : '否']);
      });
    });
    downloadCSV(rows, `${storeName}_訂單明細.csv`);
  }

  function exportSummaryCSV() {
    const counts: Record<string, { qty: number; price: number; total: number }> = {};
    orders.forEach(o => o.items.forEach(i => {
      const addOnsStr = i.selected_add_ons?.length ? ` (${i.selected_add_ons.map(a => a.name).join('+')})` : '';
      const key = i.name + addOnsStr;
      counts[key] = counts[key] || { qty: 0, price: i.price, total: 0 };
      counts[key].qty += i.qty;
      counts[key].total += i.price * i.qty;
    }));
    const rows: (string | number)[][] = [['餐點', '數量', '單價', '小計']];
    Object.entries(counts).forEach(([n, d]) => rows.push([n, d.qty, d.price, d.total]));
    rows.push(['', '', '總計', orders.reduce((s, o) => s + o.total, 0)]);
    downloadCSV(rows, `${storeName}_訂單彙總.csv`);
  }

  const filtered = orders.filter(o => {
    if (filter === 'unpaid') return !o.is_paid;
    if (filter === 'unpicked') return !o.is_picked_up;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>全部</FilterBtn>
        <FilterBtn active={filter === 'unpaid'} onClick={() => setFilter('unpaid')}>未收款</FilterBtn>
        <FilterBtn active={filter === 'unpicked'} onClick={() => setFilter('unpicked')}>未取餐</FilterBtn>
        <div style={{ flex: 1 }} />
        <button onClick={exportDetailCSV} disabled={!orders.length} style={btnSecondary}>匯出明細</button>
        <button onClick={exportSummaryCSV} disabled={!orders.length} style={btnSecondary}>匯出彙總</button>
        {orders.length > 0 && (
          <button onClick={clearAll} style={{ ...btnSecondary, color: '#dc2626' }}>全部清空</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          {orders.length === 0 ? '還沒有訂單,等同學下單…' : '沒有符合篩選的訂單'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(o => (
            <OrderCard key={o.id} order={o} onTogglePaid={togglePaid} onTogglePicked={togglePicked} onDelete={removeOrder} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', fontSize: 13,
      background: active ? 'var(--text)' : 'transparent',
      color: active ? 'white' : 'var(--text)',
      border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
      borderRadius: 8,
    }}>{children}</button>
  );
}

const btnSecondary: React.CSSProperties = {
  padding: '6px 12px', fontSize: 13, background: 'transparent',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
};

function OrderCard({ order, onTogglePaid, onTogglePicked, onDelete }: {
  order: Order;
  onTogglePaid: (o: Order) => void;
  onTogglePicked: (o: Order) => void;
  onDelete: (o: Order) => void;
}) {
  const t = new Date(order.created_at);
  const tStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{order.customer_name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tStr}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {order.items.map((i, idx) => {
              const addOns = i.selected_add_ons?.length ? ` (${i.selected_add_ons.map(a => a.name).join('+')})` : '';
              return <div key={idx}>{i.name}{addOns} ×{i.qty}</div>;
            })}
          </div>
          {order.note && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
              備註:{order.note}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Pill on={order.is_paid} onClick={() => onTogglePaid(order)} color="#10b981">
              {order.is_paid ? '✓ 已收款' : '未收款'}
            </Pill>
            <Pill on={order.is_picked_up} onClick={() => onTogglePicked(order)} color="#3b82f6">
              {order.is_picked_up ? '✓ 已取餐' : '未取餐'}
            </Pill>
            <button onClick={() => onDelete(order)} style={{ padding: '3px 10px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6 }}>
              刪除
            </button>
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, flexShrink: 0 }}>${order.total}</div>
      </div>
    </div>
  );
}

function Pill({ on, onClick, color, children }: { on: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 10px', fontSize: 12, borderRadius: 6,
      background: on ? color : 'transparent',
      color: on ? 'white' : 'var(--text-muted)',
      border: '1px solid ' + (on ? color : 'var(--border)'),
    }}>{children}</button>
  );
}

// =============== 菜單面板 ===============
function MenuPanel({ storeId, menu, setMenu }: { storeId: string; menu: MenuItem[]; setMenu: (m: MenuItem[]) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const p = parseInt(price);
    if (!name.trim() || isNaN(p) || p < 0) { alert('請輸入有效的名稱與價格'); return; }
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('menu_items')
      .insert({ store_id: storeId, name: name.trim(), price: p, description: desc.trim() || null, add_ons: [] })
      .select().single();
    setAdding(false);
    if (error) { alert('新增失敗: ' + error.message); return; }
    setMenu([...menu, { ...data, add_ons: data.add_ons || [] }]);
    setName(''); setPrice(''); setDesc('');
  }

  async function removeItem(id: string) {
    if (!confirm('刪除這個餐點?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) { alert('刪除失敗: ' + error.message); return; }
    setMenu(menu.filter(m => m.id !== id));
  }

  async function toggleAvail(item: MenuItem) {
    const supabase = createClient();
    const { error } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    if (error) { alert('更新失敗: ' + error.message); return; }
    setMenu(menu.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m));
  }

  async function updateAddOns(itemId: string, addOns: AddOn[]) {
    const supabase = createClient();
    const { error } = await supabase.from('menu_items').update({ add_ons: addOns }).eq('id', itemId);
    if (error) { alert('更新失敗: ' + error.message); return; }
    setMenu(menu.map(m => m.id === itemId ? { ...m, add_ons: addOns } : m));
  }

  return (
    <div>
      <form onSubmit={addItem} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>新增餐點</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="名稱" required />
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="價格" type="number" min="0" required />
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="說明(選填)" style={{ width: '100%', marginBottom: 8 }} />
        <button type="submit" disabled={adding} style={{ padding: '8px 16px', background: 'var(--text)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14 }}>
          {adding ? '新增中…' : '新增'}
        </button>
      </form>

      {menu.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          還沒有餐點。新增第一個項目讓同學能點餐!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {menu.map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              isEditing={editingItem === item.id}
              onToggleEdit={() => setEditingItem(editingItem === item.id ? null : item.id)}
              onToggleAvail={() => toggleAvail(item)}
              onDelete={() => removeItem(item.id)}
              onSaveAddOns={(addOns) => updateAddOns(item.id, addOns)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item, isEditing, onToggleEdit, onToggleAvail, onDelete, onSaveAddOns }: {
  item: MenuItem;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleAvail: () => void;
  onDelete: () => void;
  onSaveAddOns: (addOns: AddOn[]) => void;
}) {
  const addOns = item.add_ons || [];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', opacity: item.is_available ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
          {item.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>}
          {addOns.length > 0 && !isEditing && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              加料:{addOns.map(a => `${a.name} +$${a.price}`).join('、')}
            </div>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>${item.price}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onToggleEdit} style={{ padding: '6px 10px', fontSize: 12, background: isEditing ? 'var(--text)' : 'transparent', color: isEditing ? 'white' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}>
            {isEditing ? '收起' : '加料設定'}
          </button>
          <button onClick={onToggleAvail} style={{ padding: '6px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6 }}>
            {item.is_available ? '上架中' : '已下架'}
          </button>
          <button onClick={onDelete} style={{ padding: '6px 10px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6 }}>
            刪除
          </button>
        </div>
      </div>

      {isEditing && (
        <AddOnEditor initialAddOns={addOns} onSave={onSaveAddOns} />
      )}
    </div>
  );
}

function AddOnEditor({ initialAddOns, onSave }: { initialAddOns: AddOn[]; onSave: (addOns: AddOn[]) => void }) {
  const [addOns, setAddOns] = useState<AddOn[]>(initialAddOns);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saved, setSaved] = useState(false);

  function addNew() {
    if (!newName.trim()) { alert('請輸入加料名稱'); return; }
    const p = parseInt(newPrice) || 0;
    const next = [...addOns, { id: 'a' + Date.now() + Math.random().toString(36).slice(2, 6), name: newName.trim(), price: p }];
    setAddOns(next);
    setNewName(''); setNewPrice('');
  }
  function removeOne(id: string) {
    setAddOns(addOns.filter(a => a.id !== id));
  }
  function save() {
    onSave(addOns);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ marginTop: 12, padding: 12, background: '#f5f5f4', borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>加料選項(同學點餐時可勾選)</div>

      {addOns.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          {addOns.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 10px', background: 'white', borderRadius: 6 }}>
              <span style={{ flex: 1 }}>{a.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>+${a.price}</span>
              <button onClick={() => removeOne(a.id)} style={{ padding: '2px 8px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4 }}>移除</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 6, marginBottom: 10 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="加料名稱(例:加飯)" style={{ fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNew())} />
        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="加價" type="number" min="0" style={{ fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNew())} />
        <button onClick={addNew} style={{ padding: '6px 12px', fontSize: 13, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6 }}>新增</button>
      </div>

      <button onClick={save} style={{ padding: '8px 16px', fontSize: 13, background: saved ? '#10b981' : 'var(--text)', color: 'white', border: 'none', borderRadius: 6 }}>
        {saved ? '✓ 已儲存' : '儲存加料設定'}
      </button>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        💡 提示:加料金額為 0 也可以(例如「不要香菜」這種選項)
      </div>
    </div>
  );
}

// =============== 共用 ===============
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = '\ufeff' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
