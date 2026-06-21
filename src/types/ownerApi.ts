export interface OwnerUser {
  id: number;
  name: string;
  age: number | null;
  phone_number: string | null;
  location: string | null;
  emergency_contact: string | null;
  email: string;
  username: string;
  role: 'manager' | 'worker' | 'owner';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OwnerUserCreateInput {
  name: string;
  age: number;
  phone_number: string;
  location: string;
  emergency_contact: string;
  email: string;
  username: string;
  role: 'manager' | 'worker';
}

export interface OwnerUserUpdateInput {
  name?: string;
  age?: number;
  phone_number?: string;
  location?: string;
  emergency_contact?: string;
  email?: string;
}

export interface OwnerProduct {
  id: number;
  name: string;
  type: string;
  description: string | null;
  unit: string;
  current_stock: number;
  max_stock_level: number;
  warehouse_id: number;
  warehouse: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface OwnerOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
  };
}

export interface OwnerOrder {
  id: number;
  manager_id: number;
  worker_id: number | null;
  recipient_name: string;
  recipient_contact: string;
  delivery_deadline: string;
  status: 'unassigned' | 'assigned' | 'delivered' | 'flagged';
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
  manager: {
    id: number;
    name: string;
  };
  worker: {
    id: number;
    name: string;
  } | null;
  items: OwnerOrderItem[];
}

