export type ProductCategory = string;

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: ProductCategory;
  description?: string;
  unitPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
