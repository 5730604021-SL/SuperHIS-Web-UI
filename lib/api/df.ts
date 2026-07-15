// Typed client for the Doctor Fee (DF) module.
// Endpoints: GET /df, GET /df/missing, GET /df/suggest, GET /df/summary,
// GET /df/summary/monthly, POST /df, POST /df/{df_id}/reverse,
// PATCH /df/{df_id}/approve, PATCH /df/approve-by-vn
// See docs/api/df.json for the exact backend contract.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

export type DfSourceType = "order" | "manual_service" | "reversal" | "no_df";
export type DfApprovalStatus = "pending" | "approved" | "voided";

export const DF_SOURCE_TYPE_OPTIONS: { value: DfSourceType; label: string }[] = [
  { value: "order", label: "ระบบตัดจากคำสั่ง" },
  { value: "manual_service", label: "หมอคีย์เอง" },
  { value: "reversal", label: "กลับรายการ" },
  { value: "no_df", label: "ยืนยันปิดโดยไม่มี DF" },
];

export const DF_APPROVAL_STATUS_OPTIONS: { value: DfApprovalStatus; label: string }[] = [
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "voided", label: "ยกเลิก" },
];

export interface DfEntry {
  df_id: number;
  doctor_code: string;
  hn: string;
  vn: string;
  df_amount: number;
  source_type: DfSourceType | string;
  source_ref: string | null;
  course_id: string | null;
  note: string | null;
  created_date: string;
  created_by: string | null;
  approval_status: DfApprovalStatus | string;
  approved_by: string | null;
  approved_date: string | null;
  doctor_pname?: string | null;
  doctor_firstname?: string | null;
  doctor_lastname?: string | null;
  [key: string]: unknown;
}

export interface ListDfParams {
  doctor_code?: string;
  hn?: string;
  vn?: string;
  source_type?: DfSourceType | "";
  approval_status?: DfApprovalStatus | "";
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListDfResponse {
  status: string;
  total_found: number;
  data: DfEntry[];
}

export interface CreateDfBody {
  doctor_code: string;
  hn: string;
  vn: string;
  df_amount: number;
  course_id?: string;
  note?: string;
  created_by?: string;
}

export interface CreateDfResponse {
  status: string;
  df_id: number;
  doctor_code: string;
  vn: string;
  df_amount: number;
  approval_status: DfApprovalStatus | string;
  [key: string]: unknown;
}

export interface ApproveDfBody {
  approved_by: string;
}

export interface ApproveDfResponse {
  status: string;
  df_id: number;
  approved_by: string;
  [key: string]: unknown;
}

export interface ApproveDfByVnBody {
  vn: string;
  approved_by: string;
}

export interface ApproveDfByVnResponse {
  status: string;
  vn: string;
  approved_by: string;
  approved_count: number;
  approved_df_ids: number[];
  [key: string]: unknown;
}

export interface ReverseDfBody {
  note: string;
  created_by?: string;
}

export interface ReverseDfResponse {
  status: string;
  reversal_df_id: number;
  reversed_df_id: number;
  amount: number;
  result_status: DfApprovalStatus | string;
  [key: string]: unknown;
}

export interface DfMissingRow {
  vn: string;
  hn: string;
  status: string | null;
  visitdate: string | null;
  checkout_date: string | null;
  has_doctor_encounter: boolean;
  deduct_entries: number;
  no_df_confirmed: boolean;
  [key: string]: unknown;
}

export interface ListDfMissingParams {
  date?: string;
}

export interface ListDfMissingResponse {
  status: string;
  date: string;
  total_found: number;
  data: DfMissingRow[];
}

export interface DfSuggestCandidate {
  doctor_code: string;
  doctor_pname: string | null;
  doctor_firstname: string | null;
  doctor_lastname: string | null;
  sources: string[];
  last_df_amount: number | null;
  [key: string]: unknown;
}

export interface SuggestDfResponse {
  status: string;
  vn: string;
  hn: string;
  has_df: boolean;
  candidates: DfSuggestCandidate[];
}

export interface DfSummaryParams {
  date_from?: string;
  date_to?: string;
  doctor_code?: string;
}

export interface DfSummaryRow {
  doctor_code: string;
  doctor_pname: string | null;
  doctor_firstname: string | null;
  doctor_lastname: string | null;
  total_df: number;
  earn_entries: number;
  reversal_entries: number;
  [key: string]: unknown;
}

export interface DfSummaryResponse {
  status: string;
  total_doctors: number;
  data: DfSummaryRow[];
}

export interface DfMonthlySummaryParams {
  doctor_code: string;
  month: string;
}

export interface DfMonthlyEntry {
  df_id: number;
  hn: string;
  vn: string;
  df_amount: number;
  source_type: DfSourceType | string;
  source_ref: string | null;
  course_id: string | null;
  note: string | null;
  created_date: string;
  created_by: string | null;
  approved_by: string | null;
  approved_date: string | null;
  [key: string]: unknown;
}

export interface DfMonthlySummaryResponse {
  status: string;
  doctor_code: string;
  doctor_pname: string | null;
  doctor_firstname: string | null;
  doctor_lastname: string | null;
  month: string;
  total_df: number;
  earn_entries: number;
  reversal_entries: number;
  visit_count: number;
  total_entries: number;
  entries: DfMonthlyEntry[];
}

export async function listDf(params: ListDfParams = {}): Promise<ListDfResponse> {
  return apiFetch<ListDfResponse>(`/df${buildQuery(params)}`);
}

export async function listDfMissing(
  params: ListDfMissingParams = {}
): Promise<ListDfMissingResponse> {
  return apiFetch<ListDfMissingResponse>(`/df/missing${buildQuery(params)}`);
}

export async function suggestDf(vn: string): Promise<SuggestDfResponse> {
  return apiFetch<SuggestDfResponse>(`/df/suggest${buildQuery({ vn })}`);
}

export async function getDfSummary(
  params: DfSummaryParams = {}
): Promise<DfSummaryResponse> {
  return apiFetch<DfSummaryResponse>(`/df/summary${buildQuery(params)}`);
}

export async function getDfMonthlySummary(
  params: DfMonthlySummaryParams
): Promise<DfMonthlySummaryResponse> {
  return apiFetch<DfMonthlySummaryResponse>(`/df/summary/monthly${buildQuery(params)}`);
}

export async function createDf(body: CreateDfBody): Promise<CreateDfResponse> {
  return apiFetch<CreateDfResponse>("/df", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function reverseDf(
  dfId: number,
  body: ReverseDfBody
): Promise<ReverseDfResponse> {
  return apiFetch<ReverseDfResponse>(`/df/${dfId}/reverse`, {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function approveDf(
  dfId: number,
  body: ApproveDfBody
): Promise<ApproveDfResponse> {
  return apiFetch<ApproveDfResponse>(`/df/${dfId}/approve`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function approveDfByVn(
  body: ApproveDfByVnBody
): Promise<ApproveDfByVnResponse> {
  return apiFetch<ApproveDfByVnResponse>("/df/approve-by-vn", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export { ApiError } from "@/lib/api";
