// Typed client for the Medical Info module (ข้อมูลสุขภาพ / แพ้ยา / โรคประจำตัว).
// Endpoints per docs/api/medical-info.json.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

export type AllergyStatus = "active" | "inactive";

export interface Allergy {
  allergy_id: number;
  hn: string;
  drug_code: string;
  symptom: string | null;
  type: string | null;
  note: string | null;
  status: AllergyStatus;
  [key: string]: unknown;
}

export interface ListAllergiesParams {
  hn: string;
  include_inactive?: boolean;
}

export interface ListAllergiesResponse {
  status: string;
  total_found: number;
  data: Allergy[];
}

export interface AllergyCreateBody {
  hn: string;
  drug_code: string;
  symptom?: string;
  type?: string;
  note?: string;
}

export interface CreateAllergyResponse {
  status: string;
  allergy_id: number;
  [key: string]: unknown;
}

export interface AllergyUpdateBody {
  drug_code?: string;
  symptom?: string;
  type?: string;
  note?: string;
  status?: AllergyStatus;
}

export interface UpdateAllergyResponse {
  status: string;
  [key: string]: unknown;
}

export type UnderlyingStatus = "active" | "inactive";

export interface Underlying {
  underlying_id: number;
  hn: string;
  detail: string;
  status: UnderlyingStatus;
  [key: string]: unknown;
}

export interface ListUnderlyingParams {
  hn: string;
  include_inactive?: boolean;
}

export interface ListUnderlyingResponse {
  status: string;
  total_found: number;
  data: Underlying[];
}

export interface UnderlyingCreateBody {
  hn: string;
  detail: string;
}

export interface CreateUnderlyingResponse {
  status: string;
  underlying_id: number;
  [key: string]: unknown;
}

export interface UnderlyingUpdateBody {
  detail?: string;
  status?: UnderlyingStatus;
}

export interface UpdateUnderlyingResponse {
  status: string;
  [key: string]: unknown;
}

export interface HealthInfo {
  hn: string;
  blood_type: number;
  rh: string | null;
  o_bombae: boolean;
  [key: string]: unknown;
}

export interface GetHealthInfoResponse {
  status: string;
  hn: string;
  data: HealthInfo | null;
}

export interface HealthInfoUpsertBody {
  blood_type: number;
  rh?: string;
  o_bombae?: boolean;
}

export interface UpsertHealthInfoResponse {
  status: string;
  hn: string;
  [key: string]: unknown;
}

/** Allergy item as returned inside GET /medical-info/summary/{hn} — a narrower
 * projection than the full Allergy row (no hn/status columns). */
export interface AllergySummaryItem {
  allergy_id: number;
  drug_code: string;
  symptom: string | null;
  type: string | null;
  note: string | null;
  [key: string]: unknown;
}

/** Underlying-disease item as returned inside GET /medical-info/summary/{hn} —
 * a narrower projection than the full Underlying row (no hn/status columns). */
export interface UnderlyingSummaryItem {
  underlying_id: number;
  detail: string;
  [key: string]: unknown;
}

/** Health info as returned inside GET /medical-info/summary/{hn} — no hn/status columns. */
export interface HealthInfoSummary {
  blood_type: number;
  rh: string | null;
  o_bombae: boolean;
  [key: string]: unknown;
}

export interface MedicalSummaryData {
  allergies: AllergySummaryItem[];
  underlying: UnderlyingSummaryItem[];
  health_info: HealthInfoSummary | null;
}

export interface MedicalSummary {
  status: string;
  hn: string;
  data: MedicalSummaryData;
}

export async function listAllergies(
  params: ListAllergiesParams
): Promise<ListAllergiesResponse> {
  return apiFetch<ListAllergiesResponse>(
    `/medical-info/allergy${buildQuery(params)}`
  );
}

export async function createAllergy(
  body: AllergyCreateBody
): Promise<CreateAllergyResponse> {
  return apiFetch<CreateAllergyResponse>("/medical-info/allergy", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateAllergy(
  allergyId: number,
  body: AllergyUpdateBody
): Promise<UpdateAllergyResponse> {
  return apiFetch<UpdateAllergyResponse>(
    `/medical-info/allergy/${allergyId}`,
    {
      method: "PUT",
      body: JSON.stringify(cleanBody(body)),
    }
  );
}

export async function listUnderlying(
  params: ListUnderlyingParams
): Promise<ListUnderlyingResponse> {
  return apiFetch<ListUnderlyingResponse>(
    `/medical-info/underlying${buildQuery(params)}`
  );
}

export async function createUnderlying(
  body: UnderlyingCreateBody
): Promise<CreateUnderlyingResponse> {
  return apiFetch<CreateUnderlyingResponse>("/medical-info/underlying", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateUnderlying(
  underlyingId: number,
  body: UnderlyingUpdateBody
): Promise<UpdateUnderlyingResponse> {
  return apiFetch<UpdateUnderlyingResponse>(
    `/medical-info/underlying/${underlyingId}`,
    {
      method: "PUT",
      body: JSON.stringify(cleanBody(body)),
    }
  );
}

export async function getHealthInfo(hn: string): Promise<GetHealthInfoResponse> {
  return apiFetch<GetHealthInfoResponse>(
    `/medical-info/health/${encodeURIComponent(hn)}`
  );
}

export async function upsertHealthInfo(
  hn: string,
  body: HealthInfoUpsertBody
): Promise<UpsertHealthInfoResponse> {
  return apiFetch<UpsertHealthInfoResponse>(
    `/medical-info/health/${encodeURIComponent(hn)}`,
    {
      method: "PUT",
      body: JSON.stringify(cleanBody(body)),
    }
  );
}

export async function getMedicalSummary(hn: string): Promise<MedicalSummary> {
  return apiFetch<MedicalSummary>(
    `/medical-info/summary/${encodeURIComponent(hn)}`
  );
}

export { ApiError } from "@/lib/api";
