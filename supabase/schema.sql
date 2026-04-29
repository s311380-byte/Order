-- 點餐平台資料庫 Schema
-- 在 Supabase SQL Editor 執行整份檔案

-- ===== 1. 資料表 =====

-- 管理員 (從 auth.users 引用)
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 店家
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_open BOOLEAN DEFAULT TRUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 菜單項目
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 訂單
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL,  -- [{name, price, qty}]
  total INTEGER NOT NULL,
  note TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  is_picked_up BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_menu_store ON menu_items(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- ===== 2. 啟用 Row Level Security =====

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ===== 3. 輔助函式: 檢查是否為管理員 =====

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
$$;

-- ===== 4. RLS Policies =====

-- admins: 只有管理員自己可看
DROP POLICY IF EXISTS "admins_select_self" ON admins;
CREATE POLICY "admins_select_self" ON admins
  FOR SELECT USING (user_id = auth.uid());

-- stores: 公開讀取(同學需要看店家資訊),只有管理員能寫
DROP POLICY IF EXISTS "stores_select_all" ON stores;
CREATE POLICY "stores_select_all" ON stores
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "stores_admin_insert" ON stores;
CREATE POLICY "stores_admin_insert" ON stores
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "stores_admin_update" ON stores;
CREATE POLICY "stores_admin_update" ON stores
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "stores_admin_delete" ON stores;
CREATE POLICY "stores_admin_delete" ON stores
  FOR DELETE USING (is_admin());

-- menu_items: 公開讀取,只有管理員能寫
DROP POLICY IF EXISTS "menu_select_all" ON menu_items;
CREATE POLICY "menu_select_all" ON menu_items
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "menu_admin_insert" ON menu_items;
CREATE POLICY "menu_admin_insert" ON menu_items
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "menu_admin_update" ON menu_items;
CREATE POLICY "menu_admin_update" ON menu_items
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "menu_admin_delete" ON menu_items;
CREATE POLICY "menu_admin_delete" ON menu_items
  FOR DELETE USING (is_admin());

-- orders: 任何人可建立(同學下單),只有管理員能讀取/修改/刪除
DROP POLICY IF EXISTS "orders_anyone_insert" ON orders;
CREATE POLICY "orders_anyone_insert" ON orders
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "orders_admin_select" ON orders;
CREATE POLICY "orders_admin_select" ON orders
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "orders_admin_delete" ON orders;
CREATE POLICY "orders_admin_delete" ON orders
  FOR DELETE USING (is_admin());

-- ===== 5. 開啟 Realtime (給訂單用) =====
-- 注意:除了這個 SQL,你還需要在 Supabase Dashboard
-- → Database → Replication 把 orders 資料表的 Realtime 打開

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
