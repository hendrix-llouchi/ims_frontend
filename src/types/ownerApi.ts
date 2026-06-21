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
