// Typed client for the Patient Inventory module.
// ของที่ถูกสั่งและผูกกับผู้ป่วยรายตัว (เช่น สินค้าในคอร์ส, ยา) — ข้อมูลจากฐานข้อมูล HIS
// Endpoints: GET /patient-inventory, POST /patient-inventory/create,
// PATCH /patient-inventory/prepare, PATCH /patient-inventory/use,
// PATCH /patient-inventory/expire/extend, PATCH /patient-inventory/expired/fetch_update,
// DELETE /patient-inventory/delete
// See docs/api/patient-inventory.json for the exact backend contract.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

export const PATIENT_INVENTORY_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ready_to_use", label: "พร้อมใช้" },
  { value: "preparing", label: "เตรียมแล้ว" },
  { value: "used", label: "ใช้แล้ว" },
  { value: "expired", label: "หมดอายุ" },
  { value: "extended", label: "ต่ออายุแล้ว" },
  { value: "deleted", label: "ลบแล้ว" },
];

export const PATIENT_INVENTORY_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "created_date", label: "วันที่สร้าง" },
  { value: "expired_date", label: "วันหมดอายุ" },
  { value: "hn", label: "HN" },
  { value: "inv_id", label: "Inv ID" },
  { value: "item_id", label: "Item ID" },
  { value: "item_name", label: "ชื่อรายการ" },
  { value: "order_id", label: "Order ID" },
  { value: "quantity", label: "จำนวน" },
  { value: "remaining_qty", label: "คงเหลือ" },
  { value: "status", label: "สถานะ" },
  { value: "type", label: "ประเภท" },
  { value: "updated_date", label: "วันที่อัปเดต" },
  { value: "used_by", label: "ผู้ใช้" },
  { value: "used_in_visit", label: "VN ที่ใช้" },
];

export interface PatientInventoryRecord {
  inv_id: number;
  hn: string;
  order_id: number;
  item_id: number;
  item_name: string | null;
  created_by: string | null;
  status: string | null;
  used_by: string | null;
  medication_order_id: string | null;
  detail: string | null;
  note: string | null;
  quantity: number | null;
  remaining_qty: number | null;
  count_unit: string | null;
  type: string | null;
  used_in_visit: string | null;
  course_id: string | null;
  created_date?: string | null;
  updated_date?: string | null;
  expired_date?: string | null;
  [key: string]: unknown;
}

export interface ListPatientInventoryParams {
  hn?: string;
  vn?: string;
  status?: string[];
  date_from?: string;
  date_to?: string;
  see_all?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListPatientInventoryResponse {
  status: string;
  total_found: number;
  data: PatientInventoryRecord[];
}

export interface PatientInventoryCreateItem {
  hn: string;
  order_id: number;
  item_id: number;
  item_name?: string;
  created_by?: string;
  status?: string;
  used_by?: string;
  medication_order_id?: string;
  detail?: string;
  note?: string;
  quantity?: number;
  remaining_qty?: number;
  count_unit?: string;
  type?: string;
  used_in_visit?: string;
  course_id?: string;
}

export interface CreatePatientInventoryResponse {
  status: string;
  created?: number;
  inv_ids?: number[];
  [key: string]: unknown;
}

export interface PreparePayload {
  hn: string;
  inv_id: number;
}

export interface UsePayload {
  hn: string;
  inv_id: number;
  doctor_id: string;
  vn?: string;
}

export interface ExtendExpiredPayload {
  hn: string;
  inv_ids: number[];
  extended_date: string;
}

export interface FetchUpdateExpiredPayload {
  current_date: string;
}

export interface DeletePayload {
  hn: string;
  inv_id: number;
}

export interface PatientInventoryActionResponse {
  status: string;
  [key: string]: unknown;
}

export interface FetchUpdateExpiredResponse {
  status: string;
  updated?: number;
  inv_ids?: number[];
  [key: string]: unknown;
}

export async function listPatientInventory(
  params: ListPatientInventoryParams = {}
): Promise<ListPatientInventoryResponse> {
  const { status, ...rest } = params;
  const query = new URLSearchParams(buildQuery(rest).replace(/^\?/, ""));
  (status ?? []).forEach((s) => {
    if (s) query.append("status", s);
  });
  const qs = query.toString();
  return apiFetch<ListPatientInventoryResponse>(
    `/patient-inventory${qs ? `?${qs}` : ""}`
  );
}

export async function createPatientInventory(
  items: PatientInventoryCreateItem[]
): Promise<CreatePatientInventoryResponse> {
  return apiFetch<CreatePatientInventoryResponse>("/patient-inventory/create", {
    method: "POST",
    body: JSON.stringify(items.map((item) => cleanBody(item))),
  });
}

export async function preparePatientInventory(
  payload: PreparePayload
): Promise<PatientInventoryActionResponse> {
  return apiFetch<PatientInventoryActionResponse>("/patient-inventory/prepare", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function consumePatientInventory(
  payload: UsePayload
): Promise<PatientInventoryActionResponse> {
  return apiFetch<PatientInventoryActionResponse>("/patient-inventory/use", {
    method: "PATCH",
    body: JSON.stringify(cleanBody(payload)),
  });
}

export async function extendExpiredInventory(
  payload: ExtendExpiredPayload
): Promise<PatientInventoryActionResponse> {
  return apiFetch<PatientInventoryActionResponse>(
    "/patient-inventory/expire/extend",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchUpdateExpiredInventory(
  payload: FetchUpdateExpiredPayload
): Promise<FetchUpdateExpiredResponse> {
  return apiFetch<FetchUpdateExpiredResponse>(
    "/patient-inventory/expired/fetch_update",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deletePatientInventory(
  payload: DeletePayload
): Promise<PatientInventoryActionResponse> {
  return apiFetch<PatientInventoryActionResponse>("/patient-inventory/delete", {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export { ApiError } from "@/lib/api";
