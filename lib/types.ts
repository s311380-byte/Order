export type AddOn = {
  id: string;
  name: string;
  price: number;
};

export type Store = {
  id: string;
  name: string;
  description: string | null;
  is_open: boolean;
  owner_id: string | null;
  created_at: string;
};

export type MenuItem = {
  id: string;
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean;
  sort_order: number;
  add_ons: AddOn[];
  created_at: string;
};

export type OrderItem = {
  name: string;
  price: number;
  qty: number;
  base_price?: number;
  selected_add_ons?: { name: string; price: number }[];
};

export type Order = {
  id: string;
  store_id: string;
  customer_name: string;
  items: OrderItem[];
  total: number;
  note: string | null;
  is_paid: boolean;
  is_picked_up: boolean;
  created_at: string;
};
