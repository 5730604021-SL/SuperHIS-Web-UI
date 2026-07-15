"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Card,
  ErrorBox,
  Field,
  PageHeader,
  btnPrimaryCls,
  btnSecondaryCls,
  inputCls,
  selectCls,
} from "@/components/ui";
import { ApiError, registerDoctor } from "@/lib/api/doctors";

const PNAME_OPTIONS = ["นพ.", "พญ.", "นาย", "นาง", "นางสาว"];

const emptyForm = {
  pname: "นพ.",
  firstname: "",
  lastname: "",
  doctor_code: "",
  gender: "",
  ward: "",
  phone_no: "",
  address: "",
  note: "",
  df_cap: "",
};

type FormState = typeof emptyForm;

export default function NewDoctorPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.pname || !form.firstname || !form.lastname) {
      return "กรุณากรอกคำนำหน้า ชื่อ และนามสกุล";
    }
    if (!form.doctor_code) {
      return "กรุณากรอกรหัสแพทย์";
    }
    if (!form.gender) {
      return "กรุณาเลือกเพศ";
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
      const res = await registerDoctor({
        pname: form.pname,
        firstname: form.firstname,
        lastname: form.lastname,
        doctor_code: form.doctor_code,
        gender: Number(form.gender),
        ward: form.ward || undefined,
        phone_no: form.phone_no || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
        df_cap: form.df_cap ? Number(form.df_cap) : undefined,
      });
      setCreatedCode(res.doctor_code ?? form.doctor_code);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถลงทะเบียนแพทย์ได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNext() {
    setForm(emptyForm);
    setCreatedCode(null);
    setError(null);
  }

  if (createdCode) {
    return (
      <AppShell>
        <PageHeader title="ลงทะเบียนแพทย์ใหม่" />
        <Card className="mx-auto max-w-md text-center">
          <p className="mb-2 text-lg font-semibold text-emerald-700">
            ลงทะเบียนสำเร็จ
          </p>
          <p className="mb-6 text-2xl font-bold text-teal-700">
            รหัสแพทย์: {createdCode}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/doctors" className={btnPrimaryCls}>
              ดูรายชื่อแพทย์
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
      <PageHeader title="ลงทะเบียนแพทย์ใหม่" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              ข้อมูลแพทย์
            </h2>
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
              <Field label="รหัสแพทย์" required>
                <input
                  type="text"
                  value={form.doctor_code}
                  onChange={(e) => update("doctor_code", e.target.value)}
                  className={inputCls}
                />
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
              <Field label="แผนก/หอผู้ป่วย">
                <input
                  type="text"
                  value={form.ward}
                  onChange={(e) => update("ward", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="เบอร์โทรศัพท์">
                <input
                  type="text"
                  value={form.phone_no}
                  onChange={(e) => update("phone_no", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="เพดาน DF ต่อรายการ (บาท)"
                hint={'เว้นว่าง = ไม่จำกัด, แก้ไขได้ทีหลังผ่าน "แก้ไข DF Cap"'}
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.df_cap}
                  onChange={(e) => update("df_cap", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section>
            <Field label="ที่อยู่">
              <textarea
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>
          </section>

          <section>
            <Field label="หมายเหตุ">
              <textarea
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end gap-2">
            <Link href="/doctors" className={btnSecondaryCls}>
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={btnPrimaryCls}
            >
              {loading ? "กำลังบันทึก..." : "ลงทะเบียน"}
            </button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
