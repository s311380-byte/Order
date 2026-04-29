import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import StoreOrderPage from './StoreOrderPage';

export default async function PublicStorePage({ params }: { params: { storeId: string } }) {
  const supabase = createClient();
  const { data: store } = await supabase
    .from('stores').select('*').eq('id', params.storeId).maybeSingle();
  if (!store) notFound();

  const { data: menu } = await supabase
    .from('menu_items').select('*')
    .eq('store_id', params.storeId)
    .eq('is_available', true)
    .order('sort_order').order('created_at');

  return <StoreOrderPage store={store} menu={menu || []} />;
}
