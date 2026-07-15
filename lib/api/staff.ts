// Typed client for the Staff + User Login module.
// Endpoints: /staff, /staff/{staff_id}, /user-login, /user-login/{user_id},
// /user-login/roles, /user-login/verify

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";

export type StaffRole =
  | "doctor"
  | "nurse"
  | "nurse_aide"
  | "pharmacist"
  | "therapist"
  | "receptionist"
  | "cashier"
  | "admin"
  | "other";

export type StaffStatus = "active" | "inactive";

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "doctor", label: "แพทย์" },
  { value: "nurse", label: "พยาบาล" },
  { value: "nurse_aide", label: "ผู้ช่วยพยาบาล" },
  { value: "pharmacist", label: "เภสัชกร" },
  { value: "therapist", label: "นักกายภาพบำบัด" },
  { value: "receptionist", label: "พนักงานต้อนรับ" },
  { value: "cashier", label: "แคชเชียร์/การเงิน" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
  { value: "other", label: "อื่นๆ" },
];

export function staffRoleLabel(role: string | null | undefined): string {
  const found = STAFF_ROLE_OPTIONS.find((o) => o.value === role);
  return found ? found.label : role ?? "-";
}

export interface Staff {
  staff_id: number;
  staff_code: string;
  pname: string;
  firstname: string;
  lastname: string;
  role: StaffRole;
  gender: number | null;
  doctor_code: string | null;
  department: string | null;
  phone_no: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  status: StaffStatus;
  created_date: string | null;
  resign_date: string | null;
  doctor?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ListStaffParams {
  staff_id?: number;
  staff_code?: string;
  pname?: string;
  firstname?: string;
  lastname?: string;
  role?: StaffRole;
  department?: string;
  gender?: number;
  phone_no?: string;
  email?: string;
  doctor_code?: string;
  include_inactive?: boolean;
  created_from?: string;
  created_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListStaffResponse {
  status: string;
  total_found: number;
  data: Staff[];
}

export interface StaffCreateBody {
  pname: string;
  firstname: string;
  lastname: string;
  role: StaffRole;
  gender: number;
  doctor_code?: string;
  department?: string;
  phone_no?: string;
  email?: string;
  address?: string;
  note?: string;
}

export interface StaffUpdateBody {
  pname?: string;
  firstname?: string;
  lastname?: string;
  role?: StaffRole;
  doctor_code?: string;
  department?: string;
  gender?: number;
  phone_no?: string;
  email?: string;
  address?: string;
  note?: string;
  status?: StaffStatus;
}

export interface CreateStaffResponse {
  status: string;
  staff_id: number;
  staff_code: string;
  [key: string]: unknown;
}

export interface GetStaffResponse {
  status: string;
  data: Staff;
  [key: string]: unknown;
}

export interface MutateStaffResponse {
  status: string;
  [key: string]: unknown;
}

export async function listStaff(
  params: ListStaffParams = {}
): Promise<ListStaffResponse> {
  return apiFetch<ListStaffResponse>(`/staff${buildQuery(params)}`);
}

export async function getStaff(staffId: number): Promise<GetStaffResponse> {
  return apiFetch<GetStaffResponse>(`/staff/${staffId}`);
}

export async function createStaff(
  body: StaffCreateBody
): Promise<CreateStaffResponse> {
  return apiFetch<CreateStaffResponse>("/staff", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateStaff(
  staffId: number,
  body: StaffUpdateBody
): Promise<MutateStaffResponse> {
  return apiFetch<MutateStaffResponse>(`/staff/${staffId}`, {
    method: "PUT",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function deleteStaff(
  staffId: number
): Promise<MutateStaffResponse> {
  return apiFetch<MutateStaffResponse>(`/staff/${staffId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// User Login
// ---------------------------------------------------------------------------

export type UserLoginStatus = "active" | "inactive";

export interface UserLogin {
  user_id: number;
  username: string;
  staff_code: string;
  user_role: string;
  status: UserLoginStatus;
  created_date: string | null;
  last_login: string | null;
  staff?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ListUserLoginsParams {
  username?: string;
  staff_code?: string;
  user_role?: "superuser";
  include_inactive?: boolean;
  created_from?: string;
  created_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListUserLoginsResponse {
  status: string;
  total_found: number;
  data: UserLogin[];
}

export interface UserLoginCreateBody {
  username: string;
  password: string;
  staff_code: string;
  user_role?: "superuser";
}

export interface UserLoginUpdateBody {
  username?: string;
  password?: string;
  user_role?: "superuser";
  status?: UserLoginStatus;
}

export interface UserLoginVerifyBody {
  username: string;
  password: string;
}

export interface CreateUserLoginResponse {
  status: string;
  user_id: number;
  username: string;
  [key: string]: unknown;
}

export interface GetUserLoginResponse {
  status: string;
  data: UserLogin;
  [key: string]: unknown;
}

export interface MutateUserLoginResponse {
  status: string;
  [key: string]: unknown;
}

export interface VerifyUserLoginResponse {
  status: string;
  data: UserLogin;
  [key: string]: unknown;
}

export interface UserRoleInfo {
  user_role: string;
  description?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface UserRolesResponse {
  status: string;
  data: UserRoleInfo[];
  [key: string]: unknown;
}

export async function listUserLogins(
  params: ListUserLoginsParams = {}
): Promise<ListUserLoginsResponse> {
  return apiFetch<ListUserLoginsResponse>(`/user-login${buildQuery(params)}`);
}

export async function getUserLogin(
  userId: number
): Promise<GetUserLoginResponse> {
  return apiFetch<GetUserLoginResponse>(`/user-login/${userId}`);
}

export async function getUserRoles(): Promise<UserRolesResponse> {
  return apiFetch<UserRolesResponse>("/user-login/roles");
}

export async function createUserLogin(
  body: UserLoginCreateBody
): Promise<CreateUserLoginResponse> {
  return apiFetch<CreateUserLoginResponse>("/user-login", {
    method: "POST",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function updateUserLogin(
  userId: number,
  body: UserLoginUpdateBody
): Promise<MutateUserLoginResponse> {
  return apiFetch<MutateUserLoginResponse>(`/user-login/${userId}`, {
    method: "PUT",
    body: JSON.stringify(cleanBody(body)),
  });
}

export async function deleteUserLogin(
  userId: number
): Promise<MutateUserLoginResponse> {
  return apiFetch<MutateUserLoginResponse>(`/user-login/${userId}`, {
    method: "DELETE",
  });
}

export async function verifyUserLogin(
  body: UserLoginVerifyBody
): Promise<VerifyUserLoginResponse> {
  return apiFetch<VerifyUserLoginResponse>("/user-login/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export { ApiError } from "@/lib/api";
