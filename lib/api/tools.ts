// Typed client for the clinical-tool / tool-usage / courses module.
// All requests go through the shared apiFetch helper — see docs/CONVENTIONS.md.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Clinical Tool                                                      */
/* ------------------------------------------------------------------ */

export type ClinicalToolStatus = "active" | "maintenance" | "retired";

export interface ClinicalTool {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  location: string | null;
  status: ClinicalToolStatus | string;
  purchase_date: string | null;
  warranty_expire_date: string | null;
  note: string | null;
  created_date?: string;
  [key: string]: unknown;
}

export interface ListClinicalToolsParams {
  tool_code?: string;
  tool_name?: string;
  category?: string;
  brand?: string;
  serial_no?: string;
  location?: string;
  status?: ClinicalToolStatus | "";
  warranty_expire_before?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListClinicalToolsResponse {
  status: string;
  total_found: number;
  data: ClinicalTool[];
}

export interface GetClinicalToolResponse {
  status: string;
  data: ClinicalTool;
  [key: string]: unknown;
}

export interface ClinicalToolRegisterBody {
  tool_name: string;
  category?: string;
  brand?: string;
  model?: string;
  serial_no?: string;
  location?: string;
  purchase_date?: string;
  warranty_expire_date?: string;
  note?: string;
}

export interface RegisterClinicalToolResponse {
  status: string;
  tool_id: number;
  tool_code: string;
  [key: string]: unknown;
}

export async function listClinicalTools(
  params: ListClinicalToolsParams = {}
): Promise<ListClinicalToolsResponse> {
  return apiFetch<ListClinicalToolsResponse>(
    `/clinical-tool${buildQuery({ ...params })}`
  );
}

export async function getClinicalTool(
  toolId: number
): Promise<GetClinicalToolResponse> {
  return apiFetch<GetClinicalToolResponse>(`/clinical-tool/${toolId}`);
}

export async function registerClinicalTool(
  body: ClinicalToolRegisterBody
): Promise<RegisterClinicalToolResponse> {
  return apiFetch<RegisterClinicalToolResponse>("/clinical-tool/register", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

/* ------------------------------------------------------------------ */
/* Tool Usage                                                         */
/* ------------------------------------------------------------------ */

export interface ToolUsage {
  usage_id: number;
  tool_id: number;
  tool_code: string;
  tool_name?: string | null;
  vn: string;
  encounter_id: number;
  hn?: string | null;
  doctor_code: string;
  staff_code: string;
  inv_id: number;
  used_date: string | null;
  usage_detail: string | null;
  note: string | null;
  status: string;
  created_date?: string;
  voided_date?: string | null;
  [key: string]: unknown;
}

export interface ListToolUsageParams {
  vn?: string;
  hn?: string;
  encounter_id?: number;
  tool_id?: number;
  tool_code?: string;
  doctor_code?: string;
  staff_code?: string;
  inv_id?: number;
  include_voided?: boolean;
  used_from?: string;
  used_to?: string;
  created_from?: string;
  created_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListToolUsageResponse {
  status: string;
  total_found: number;
  data: ToolUsage[];
}

export interface GetToolUsageResponse {
  status: string;
  data: ToolUsage;
  [key: string]: unknown;
}

export interface ToolUsageCreateBody {
  tool_code: string;
  vn: string;
  encounter_id: number;
  doctor_code: string;
  staff_code: string;
  inv_id: number;
  used_date?: string;
  usage_detail?: string;
  note?: string;
}

export interface CreateToolUsageResponse {
  status: string;
  usage_id: number;
  [key: string]: unknown;
}

export interface VoidToolUsageResponse {
  status: string;
  [key: string]: unknown;
}

export async function listToolUsages(
  params: ListToolUsageParams = {}
): Promise<ListToolUsageResponse> {
  return apiFetch<ListToolUsageResponse>(
    `/tool-usage${buildQuery({ ...params })}`
  );
}

export async function getToolUsage(
  usageId: number
): Promise<GetToolUsageResponse> {
  return apiFetch<GetToolUsageResponse>(`/tool-usage/${usageId}`);
}

export async function createToolUsage(
  body: ToolUsageCreateBody
): Promise<CreateToolUsageResponse> {
  return apiFetch<CreateToolUsageResponse>("/tool-usage", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function voidToolUsage(
  usageId: number
): Promise<VoidToolUsageResponse> {
  return apiFetch<VoidToolUsageResponse>(`/tool-usage/${usageId}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

// Shape returned for each row in GET /courses' nested "items" array — joined from
// his_course_detail (product_id is int4 there) + product name from Odoo. This differs
// from the register request shape (see CourseItemInput below, product_id is a string
// per schemas/course.py CourseItemDetail).
export interface CourseItemDetail {
  product_id: number;
  quantity: number | null;
  status?: string | null;
  product_name?: string | null;
  [key: string]: unknown;
}

// Shape accepted by POST /courses/register items[] (schemas/course.py CourseItemDetail
// — product_id is a str there, unlike the int returned in list responses above).
export interface CourseItemInput {
  product_id: string;
  quantity: number;
  status?: string;
}

// his_course has no created_date column — "SELECT * FROM his_course" never returns one.
export interface Course {
  course_id: string;
  name: string;
  bussiness_course_id: string;
  startdate: string;
  expiredate: string | null;
  status: string;
  price: number | null;
  course_detail: string | null;
  note: string | null;
  tag: string[] | null;
  items: CourseItemDetail[];
  [key: string]: unknown;
}

export interface ListCoursesParams {
  course_id?: string;
  bussiness_course_id?: string;
  name?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListCoursesResponse {
  status: string;
  total_found: number;
  data: Course[];
}

export interface CourseRegisterBody {
  course_id: string;
  name: string;
  bussiness_course_id: string;
  startdate: string;
  expiredate?: string;
  status?: string;
  price: number;
  course_detail?: string;
  note?: string;
  tag?: string[];
  items: CourseItemInput[];
}

export interface RegisterCourseResponse {
  status: string;
  course_id: string;
  [key: string]: unknown;
}

export async function listCourses(
  params: ListCoursesParams = {}
): Promise<ListCoursesResponse> {
  return apiFetch<ListCoursesResponse>(`/courses${buildQuery({ ...params })}`);
}

export async function registerCourse(
  body: CourseRegisterBody
): Promise<RegisterCourseResponse> {
  const { items, ...rest } = body;
  const payload = {
    ...cleanBody(rest),
    items: items.map((item) => cleanBody(item)),
  };
  return apiFetch<RegisterCourseResponse>("/courses/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { ApiError } from "@/lib/api";
