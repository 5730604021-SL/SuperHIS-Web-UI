"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Card,
  ErrorBox,
  Field,
  PageHeader,
  SuccessBox,
  btnPrimaryCls,
  btnSecondaryCls,
  inputCls,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { CreateEncounterBody, createEncounter } from "@/lib/api/encounters";

const emptyForm = {
  vn: "",
  cheif_complaint: "",
  doctor_code: "",
  note: "",
  type: "",
  requestdate: "",
};

type FormState = typeof emptyForm;

export default function NewEncounterPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.vn.trim()) {
      setError("กรุณาระบุ VN");
      return;
    }

    setLoading(true);
    try {
      const body: CreateEncounterBody = {
        vn: form.vn,
        cheif_complaint: form.cheif_complaint || undefined,
        doctor_code: form.doctor_code || undefined,
        note: form.note || undefined,
        type: form.type || undefined,
        requestdate: form.requestdate
          ? new Date(form.requestdate).toISOString()
          : undefined,
      };
      const res = await createEncounter(body);
      setCreatedId(res.encounter_id ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถสร้าง encounter ได้ กรุณาลองใหม่อีกครั้ง"
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
        <PageHeader title="สร้าง Encounter" />
        <Card className="mx-auto max-w-md text-center">
          <SuccessBox>สร้าง encounter สำเร็จ</SuccessBox>
          <p className="mt-4 mb-6 text-2xl font-bold text-teal-700">
            Encounter ID: {createdId}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/encounters" className={btnPrimaryCls}>
              ดูรายการ Encounter
            </Link>
            <button onClick={handleResetForNext} className={btnSecondaryCls}>
              สร้างรายการถัดไป
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="สร้าง Encounter ใหม่" subtitle="บันทึกการพบแพทย์ต่อ visit" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="VN" required hint="เลขที่ visit — ได้จาก GET /visit">
              <input
                type="text"
                value={form.vn}
                onChange={(e) => update("vn", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="รหัสแพทย์" hint="ได้จาก GET /staff">
              <input
                type="text"
                value={form.doctor_code}
                onChange={(e) => update("doctor_code", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="ประเภท">
              <input
                type="text"
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className={inputCls}
                placeholder="เช่น OPD, IPD"
              />
            </Field>
            <Field label="วันที่ Request">
              <input
                type="datetime-local"
                value={form.requestdate}
                onChange={(e) => update("requestdate", e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Chief Complaint">
                <textarea
                  value={form.cheif_complaint}
                  onChange={(e) => update("cheif_complaint", e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="หมายเหตุ">
                <textarea
                  value={form.note}
                  onChange={(e) => update("note", e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className={btnPrimaryCls}>
              {loading ? "กำลังบันทึก..." : "สร้าง Encounter"}
            </button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
