// Typed client for the Visit / นัดหมาย / Prescreening module.
// Contract: docs/api/visits.json — field names follow the backend exactly.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

/** One item inside a visit_request / VisitRequestPayload.request[] */
export interface VisitRequestCreate {
  cheif_complaint?: string | null;
  doctor_code?: string | null;
  note?: string | null;
  type?: string | null;
}

/** Request body for POST /visit/request */
export interface VisitRequestPayload {
  vn?: string | null;
  request: VisitRequestCreate[];
}

/** Request body for POST /visit/appointment */
export interface AppointmentCreate {
  hn: string;
  visitdate?: string | null;
  status?: string | null;
  appointmentdate?: string | null;
  agent_id?: string | null;
  nurse_id?: string | null;
  height?: number | null;
  weight?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  respiratory_rate?: number | null;
  heartrate?: number | null;
  body_temp?: number | null;
  note?: string | null;
  checkout_date?: string | null;
  request?: VisitRequestPayload | null;
}

/** Request body for PATCH /visit/arrival */
export interface ArrivalPayload {
  vn: string;
  agent_id: string;
}

/** Request body for PATCH /visit/finish */
export interface FinishPayload {
  vn: string;
  confirm_no_df?: boolean;
  confirmed_by?: string | null;
}

/** Request body for PATCH /prescreening/{vn} */
export interface PrescreeningPayload {
  nurse_id?: string | null;
  height?: number | null;
  weight?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  respiratory_rate?: number | null;
  heartrate?: number | null;
  body_temp?: number | null;
}

/** A visit_request item as returned inside Visit.requests[] */
export interface VisitRequestItem extends VisitRequestCreate {
  requestdate?: string | null;
  [key: string]: unknown;
}

/** A row returned by GET /visit */
export interface Visit {
  vn: string;
  hn: string;
  visitdate: string | null;
  status: string | null;
  appointmentdate: string | null;
  agent_id: string | null;
  nurse_id: string | null;
  height: number | null;
  weight: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  respiratory_rate: number | null;
  heartrate: number | null;
  body_temp: number | null;
  note: string | null;
  checkout_date: string | null;
  createdate: string | null;
  requests?: VisitRequestItem[];
  [key: string]: unknown;
}

export interface ListVisitsParams {
  vn?: string;
  hn?: string;
  appointment_date_from?: string;
  appointment_date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListVisitsResponse {
  status: string;
  total_found: number;
  data: Visit[];
}

/** Generic response shape for action endpoints (backend schema left open in the spec). */
export interface VisitActionResponse {
  status: string;
  vn?: string;
  [key: string]: unknown;
}

export async function listVisits(
  params: ListVisitsParams = {}
): Promise<ListVisitsResponse> {
  return apiFetch<ListVisitsResponse>(`/visit${buildQuery(params)}`);
}

export async function createVisitRequest(
  body: VisitRequestPayload
): Promise<VisitActionResponse> {
  return apiFetch<VisitActionResponse>("/visit/request", {
    method: "POST",
    body: JSON.stringify(cleanBody(body as unknown as Record<string, unknown>)),
  });
}

export async function createAppointment(
  body: AppointmentCreate
): Promise<VisitActionResponse> {
  return apiFetch<VisitActionResponse>("/visit/appointment", {
    method: "POST",
    body: JSON.stringify(cleanBody(body as unknown as Record<string, unknown>)),
  });
}

export async function markArrival(
  body: ArrivalPayload
): Promise<VisitActionResponse> {
  return apiFetch<VisitActionResponse>("/visit/arrival", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function finishVisit(
  body: FinishPayload
): Promise<VisitActionResponse> {
  return apiFetch<VisitActionResponse>("/visit/finish", {
    method: "PATCH",
    body: JSON.stringify(cleanBody(body as unknown as Record<string, unknown>)),
  });
}

export async function updatePrescreening(
  vn: string,
  body: PrescreeningPayload
): Promise<VisitActionResponse> {
  return apiFetch<VisitActionResponse>(
    `/prescreening/${encodeURIComponent(vn)}`,
    {
      method: "PATCH",
      body: JSON.stringify(cleanBody(body as unknown as Record<string, unknown>)),
    }
  );
}

export { ApiError } from "@/lib/api";
