import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminCheck } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminCheck) {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>無權限</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          這個帳號 ({user.email}) 不是管理員。請在 Supabase 的 admins 資料表加入此使用者的 ID。
        </p>
      </div>
    );
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  return <AdminDashboard initialStores={stores || []} userEmail={user.email!} />;
}
