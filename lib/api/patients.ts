// Typed API client for the "patients" module.
// Wraps the core client (@/lib/api) for GET/POST /patient, and adds the
// endpoints the core client doesn't cover: PUT /patient/{hn}, GET /partners,
// POST /partners/register/{hn}. Do not edit @/lib/api — see docs/CONVENTIONS.md.

import { apiFetch, buildQuery, cleanBody } from "@/lib/api";
import type {
  Patient as CorePatient,
  ListPatientsParams,
  ListPatientsResponse,
  CreatePatientBody,
  CreatePatientResponse,
} from "@/lib/api";
import {
  listPatients as coreListPatients,
  createPatient as coreCreatePatient,
} from "@/lib/api";

export type {
  ListPatientsParams,
  ListPatientsResponse,
  CreatePatientBody,
  CreatePatientResponse,
};

/**
 * Patient record. Extends the core shape with fields the core client's
 * `Patient` interface doesn't declare explicitly but the backend schema
 * (PatientCreate/PatientUpdate) includes.
 */
export interface Patient extends CorePatient {
  profile_pic_url?: string | null;
  uid?: string | null;
}

// ---- GET /patient --------------------------------------------------------
/** Search/list patients (hn/uid/idcard_no/phone_no exact match, firstname/lastname partial match). */
export const listPatients = coreListPatients;

// ---- POST /patient --------------------------------------------------------
/** Create a new patient. */
export const createPatient = coreCreatePatient;

// ---- PUT /patient/{hn} ------------------------------------------------------
export interface UpdatePatientBody {
  pname?: string;
  firstname?: string;
  lastname?: string;
  idcard_no?: string;
  passport_no?: string;
  gender?: number;
  phone_no?: string;
  profile_pic_url?: string;
  nationallity?: string;
  birthdate?: string;
  uid?: string;
  status?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  note?: string;
}

export interface UpdatePatientResponse {
  status: string;
  [key: string]: unknown;
}

export async function updatePatient(
  hn: string,
  body: UpdatePatientBody
): Promise<UpdatePatientResponse> {
  return apiFetch<UpdatePatientResponse>(`/patient/${encodeURIComponent(hn)}`, {
    method: "PUT",
    body: JSON.stringify(cleanBody(body)),
  });
}

// ---- GET /partners ----------------------------------------------------------
// res.partner is read via Odoo XML-RPC — unset Char fields serialize as `false`,
// not `null`. Backend (routers/odoo/partners.py) returns only {status, data}, no
// total count.
export interface Partner {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
}

export interface ListPartnersParams {
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ListPartnersResponse {
  status: string;
  data: Partner[];
}

export async function listPartners(
  params: ListPartnersParams = {}
): Promise<ListPartnersResponse> {
  return apiFetch<ListPartnersResponse>(`/partners${buildQuery(params)}`);
}

// ---- POST /partners/register/{hn} -------------------------------------------
export interface RegisterPartnerResponse {
  status: string;
  hn?: string;
  partner_id?: number;
  odoo_partner_id?: number;
  [key: string]: unknown;
}

export async function registerPartner(
  hn: string
): Promise<RegisterPartnerResponse> {
  return apiFetch<RegisterPartnerResponse>(
    `/partners/register/${encodeURIComponent(hn)}`,
    { method: "POST" }
  );
}

export { ApiError } from "@/lib/api";
