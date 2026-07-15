// Typed client for the SuperHIS FastAPI backend.
// All requests go through the Next.js rewrite proxy at /api/his/*
// (see next.config.ts) so the browser never talks to localhost:8001 directly.

const BASE_PATH = "/api/his";
const TOKEN_KEY = "his_token";
const USER_KEY = "his_user";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface User {
  user_id: number;
  username: string;
  user_role: string;
  pname: string;
  firstname: string;
  lastname: string;
  staff_role: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  status: string;
  token: string;
  token_type: string;
  expires_at: string;
  user: User;
  permissions: string[];
}

export interface Patient {
  hn: string;
  pname: string;
  firstname: string;
  lastname: string;
  idcard_no: string | null;
  passport_no: string | null;
  gender: number | null;
  phone_no: string | null;
  nationallity: string | null;
  birthdate: string | null;
  status: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  note: string | null;
  createddate: string;
  [key: string]: unknown;
}

export interface ListPatientsParams {
  hn?: string;
  firstname?: string;
  lastname?: string;
  idcard_no?: string;
  phone_no?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListPatientsResponse {
  status: string;
  total_found: number;
  data: Patient[];
}

export interface CreatePatientBody {
  pname?: string;
  firstname?: string;
  lastname?: string;
  idcard_no?: string;
  passport_no?: string;
  gender?: number;
  phone_no?: string;
  nationallity?: string;
  birthdate?: string;
  status?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  note?: string;
}

export interface CreatePatientResponse {
  status: string;
  hn: string;
  odoo_partner_id: number;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Build a query string from params, skipping undefined/null/empty values. Returns "" or "?...". */
export function buildQuery<T extends object>(params: T = {} as T): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** Strip empty-string/undefined/null fields from a request body object. */
export function cleanBody<T extends object>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      out[key] = value;
    }
  });
  return out as Partial<T>;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_PATH}${path}`, {
    ...opts,
    headers,
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่");
  }

  if (!res.ok) {
    let detail = `เกิดข้อผิดพลาด (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // response had no JSON body; keep default message
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function listPatients(
  params: ListPatientsParams = {}
): Promise<ListPatientsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiFetch<ListPatientsResponse>(`/patient${qs ? `?${qs}` : ""}`);
}

export async function createPatient(
  body: CreatePatientBody
): Promise<CreatePatientResponse> {
  return apiFetch<CreatePatientResponse>("/patient", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
