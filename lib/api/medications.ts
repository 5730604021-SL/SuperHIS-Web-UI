// Typed client for the Medications + Drugs module.
// Endpoints: GET /medication, GET /medication/by-vn/{vn}, POST /medication,
// PUT /medication/{medication_order_id}, PATCH /medication/status,
// GET /drug, POST /drug/category, POST /drug/category/register
// See docs/api/medications.json for the exact backend contract.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

// ---------- Medication orders ----------

export type MedicationOrderListStatus = "ordered" | "dispensed" | "cancelled";
export type MedicationOrderStatus = "dispensed" | "cancelled";

export const MEDICATION_ORDER_STATUS_OPTIONS: {
  value: MedicationOrderListStatus;
  label: string;
}[] = [
  { value: "ordered", label: "รอจ่าย" },
  { value: "dispensed", label: "จ่ายแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

export const MEDICATION_NEW_STATUS_OPTIONS: {
  value: MedicationOrderStatus;
  label: string;
}[] = [
  { value: "dispensed", label: "จ่ายแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

export interface MedicationItem {
  product_id: number;
  quantity: number;
  dose?: string | null;
  frequency?: string | null;
  timing?: string | null;
  route?: string | null;
  duration_days?: number | null;
  instruction?: string | null;
  [key: string]: unknown;
}

export interface MedicationOrder {
  medication_order_id: string;
  encounter_id: number;
  vn?: string | null;
  hn?: string | null;
  doctor_code?: string | null;
  note?: string | null;
  created_by?: string | null;
  status: MedicationOrderListStatus | string;
  created_date?: string | null;
  updated_date?: string | null;
  items: MedicationItem[];
  [key: string]: unknown;
}

export interface ListMedicationOrdersParams {
  medication_order_id?: string;
  encounter_id?: number;
  vn?: string;
  hn?: string;
  doctor_code?: string;
  status?: MedicationOrderListStatus | "";
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListMedicationOrdersResponse {
  status: string;
  total_found: number;
  data: MedicationOrder[];
}

export interface MedicationOrderByVnEncounter {
  encounter_id: number;
  vn?: string;
  medication_orders: MedicationOrder[];
  [key: string]: unknown;
}

export interface MedicationOrdersByVnResponse {
  status: string;
  data: MedicationOrderByVnEncounter[];
  [key: string]: unknown;
}

export interface MedicationItemCreate {
  product_id: number;
  quantity: number;
  dose?: string;
  frequency?: string;
  timing?: string;
  route?: string;
  duration_days?: number;
  instruction?: string;
}

export interface MedicationOrderCreateBody {
  encounter_id: number;
  doctor_code?: string;
  note?: string;
  created_by?: string;
  items: MedicationItemCreate[];
}

export interface AllergyWarning {
  product_id?: number;
  product_name?: string;
  matched_drug_code?: string;
  symptom?: string;
  allergy_type?: string;
  note?: string;
  [key: string]: unknown;
}

export interface CreateMedicationOrderResponse {
  status: string;
  medication_order_id?: string;
  allergy_warnings?: AllergyWarning[];
  [key: string]: unknown;
}

export interface MedicationOrderUpdateBody {
  doctor_code?: string;
  note?: string;
  items: MedicationItemCreate[];
}

export interface UpdateMedicationOrderResponse {
  status: string;
  medication_order_id?: string;
  allergy_warnings?: AllergyWarning[];
  [key: string]: unknown;
}

export interface MedicationStatusUpdateBody {
  medication_order_id: string;
  status: MedicationOrderStatus;
}

export interface UpdateMedicationStatusResponse {
  status: string;
  medication_order_id?: string;
  [key: string]: unknown;
}

export async function listMedicationOrders(
  params: ListMedicationOrdersParams = {}
): Promise<ListMedicationOrdersResponse> {
  return apiFetch<ListMedicationOrdersResponse>(`/medication${buildQuery(params)}`);
}

export async function getMedicationOrdersByVn(
  vn: string,
  status?: MedicationOrderListStatus | ""
): Promise<MedicationOrdersByVnResponse> {
  return apiFetch<MedicationOrdersByVnResponse>(
    `/medication/by-vn/${encodeURIComponent(vn)}${buildQuery({ status: status || undefined })}`
  );
}

export async function createMedicationOrder(
  body: MedicationOrderCreateBody
): Promise<CreateMedicationOrderResponse> {
  return apiFetch<CreateMedicationOrderResponse>("/medication", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMedicationOrder(
  medicationOrderId: string,
  body: MedicationOrderUpdateBody
): Promise<UpdateMedicationOrderResponse> {
  return apiFetch<UpdateMedicationOrderResponse>(
    `/medication/${encodeURIComponent(medicationOrderId)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export async function updateMedicationStatus(
  body: MedicationStatusUpdateBody
): Promise<UpdateMedicationStatusResponse> {
  return apiFetch<UpdateMedicationStatusResponse>("/medication/status", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ---------- Drugs ----------

export interface Drug {
  id: number;
  name: string;
  default_code?: string | null;
  list_price?: number | null;
  standard_price?: number | null;
  qty_available?: number | null;
  is_active?: boolean;
  drug_category_code?: string | null;
  drug_category_name?: string | null;
  usage_category?: string | null;
  medical_category?: string | null;
  insurance_category?: string | null;
  billing_category?: string | null;
  stock_category?: string | null;
  sale_category?: string | null;
  roles_category?: string | null;
  unit_of_use?: string | null;
  [key: string]: unknown;
}

export interface ListDrugsParams {
  limit?: number;
  offset?: number;
  see_all?: boolean;
  search?: string;
  drug_category_code?: string;
  medical_category?: string;
  insurance_category?: string;
  billing_category?: string;
  stock_category?: string;
  sale_category?: string;
  roles_category?: string;
  unit_of_use?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListDrugsResponse {
  status: string;
  total_count: number;
  data: Drug[];
}

export interface DrugCategoryCreateBody {
  drug_category_name: string;
  usage_category?: string;
  condition?: string;
  detail?: string;
  note?: string;
}

export interface CreateDrugCategoryResponse {
  status: string;
  drug_category_code?: string;
  [key: string]: unknown;
}

export interface DrugCategoryRegisterBody {
  drug_category_code: string;
  product_id: number[];
}

export interface RegisterDrugCategoryResponse {
  status: string;
  drug_category_code?: string;
  updated_product_ids?: number[];
  [key: string]: unknown;
}

export async function listDrugs(
  params: ListDrugsParams = {}
): Promise<ListDrugsResponse> {
  return apiFetch<ListDrugsResponse>(`/drug${buildQuery(params)}`);
}

export async function createDrugCategory(
  body: DrugCategoryCreateBody
): Promise<CreateDrugCategoryResponse> {
  return apiFetch<CreateDrugCategoryResponse>("/drug/category", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function registerDrugCategoryProducts(
  body: DrugCategoryRegisterBody
): Promise<RegisterDrugCategoryResponse> {
  return apiFetch<RegisterDrugCategoryResponse>("/drug/category/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export { ApiError } from "@/lib/api";
