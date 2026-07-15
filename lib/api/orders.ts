// Typed client for the Orders module (Order / ใบแจ้งหนี้ / การชำระเงิน).
// Endpoints: GET/POST /order, DELETE /order/{order_id}, POST /invoice,
// GET /payment/status/{order_id}, GET /partners.
// See docs/api/orders.json for the exact contract.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

/** Odoo many2one fields come back from XML-RPC read() as [id, display_name], or `false` when unset. */
export type Many2One = [number, string] | false;

// ---------------------------------------------------------------------------
// Order (sale.order)
// ---------------------------------------------------------------------------

export interface OrderLine {
  id: number;
  product_id: Many2One;
  name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  [key: string]: unknown;
}

export interface Order {
  id: number;
  name: string;
  hn: string;
  partner_id: Many2One;
  date_order: string;
  state: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  vn: string | false;
  agent_id: string | false;
  is_vat: boolean;
  is_service_charge: boolean;
  is_active: boolean;
  items: OrderLine[];
  [key: string]: unknown;
}

export type OrderSortBy =
  | "id"
  | "name"
  | "date_order"
  | "state"
  | "amount_untaxed"
  | "amount_tax"
  | "amount_total";

export interface ListOrdersParams {
  limit?: number;
  offset?: number;
  state?: string;
  partner_id?: number;
  sort_by?: OrderSortBy;
  sort_order?: "asc" | "desc";
}

export interface ListOrdersResponse {
  status: string;
  total_count: number;
  data: Order[];
}

export interface PackageItem {
  /** รหัส Package / Course */
  id: string;
  /** จำนวนชุด Package (default 1) */
  quantity?: number;
}

export interface ProductItem {
  /** Odoo product.product ID */
  id: number;
  /** จำนวนสินค้าในหน่วยใช้จริง (default 1) */
  quantity?: number;
}

export interface OrderCreateBody {
  hn: string;
  partner_id?: number;
  vn?: string;
  package_id?: PackageItem[];
  product_id?: ProductItem[];
  agent_id?: string;
  is_vat?: boolean;
  is_service_charge?: boolean;
  medication_order_id?: string;
  doctor_code?: string;
  df_amount?: number;
}

export interface OrderPricing {
  subtotal: number;
  service_charge: number;
  vat: number;
  df: number;
  grand_total: number;
}

export interface CreateOrderResponse {
  status: string;
  odoo_order_id: number;
  hn: string;
  vn: string | null;
  doctor_code: string | null;
  pricing: OrderPricing;
}

export interface DeleteOrderResponse {
  status: string;
  action: string;
  order_id: number;
  df_reversed: unknown[];
}

export async function listOrders(
  params: ListOrdersParams = {}
): Promise<ListOrdersResponse> {
  return apiFetch<ListOrdersResponse>(`/order${buildQuery({ ...params })}`);
}

export async function createOrder(
  body: OrderCreateBody
): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>("/order", {
    method: "POST",
    body: JSON.stringify(cleanBody({ ...body })),
  });
}

export async function deleteOrder(orderId: number): Promise<DeleteOrderResponse> {
  return apiFetch<DeleteOrderResponse>(`/order/${orderId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export interface InvoiceCreateBody {
  /** Odoo Sale Order ID */
  order_id: number;
  /** full = ออกเต็มจำนวน, down = มัดจำ */
  mode: "full" | "down";
  /** มัดจำแบบระบุจำนวนเงิน (บาท) */
  amount?: number;
  /** มัดจำแบบ % (0–100) */
  amount_percent?: number;
}

export interface InvoiceRecord {
  id: number;
  name: string;
  state: string;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
}

export interface CreateInvoiceResponse {
  status: string;
  order_id: number;
  order_name: string;
  mode: "full" | "down";
  invoices: InvoiceRecord[];
}

export async function createInvoice(
  body: InvoiceCreateBody
): Promise<CreateInvoiceResponse> {
  return apiFetch<CreateInvoiceResponse>("/invoice", {
    method: "POST",
    body: JSON.stringify(cleanBody({ ...body })),
  });
}

// ---------------------------------------------------------------------------
// Payment status
// ---------------------------------------------------------------------------

export interface PaymentStatusResponse {
  order_id: number;
  order_name: string;
  status: "paid" | "unpaid" | "partial_paid";
  paid_invoices: string[];
  remaining_invoices: string[];
  remaining_amount: number;
}

export async function getPaymentStatus(
  orderId: number
): Promise<PaymentStatusResponse> {
  return apiFetch<PaymentStatusResponse>(`/payment/status/${orderId}`);
}

// ---------------------------------------------------------------------------
// Partners (res.partner)
// ---------------------------------------------------------------------------

export interface Partner {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
}

export interface ListPartnersParams {
  limit?: number;
  sort_by?: "id" | "name" | "email" | "phone";
  sort_order?: "asc" | "desc";
}

export interface ListPartnersResponse {
  status: string;
  data: Partner[];
}

export async function listPartners(
  params: ListPartnersParams = {}
): Promise<ListPartnersResponse> {
  return apiFetch<ListPartnersResponse>(`/partners${buildQuery({ ...params })}`);
}

export { ApiError } from "@/lib/api";
