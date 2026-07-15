// Typed client for the Unit Inventory module (คลังหน่วยงาน — stock ตาม location, การโอนย้าย).
// Endpoints per docs/api/unit-inventory.json.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

// Odoo many2one fields serialize as [id, "display name"] tuples, or false when unset.
export type OdooRef = [number, string] | false;

// ---------- Stock (stock.quant) ----------

export interface UnitStockItem {
  id: number;
  product_id: OdooRef;
  location_id: OdooRef;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  uom_id?: OdooRef;
  [key: string]: unknown;
}

export interface ListUnitStockParams {
  location_id?: number;
  product_template_id?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListUnitStockResponse {
  status: string;
  total_count: number;
  data: UnitStockItem[];
}

export async function listUnitStock(
  params: ListUnitStockParams = {}
): Promise<ListUnitStockResponse> {
  return apiFetch<ListUnitStockResponse>(
    `/unit-inventory/stock${buildQuery(params)}`
  );
}

export interface DeductUnitStockBody {
  location_id: number;
  product_template_id: number;
  quantity: number;
  uom_id?: number;
}

export interface DeductUnitStockResponse {
  status: string;
  deducted?: number;
  uom?: OdooRef;
  remaining?: number;
  [key: string]: unknown;
}

export async function deductUnitStock(
  body: DeductUnitStockBody
): Promise<DeductUnitStockResponse> {
  return apiFetch<DeductUnitStockResponse>("/unit-inventory/stock/deduct", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

// ---------- Locations (stock.location) ----------

export interface StockLocation {
  id: number;
  name: string;
  complete_name?: string;
  [key: string]: unknown;
}

export interface ListLocationsParams {
  name?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListLocationsResponse {
  status: string;
  total_count: number;
  data: StockLocation[];
}

export async function listLocations(
  params: ListLocationsParams = {}
): Promise<ListLocationsResponse> {
  return apiFetch<ListLocationsResponse>(
    `/unit-inventory/locations${buildQuery(params)}`
  );
}

export interface CreateLocationBody {
  name: string;
  parent_location_id: number;
}

export interface CreateLocationResponse {
  status: string;
  data?: StockLocation;
  [key: string]: unknown;
}

export async function createLocation(
  body: CreateLocationBody
): Promise<CreateLocationResponse> {
  return apiFetch<CreateLocationResponse>("/unit-inventory/locations", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

// ---------- Transfers (stock.picking / stock.move) ----------

export interface TransferItemInput {
  product_template_id: number;
  quantity: number;
  uom_id?: number;
}

export interface TransferMoveLine {
  id: number;
  product_id: OdooRef;
  product_uom: OdooRef;
  product_uom_qty: number;
  quantity_done?: number;
  state: string;
  [key: string]: unknown;
}

export interface StockTransfer {
  id: number;
  name: string;
  state: string;
  location_id: OdooRef;
  location_dest_id: OdooRef;
  scheduled_date?: string | false;
  date_done?: string | false;
  items?: TransferMoveLine[];
  [key: string]: unknown;
}

export interface ListTransfersParams {
  limit?: number;
  offset?: number;
  state?: string;
  from_location_id?: number;
  to_location_id?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListTransfersResponse {
  status: string;
  total_count: number;
  data: StockTransfer[];
}

export async function listTransfers(
  params: ListTransfersParams = {}
): Promise<ListTransfersResponse> {
  return apiFetch<ListTransfersResponse>(
    `/unit-inventory/transfers${buildQuery(params)}`
  );
}

export interface CreateTransferBody {
  from_location_id: number;
  to_location_id: number;
  items: TransferItemInput[];
}

export interface CreateTransferResponse {
  status: string;
  transfer_id?: number;
  data?: StockTransfer;
  [key: string]: unknown;
}

export async function createTransfer(
  body: CreateTransferBody
): Promise<CreateTransferResponse> {
  return apiFetch<CreateTransferResponse>("/unit-inventory/transfers", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export interface CancelTransferResponse {
  status: string;
  [key: string]: unknown;
}

export async function cancelTransfer(
  transferId: number
): Promise<CancelTransferResponse> {
  return apiFetch<CancelTransferResponse>(
    `/unit-inventory/transfers/${transferId}/cancel`,
    { method: "POST" }
  );
}

// ---------- UoM (uom.uom) ----------

export interface UomItem {
  id: number;
  name: string;
  category_id?: OdooRef;
  factor?: number;
  uom_type?: string;
  [key: string]: unknown;
}

export interface ListUomParams {
  category_name?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListUomResponse {
  status: string;
  total_count: number;
  data: UomItem[];
}

export async function listUom(
  params: ListUomParams = {}
): Promise<ListUomResponse> {
  return apiFetch<ListUomResponse>(`/unit-inventory/uom${buildQuery(params)}`);
}

// ---------- Picking types (stock.picking.type) ----------

export interface PickingType {
  id: number;
  name: string;
  code?: string;
  warehouse_id?: OdooRef;
  [key: string]: unknown;
}

export interface ListPickingTypesParams {
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// Note: backend does not return a total_count for this endpoint.
export interface ListPickingTypesResponse {
  status: string;
  data: PickingType[];
}

export async function listPickingTypes(
  params: ListPickingTypesParams = {}
): Promise<ListPickingTypesResponse> {
  return apiFetch<ListPickingTypesResponse>(
    `/unit-inventory/picking-types${buildQuery(params)}`
  );
}

export { ApiError } from "@/lib/api";
