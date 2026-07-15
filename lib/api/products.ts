// Typed client for the Products + Central Inventory module.
// Endpoints: /products, /products/{product_id}, /inventory, /inventory/deduct, /inventory/restock
// Follows docs/api/products-inventory.json exactly (field names included).

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

// Odoo many2one fields serialize as [id, "display name"] tuples, or false when unset.
export type OdooRef = [number, string] | false;

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

// Fields per _PRODUCT_FIELDS in routers/products.py — GET /products (list) and the
// PUT /products/{id} response both return exactly this shape (no barcode/description,
// those are write-only fields accepted by POST /products but never read back).
export interface Product {
  id: number;
  name: string;
  default_code: string | null;
  detailed_type: string | null;
  list_price: number | null;
  standard_price: number | null;
  is_included_patient_inventory: boolean;
  is_active: boolean;
  medical_category: string | null;
  insurance_category: string | null;
  billing_category: string | null;
  drug_category: string | null;
  stock_category: string | null;
  sale_category: string | null;
  roles_category: string | null;
  transfer_qty_coef: number | null;
  unit_of_use: string | null;
  search_terms: string[];
  qty_available: number | null;
  [key: string]: unknown;
}

export interface ListProductsParams {
  limit?: number;
  offset?: number;
  see_all?: boolean;
  name?: string;
  default_code?: string;
  detailed_type?: string;
  is_included_patient_inventory?: boolean;
  medical_category?: string;
  insurance_category?: string;
  billing_category?: string;
  drug_category?: string;
  stock_category?: string;
  sale_category?: string;
  roles_category?: string;
  unit_of_use?: string;
  search_terms?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListProductsResponse {
  status: string;
  total_count: number;
  data: Product[];
}

export interface ProductCreateBody {
  name: string;
  list_price?: number;
  standard_price?: number;
  barcode?: string;
  description?: string;
  is_included_patient_inventory?: boolean;
  medical_category?: string;
  insurance_category?: string;
  billing_category?: string;
  drug_category?: string;
  stock_category?: string;
  sale_category?: string;
  roles_category?: string;
  transfer_qty_coef?: number;
  unit_of_use?: string;
  search_terms?: string[];
}

export interface ProductUpdateBody {
  name?: string;
  list_price?: number;
  standard_price?: number;
  default_code?: string;
  detailed_type?: string;
  is_included_patient_inventory?: boolean;
  is_active?: boolean;
  medical_category?: string;
  insurance_category?: string;
  billing_category?: string;
  drug_category?: string;
  stock_category?: string;
  sale_category?: string;
  roles_category?: string;
  transfer_qty_coef?: number;
  unit_of_use?: string;
  search_terms?: string[];
}

export interface CreateProductResponse {
  status: string;
  odoo_product_id?: number;
  product_name?: string;
  [key: string]: unknown;
}

export interface MutateProductResponse {
  status: string;
  data?: Product;
  action?: string;
  product_id?: number;
  [key: string]: unknown;
}

export async function listProducts(
  params: ListProductsParams = {}
): Promise<ListProductsResponse> {
  return apiFetch<ListProductsResponse>(`/products${buildQuery(params)}`);
}

export async function createProduct(
  body: ProductCreateBody
): Promise<CreateProductResponse> {
  return apiFetch<CreateProductResponse>("/products", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateProduct(
  productId: number,
  body: ProductUpdateBody
): Promise<MutateProductResponse> {
  return apiFetch<MutateProductResponse>(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function deleteProduct(
  productId: number
): Promise<MutateProductResponse> {
  return apiFetch<MutateProductResponse>(`/products/${productId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

// Fields per _QUANT_FIELDS in routers/inventory.py — GET /inventory reads stock.quant
// directly; it does NOT join in product fields like default_code/categories/is_active
// (those query params only filter the domain, they aren't echoed back per row).
export interface InventoryItem {
  id: number;
  product_id: OdooRef;
  location_id: OdooRef;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  [key: string]: unknown;
}

export interface ListInventoryParams {
  limit?: number;
  offset?: number;
  see_all?: boolean;
  name?: string;
  location_id?: number;
  medical_category?: string;
  insurance_category?: string;
  billing_category?: string;
  drug_category?: string;
  stock_category?: string;
  sale_category?: string;
  roles_category?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListInventoryResponse {
  status: string;
  total_count: number;
  data: InventoryItem[];
}

export interface DeductItem {
  /** product.product id (mode product_id) หรือ inv_id (mode inv_id) */
  id: number;
  /** จำนวนที่ต้องการหัก (หน่วยใช้จริง เช่น cc) */
  quantity: number;
}

export interface PatientDeductBody {
  hn: string;
  vn: string;
  location_id?: number;
  used_by?: string;
  created_by?: string;
  idempotency_key?: string;
  order_id?: number;
  inv_id?: DeductItem[];
  product_id?: DeductItem[];
}

export interface RestockBody {
  product_template_id: number;
  quantity: number;
  location_id?: number;
}

export interface DeductInventoryResponse {
  status: string;
  hn?: string;
  vn?: string;
  results?: unknown[];
  df_reminder?: unknown;
  [key: string]: unknown;
}

export interface RestockInventoryResponse {
  status: string;
  product_name?: string;
  added_quantity?: number;
  data?: InventoryItem;
  [key: string]: unknown;
}

export async function listInventory(
  params: ListInventoryParams = {}
): Promise<ListInventoryResponse> {
  return apiFetch<ListInventoryResponse>(`/inventory${buildQuery(params)}`);
}

export async function deductInventory(
  body: PatientDeductBody
): Promise<DeductInventoryResponse> {
  return apiFetch<DeductInventoryResponse>("/inventory/deduct", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function restockInventory(
  body: RestockBody
): Promise<RestockInventoryResponse> {
  return apiFetch<RestockInventoryResponse>("/inventory/restock", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export { ApiError } from "@/lib/api";
