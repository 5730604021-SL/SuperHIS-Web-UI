"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import { createPatient, CreatePatientBody } from "@/lib/api/patients";
import {
  PageHeader,
  Card,
  Field,
  ErrorBox,
  SuccessBox,
  inputCls,
  selectCls,
  btnPrimaryCls,
  btnSecondaryCls,
} from "@/components/ui";

const PNAME_OPTIONS = ["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."];

const emptyForm = {
  pname: "นาย",
  firstname: "",
  lastname: "",
  idcard_no: "",
  gender: "",
  birthdate: "",
  phone_no: "",
  nationallity: "ไทย",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  note: "",
};

type FormState = typeof emptyForm;

export default function NewPatientPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdHn, setCreatedHn] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (form.idcard_no && form.idcard_no.length !== 13) {
      return "เลขบัตรประชาชนต้องมี 13 หลัก";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const body: CreatePatientBody = {
        pname: form.pname || undefined,
        firstname: form.firstname || undefined,
        lastname: form.lastname || undefined,
        idcard_no: form.idcard_no || undefined,
        gender: form.gender ? Number(form.gender) : undefined,
        birthdate: form.birthdate || undefined,
        phone_no: form.phone_no || undefined,
        nationallity: form.nationallity || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        postal_code: form.postal_code || undefined,
        note: form.note || undefined,
      };
      const res = await createPatient(body);
      setCreatedHn(res.hn);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถลงทะเบียนผู้ป่วยได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNext() {
    setForm(emptyForm);
    setCreatedHn(null);
    setError(null);
  }

  if (createdHn) {
    return (
      <AppShell>
        <PageHeader title="ลงทะเบียนผู้ป่วยใหม่" />
        <Card className="mx-auto max-w-md text-center">
          <SuccessBox>ลงทะเบียนสำเร็จ</SuccessBox>
          <p className="my-6 text-2xl font-bold text-teal-700">
            HN: {createdHn}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/patients" className={btnPrimaryCls}>
              ดูรายชื่อผู้ป่วย
            </Link>
            <button onClick={handleResetForNext} className={btnSecondaryCls}>
              ลงทะเบียนคนถัดไป
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="ลงทะเบียนผู้ป่วยใหม่" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
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
          </div>
        </Card>

        <Card>
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
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">อื่นๆ</h2>
          <Field label="หมายเหตุ">
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
        </Card>

        {error && <ErrorBox message={error} />}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className={btnPrimaryCls}>
            {loading ? "กำลังบันทึก..." : "ลงทะเบียน"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
