"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  ErrorBox,
  Field,
  PageHeader,
  SuccessBox,
  btnPrimaryCls,
  btnSecondaryCls,
  inputCls,
  selectCls,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  STAFF_ROLE_OPTIONS,
  StaffCreateBody,
  StaffRole,
  createStaff,
} from "@/lib/api/staff";

const PNAME_OPTIONS = ["นาย", "นาง", "นางสาว"];

const emptyForm = {
  pname: "นาย",
  firstname: "",
  lastname: "",
  role: "" as StaffRole | "",
  gender: "",
  doctor_code: "",
  department: "",
  phone_no: "",
  email: "",
  address: "",
  note: "",
};

type FormState = typeof emptyForm;

export default function NewStaffPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    staff_id: number;
    staff_code: string;
  } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.pname || !form.firstname || !form.lastname) {
      return "กรุณาระบุคำนำหน้า ชื่อ และนามสกุล";
    }
    if (!form.role) {
      return "กรุณาเลือกตำแหน่งงาน";
    }
    if (!form.gender) {
      return "กรุณาเลือกเพศ";
    }
    if (form.role === "doctor" && !form.doctor_code) {
      return "ตำแหน่งแพทย์ต้องระบุ doctor_code";
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
      const body: StaffCreateBody = {
        pname: form.pname,
        firstname: form.firstname,
        lastname: form.lastname,
        role: form.role as StaffRole,
        gender: Number(form.gender),
        doctor_code: form.doctor_code || undefined,
        department: form.department || undefined,
        phone_no: form.phone_no || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
      };
      const res = await createStaff(body);
      setCreated({ staff_id: res.staff_id, staff_code: res.staff_code });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถเพิ่มบุคลากรได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNext() {
    setForm(emptyForm);
    setCreated(null);
    setError(null);
  }

  if (created) {
    return (
      <AppShell>
        <PageHeader title="เพิ่มบุคลากร" />
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <SuccessBox>เพิ่มบุคลากรสำเร็จ</SuccessBox>
          <p className="mt-4 mb-6 text-2xl font-bold text-teal-700">
            {created.staff_code}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/staff" className={btnPrimaryCls}>
              ดูรายชื่อบุคลากร
            </Link>
            <button onClick={handleResetForNext} className={btnSecondaryCls}>
              เพิ่มคนถัดไป
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="เพิ่มบุคลากร" />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="คำนำหน้า" required>
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
          <Field label="ชื่อ" required>
            <input
              type="text"
              value={form.firstname}
              onChange={(e) => update("firstname", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="นามสกุล" required>
            <input
              type="text"
              value={form.lastname}
              onChange={(e) => update("lastname", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ตำแหน่งงาน" required>
            <select
              value={form.role}
              onChange={(e) =>
                update("role", e.target.value as StaffRole | "")
              }
              className={selectCls}
            >
              <option value="">- เลือกตำแหน่ง -</option>
              {STAFF_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="เพศ" required>
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
          {form.role === "doctor" && (
            <Field
              label="รหัสแพทย์ (doctor_code)"
              required
              hint="ต้อง register หมอไว้แล้วผ่าน POST /doctor/register"
            >
              <input
                type="text"
                value={form.doctor_code}
                onChange={(e) => update("doctor_code", e.target.value)}
                className={inputCls}
              />
            </Field>
          )}
          <Field label="แผนก">
            <input
              type="text"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              className={inputCls}
              placeholder="เช่น OPD, ห้องยา, การเงิน"
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
          <Field label="อีเมล">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="ที่อยู่">
          <textarea
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>

        <Field label="หมายเหตุ">
          <textarea
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>

        {error && <ErrorBox message={error} />}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className={btnPrimaryCls}>
            {loading ? "กำลังบันทึก..." : "เพิ่มบุคลากร"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
