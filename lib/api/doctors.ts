// Typed client for the Doctor + Doctor Investigate endpoints.
// Follows docs/api/doctors.json exactly (field names included).

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

export interface Doctor {
  doctor_id: number;
  doctor_code: string;
  pname: string;
  firstname: string;
  lastname: string;
  gender: number | null;
  ward: string | null;
  phone_no: string | null;
  address: string | null;
  note: string | null;
  df_cap: number | null;
  is_active: boolean;
  created_date: string | null;
  resign_date: string | null;
  [key: string]: unknown;
}

export interface ListDoctorsParams {
  doctor_id?: number;
  doctor_code?: string;
  pname?: string;
  firstname?: string;
  lastname?: string;
  gender?: number;
  ward?: string;
  phone_no?: string;
  address?: string;
  is_active?: boolean;
  note?: string;
  created_from?: string;
  created_to?: string;
  resign_from?: string;
  resign_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListDoctorsResponse {
  status: string;
  total_found: number;
  data: Doctor[];
}

export interface DoctorRegisterBody {
  pname: string;
  firstname: string;
  lastname: string;
  doctor_code: string;
  gender: number;
  ward?: string;
  phone_no?: string;
  address?: string;
  note?: string;
  df_cap?: number;
}

export interface RegisterDoctorResponse {
  status: string;
  doctor_code?: string;
  doctor_id?: number;
  [key: string]: unknown;
}

export interface DFCapUpdateBody {
  doctor_code: string;
  df_cap?: number | null;
}

export interface UpdateDfCapResponse {
  status: string;
  doctor_code?: string;
  df_cap?: number | null;
  [key: string]: unknown;
}

export async function listDoctors(
  params: ListDoctorsParams = {}
): Promise<ListDoctorsResponse> {
  return apiFetch<ListDoctorsResponse>(`/doctor${buildQuery(params)}`);
}

export async function registerDoctor(
  body: DoctorRegisterBody
): Promise<RegisterDoctorResponse> {
  return apiFetch<RegisterDoctorResponse>("/doctor/register", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateDfCap(
  body: DFCapUpdateBody
): Promise<UpdateDfCapResponse> {
  return apiFetch<UpdateDfCapResponse>("/doctor/df-cap", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Doctor Investigate (SOAP note)
// ---------------------------------------------------------------------------

export interface DoctorInvestigate {
  investigate_id: number;
  encounter_id: number;
  vn: string | null;
  doctor_code: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  note: string | null;
  created_by: string | null;
  created_date: string | null;
  updated_date: string | null;
  [key: string]: unknown;
}

export interface ListDoctorInvestigatesParams {
  investigate_id?: number;
  encounter_id?: number;
  vn?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListDoctorInvestigatesResponse {
  status: string;
  total_found: number;
  data: DoctorInvestigate[];
}

export interface DoctorInvestigateCreateBody {
  encounter_id: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  note?: string;
  created_by?: string;
}

export interface CreateDoctorInvestigateResponse {
  status: string;
  investigate_id?: number;
  [key: string]: unknown;
}

/** One encounter's worth of SOAP notes, as nested under a visit in the by-hn/by-vn responses. */
export interface DoctorInvestigateEncounterGroup {
  encounter_id: number;
  vn: string;
  cheif_complaint: string | null;
  doctor_code: string | null;
  requestdate: string | null;
  type: string | null;
  status: string | null;
  summary: string | null;
  doctor_pname: string | null;
  doctor_firstname: string | null;
  doctor_lastname: string | null;
  investigates: DoctorInvestigate[];
  [key: string]: unknown;
}

/** One visit's worth of encounters, as nested in the by-hn/by-vn responses. */
export interface DoctorInvestigateVisitGroup {
  vn: string;
  hn?: string;
  visitdate: string | null;
  appointmentdate: string | null;
  status: string | null;
  checkout_date: string | null;
  encounters: DoctorInvestigateEncounterGroup[];
  [key: string]: unknown;
}

export interface DoctorInvestigatesByHnResponse {
  status: string;
  hn: string;
  total_visits: number;
  total_encounters: number;
  total_investigates: number;
  data: DoctorInvestigateVisitGroup[];
  [key: string]: unknown;
}

export interface DoctorInvestigatesByVnResponse {
  status: string;
  hn: string;
  vn: string;
  total_encounters: number;
  total_investigates: number;
  data: DoctorInvestigateVisitGroup;
  [key: string]: unknown;
}

export async function listDoctorInvestigates(
  params: ListDoctorInvestigatesParams = {}
): Promise<ListDoctorInvestigatesResponse> {
  return apiFetch<ListDoctorInvestigatesResponse>(
    `/doctor-investigate${buildQuery(params)}`
  );
}

export async function createDoctorInvestigate(
  body: DoctorInvestigateCreateBody
): Promise<CreateDoctorInvestigateResponse> {
  return apiFetch<CreateDoctorInvestigateResponse>("/doctor-investigate", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function getDoctorInvestigatesByHn(
  hn: string
): Promise<DoctorInvestigatesByHnResponse> {
  return apiFetch<DoctorInvestigatesByHnResponse>(
    `/doctor-investigate/by-hn/${encodeURIComponent(hn)}`
  );
}

export async function getDoctorInvestigatesByVn(
  vn: string
): Promise<DoctorInvestigatesByVnResponse> {
  return apiFetch<DoctorInvestigatesByVnResponse>(
    `/doctor-investigate/by-vn/${encodeURIComponent(vn)}`
  );
}

export { ApiError } from "@/lib/api";
