"use client";

import { ReactNode, useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import {
  listPatients,
  updatePatient,
  registerPartner,
  Patient,
  UpdatePatientBody,
} from "@/lib/api/patients";
import {
  PageHeader,
  Card,
  Badge,
  statusTone,
  Field,
  ErrorBox,
  SuccessBox,
  LoadingBox,
  EmptyBox,
  Modal,
  inputCls,
  selectCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDate,
  formatDateTime,
  formatGender,
} from "@/components/ui";

const PNAME_OPTIONS = ["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."];

interface FormState {
  pname: string;
  firstname: string;
  lastname: string;
  idcard_no: string;
  passport_no: string;
  gender: string;
  phone_no: string;
  profile_pic_url: string;
  nationallity: string;
  birthdate: string;
  uid: string;
  status: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  note: string;
}

function toFormState(p: Patient): FormState {
  return {
    pname: p.pname ?? "",
    firstname: p.firstname ?? "",
    lastname: p.lastname ?? "",
    idcard_no: p.idcard_no ?? "",
    passport_no: p.passport_no ?? "",
    gender: p.gender != null ? String(p.gender) : "",
    phone_no: p.phone_no ?? "",
    profile_pic_url: p.profile_pic_url ?? "",
    nationallity: p.nationallity ?? "",
    birthdate: p.birthdate ? p.birthdate.slice(0, 10) : "",
    uid: p.uid ?? "",
    status: p.status ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    province: p.province ?? "",
    postal_code: p.postal_code ?? "",
    note: p.note ?? "",
  };
}

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "-"}</dd>
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ hn: string }>();
  const hn = Array.isArray(params.hn) ? params.hn[0] ?? "" : params.hn ?? "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registeredId, setRegisteredId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!hn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listPatients({ hn });
      setPatient(res.data[0] ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลผู้ป่วยได้"
      );
    } finally {
      setLoading(false);
    }
  }, [hn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function startEdit() {
    if (!patient) return;
    setForm(toFormState(patient));
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSaveError(null);
    setSaving(true);
    try {
      const body: UpdatePatientBody = {
        pname: form.pname || undefined,
        firstname: form.firstname || undefined,
        lastname: form.lastname || undefined,
        idcard_no: form.idcard_no || undefined,
        passport_no: form.passport_no || undefined,
        gender: form.gender ? Number(form.gender) : undefined,
        phone_no: form.phone_no || undefined,
        profile_pic_url: form.profile_pic_url || undefined,
        nationallity: form.nationallity || undefined,
        birthdate: form.birthdate || undefined,
        uid: form.uid || undefined,
        status: form.status || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        postal_code: form.postal_code || undefined,
        note: form.note || undefined,
      };
      await updatePatient(hn, body);
      setEditing(false);
      await load();
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setSaving(false);
    }
  }

  function openRegisterModal() {
    setRegisterError(null);
    setRegisteredId(null);
    setRegisterOpen(true);
  }

  async function handleRegisterPartner() {
    setRegistering(true);
    setRegisterError(null);
    try {
      const res = await registerPartner(hn);
      const rawId =
        res.partner_id ??
        res.odoo_partner_id ??
        (typeof res.id === "number" ? res.id : undefined);
      setRegisteredId(typeof rawId === "number" ? rawId : null);
    } catch (err) {
      setRegisterError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถลงทะเบียน Odoo Partner ได้"
      );
    } finally {
      setRegistering(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={`ข้อมูลผู้ป่วย ${hn}`}
        subtitle={
          patient
            ? `${patient.pname ?? ""}${patient.firstname ?? ""} ${
                patient.lastname ?? ""
              }`.trim()
            : undefined
        }
        actions={
          <>
            <Link href="/patients" className={btnSecondaryCls}>
              กลับไปรายชื่อผู้ป่วย
            </Link>
            {patient && !editing && (
              <>
                <button onClick={openRegisterModal} className={btnSecondaryCls}>
                  ลงทะเบียน Odoo Partner
                </button>
                <button onClick={startEdit} className={btnPrimaryCls}>
                  แก้ไขข้อมูล
                </button>
              </>
            )}
          </>
        }
      />

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && !patient && (
        <EmptyBox text={`ไม่พบข้อมูลผู้ป่วย HN ${hn}`} />
      )}

      {!loading && !error && patient && !editing && (
        <Card>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoRow label="HN" value={patient.hn} />
            <InfoRow label="คำนำหน้า" value={patient.pname} />
            <InfoRow label="ชื่อ" value={patient.firstname} />
            <InfoRow label="นามสกุล" value={patient.lastname} />
            <InfoRow label="เพศ" value={formatGender(patient.gender)} />
            <InfoRow label="วันเกิด" value={formatDate(patient.birthdate)} />
            <InfoRow label="เลขบัตรประชาชน" value={patient.idcard_no} />
            <InfoRow label="เลขพาสปอร์ต" value={patient.passport_no} />
            <InfoRow label="สัญชาติ" value={patient.nationallity} />
            <InfoRow label="เบอร์โทร" value={patient.phone_no} />
            <InfoRow label="UID" value={patient.uid} />
            <InfoRow
              label="สถานะ"
              value={
                <Badge tone={statusTone(patient.status)}>{patient.status}</Badge>
              }
            />
            <InfoRow
              label="ที่อยู่"
              value={patient.address}
              className="sm:col-span-3"
            />
            <InfoRow label="เมือง/อำเภอ" value={patient.city} />
            <InfoRow label="จังหวัด" value={patient.province} />
            <InfoRow label="รหัสไปรษณีย์" value={patient.postal_code} />
            <InfoRow
              label="รูปโปรไฟล์ (URL)"
              value={patient.profile_pic_url}
              className="sm:col-span-3"
            />
            <InfoRow
              label="หมายเหตุ"
              value={patient.note}
              className="sm:col-span-3"
            />
            <InfoRow label="วันที่สร้าง" value={formatDateTime(patient.createddate)} />
          </dl>
        </Card>
      )}

      {!loading && !error && patient && editing && form && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-600">
                ข้อมูลส่วนตัว
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="คำนำหน้า">
                  <select
                    value={form.pname}
                    onChange={(e) => update("pname", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">- ไม่ระบุ -</option>
                    {PNAME_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ชื่อ">
                  <input
                    type="text"
                    value={form.firstname}
                    onChange={(e) => update("firstname", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="นามสกุล">
                  <input
                    type="text"
                    value={form.lastname}
                    onChange={(e) => update("lastname", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="เลขบัตรประชาชน">
                  <input
                    type="text"
                    maxLength={13}
                    value={form.idcard_no}
                    onChange={(e) => update("idcard_no", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="เลขพาสปอร์ต">
                  <input
                    type="text"
                    value={form.passport_no}
                    onChange={(e) => update("passport_no", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="เพศ">
                  <select
                    value={form.gender}
                    onChange={(e) => update("gender", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">- ไม่ระบุ -</option>
                    <option value="1">ชาย</option>
                    <option value="2">หญิง</option>
                  </select>
                </Field>
                <Field label="วันเกิด">
                  <input
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => update("birthdate", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="เบอร์โทร">
                  <input
                    type="text"
                    value={form.phone_no}
                    onChange={(e) => update("phone_no", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="สัญชาติ">
                  <input
                    type="text"
                    value={form.nationallity}
                    onChange={(e) => update("nationallity", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="UID">
                  <input
                    type="text"
                    value={form.uid}
                    onChange={(e) => update("uid", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="สถานะ" hint="เช่น active, inactive">
                  <input
                    type="text"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="รูปโปรไฟล์ (URL)">
                  <input
                    type="text"
                    value={form.profile_pic_url}
                    onChange={(e) => update("profile_pic_url", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-600">ที่อยู่</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Field label="ที่อยู่">
                    <textarea
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      rows={2}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="เมือง/อำเภอ">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="จังหวัด">
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => update("province", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="รหัสไปรษณีย์">
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => update("postal_code", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            <Field label="หมายเหตุ">
              <textarea
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>

            {saveError && <ErrorBox message={saveError} />}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className={btnSecondaryCls}
              >
                ยกเลิก
              </button>
              <button type="submit" disabled={saving} className={btnPrimaryCls}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Modal
        open={registerOpen}
        title="ลงทะเบียน Odoo Partner"
        onClose={() => setRegisterOpen(false)}
      >
        {registeredId !== null ? (
          <>
            <SuccessBox>
              ลงทะเบียนสำเร็จ — Partner ID: {registeredId}
            </SuccessBox>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setRegisterOpen(false)}
                className={btnSecondaryCls}
              >
                ปิด
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              ยืนยันการลงทะเบียนผู้ป่วย HN {hn} เป็น Odoo Partner หรือไม่?
            </p>
            {registerError && (
              <div className="mt-3">
                <ErrorBox message={registerError} />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRegisterOpen(false)}
                disabled={registering}
                className={btnSecondaryCls}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRegisterPartner}
                disabled={registering}
                className={btnPrimaryCls}
              >
                {registering ? "กำลังลงทะเบียน..." : "ยืนยัน"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  );
}
