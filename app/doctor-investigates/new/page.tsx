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
} from "@/components/ui";
import { ApiError, createDoctorInvestigate } from "@/lib/api/doctors";

const emptyForm = {
  encounter_id: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  note: "",
  created_by: "",
};

type FormState = typeof emptyForm;

export default function NewDoctorInvestigatePage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.encounter_id) {
      return "กรุณากรอก Encounter ID";
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
      const res = await createDoctorInvestigate({
        encounter_id: Number(form.encounter_id),
        subjective: form.subjective || undefined,
        objective: form.objective || undefined,
        assessment: form.assessment || undefined,
        plan: form.plan || undefined,
        note: form.note || undefined,
        created_by: form.created_by || undefined,
      });
      setCreatedId(res.investigate_id ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถบันทึกผลตรวจได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNext() {
    setForm(emptyForm);
    setCreatedId(null);
    setError(null);
  }

  if (createdId !== null) {
    return (
      <AppShell>
        <PageHeader title="บันทึกผลตรวจ (SOAP Note)" />
        <Card className="mx-auto max-w-md text-center">
          <p className="mb-2 text-lg font-semibold text-emerald-700">
            บันทึกผลตรวจสำเร็จ
          </p>
          <p className="mb-6 text-2xl font-bold text-teal-700">
            Investigate ID: {createdId}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/doctor-investigates" className={btnPrimaryCls}>
              ดูรายการผลตรวจ
            </Link>
            <button onClick={handleResetForNext} className={btnSecondaryCls}>
              บันทึกรายการถัดไป
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="บันทึกผลตรวจ (SOAP Note)"
        subtitle="ผูกกับ encounter_id ของการตรวจ — เนื้อหาแต่ละช่องเป็น freetext"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Encounter ID" required>
              <input
                type="number"
                value={form.encounter_id}
                onChange={(e) => update("encounter_id", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="บันทึกโดย (doctor_code)">
              <input
                type="text"
                value={form.created_by}
                onChange={(e) => update("created_by", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="S — Subjective (อาการ/สิ่งที่ผู้ป่วยบอกเล่า)">
            <textarea
              value={form.subjective}
              onChange={(e) => update("subjective", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <Field label="O — Objective (สิ่งที่แพทย์ตรวจพบ)">
            <textarea
              value={form.objective}
              onChange={(e) => update("objective", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <Field label="A — Assessment (การประเมิน/วินิจฉัย)">
            <textarea
              value={form.assessment}
              onChange={(e) => update("assessment", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <Field label="P — Plan (แผนการรักษา)">
            <textarea
              value={form.plan}
              onChange={(e) => update("plan", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <Field label="หมายเหตุเพิ่มเติม">
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end gap-2">
            <Link href="/doctor-investigates" className={btnSecondaryCls}>
              ยกเลิก
            </Link>
            <button type="submit" disabled={loading} className={btnPrimaryCls}>
              {loading ? "กำลังบันทึก..." : "บันทึกผลตรวจ"}
            </button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
