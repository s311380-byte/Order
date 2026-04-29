import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import StoreManager from './StoreManager';

export default async function StoreAdminPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminCheck } = await supabase
    .from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminCheck) redirect('/admin');

  const { data: store } = await supabase
    .from('stores').select('*').eq('id', params.storeId).maybeSingle();
  if (!store) notFound();

  const [{ data: menu }, { data: orders }] = await Promise.all([
    supabase.from('menu_items').select('*').eq('store_id', params.storeId).order('sort_order').order('created_at'),
    supabase.from('orders').select('*').eq('store_id', params.storeId).order('created_at', { ascending: false }),
  ]);

  return <StoreManager store={store} initialMenu={menu || []} initialOrders={orders || []} />;
}
