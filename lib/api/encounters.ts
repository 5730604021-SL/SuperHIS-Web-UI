// Typed client for the Encounter module.
// Endpoints: GET /encounter, POST /encounter, PATCH /encounter/status, PATCH /encounter/summary
// See docs/api/encounters.json for the exact backend contract.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

export type EncounterStatus = "pending" | "ongoing" | "done" | "cancel" | "postpone";

export const ENCOUNTER_STATUS_OPTIONS: { value: EncounterStatus; label: string }[] = [
  { value: "pending", label: "รอดำเนินการ" },
  { value: "ongoing", label: "กำลังดำเนินการ" },
  { value: "done", label: "เสร็จสิ้น" },
  { value: "cancel", label: "ยกเลิก" },
  { value: "postpone", label: "เลื่อน" },
];

export interface Encounter {
  encounter_id: number;
  vn: string;
  cheif_complaint: string | null;
  doctor_code: string | null;
  doctor_pname?: string | null;
  doctor_firstname?: string | null;
  doctor_lastname?: string | null;
  note: string | null;
  type: string | null;
  requestdate: string | null;
  status: EncounterStatus | string;
  summary?: string | null;
  [key: string]: unknown;
}

export interface ListEncountersParams {
  encounter_id?: number;
  vn?: string;
  doctor_code?: string;
  status?: EncounterStatus | "";
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListEncountersResponse {
  status: string;
  total_found: number;
  data: Encounter[];
}

export interface CreateEncounterBody {
  vn: string;
  cheif_complaint?: string;
  doctor_code?: string;
  note?: string;
  type?: string;
  requestdate?: string;
}

export interface CreateEncounterResponse {
  status: string;
  encounter_id?: number;
  [key: string]: unknown;
}

export interface UpdateEncounterStatusBody {
  encounter_id: number;
  status: EncounterStatus;
}

export interface UpdateEncounterSummaryBody {
  encounter_id: number;
  summary_text: string;
}

export interface EncounterActionResponse {
  status: string;
  [key: string]: unknown;
}

export async function listEncounters(
  params: ListEncountersParams = {}
): Promise<ListEncountersResponse> {
  return apiFetch<ListEncountersResponse>(`/encounter${buildQuery(params)}`);
}

export async function createEncounter(
  body: CreateEncounterBody
): Promise<CreateEncounterResponse> {
  return apiFetch<CreateEncounterResponse>("/encounter", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateEncounterStatus(
  body: UpdateEncounterStatusBody
): Promise<EncounterActionResponse> {
  return apiFetch<EncounterActionResponse>("/encounter/status", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateEncounterSummary(
  body: UpdateEncounterSummaryBody
): Promise<EncounterActionResponse> {
  return apiFetch<EncounterActionResponse>("/encounter/summary", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export { ApiError } from "@/lib/api";
