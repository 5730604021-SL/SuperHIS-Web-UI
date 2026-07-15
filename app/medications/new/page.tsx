"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import {
  createMedicationOrder,
  MedicationItemCreate,
  AllergyWarning,
} from "@/lib/api/medications";
import {
  PageHeader,
  Card,
  Field,
  ErrorBox,
  inputCls,
  btnPrimaryCls,
  btnSecondaryCls,
} from "@/components/ui";

const emptyItem = (): MedicationItemCreate => ({
  product_id: 0,
  quantity: 0,
  dose: "",
  frequency: "",
  timing: "",
  route: "",
  duration_days: undefined,
  instruction: "",
});

export default function NewMedicationOrderPage() {
  const [encounterId, setEncounterId] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [note, setNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [items, setItems] = useState<MedicationItemCreate[]>([emptyItem()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);

  function updateItem(idx: number, patch: Partial<MedicationItemCreate>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForNext() {
    setEncounterId("");
    setDoctorCode("");
    setNote("");
    setCreatedBy("");
    setItems([emptyItem()]);
    setCreatedOrderId(null);
    setAllergyWarnings([]);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);

    if (!encounterId) {
      setError("กรุณาระบุ Encounter ID");
      return;
    }

    const cleanedItems = items
      .filter((it) => it.product_id > 0 && it.quantity > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        dose: it.dose || undefined,
        frequency: it.frequency || undefined,
        timing: it.timing || undefined,
        route: it.route || undefined,
        duration_days: it.duration_days || undefined,
        instruction: it.instruction || undefined,
      }));

    if (cleanedItems.length === 0) {
      setError("ต้องมีรายการยาอย่างน้อย 1 รายการ (product_id และ quantity ต้องมากกว่า 0)");
      return;
    }

    setLoading(true);
    try {
      const res = await createMedicationOrder({
        encounter_id: Number(encounterId),
        doctor_code: doctorCode || undefined,
        note: note || undefined,
        created_by: createdBy || undefined,
        items: cleanedItems,
      });
      setCreatedOrderId(res.medication_order_id ?? null);
      setAllergyWarnings(res.allergy_warnings ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถสร้างใบสั่งยาได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  if (createdOrderId) {
    return (
      <AppShell>
        <PageHeader title="สั่งยาใหม่" />
        <Card className="mx-auto max-w-lg text-center">
          <p className="mb-2 text-lg font-semibold text-emerald-700">สร้างใบสั่งยาสำเร็จ</p>
          <p className="mb-4 text-2xl font-bold text-teal-700">{createdOrderId}</p>

          {allergyWarnings.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800">
              <p className="mb-1 font-medium">คำเตือนการแพ้ยา</p>
              <ul className="list-inside list-disc space-y-1">
                {allergyWarnings.map((w, i) => (
                  <li key={i}>
                    {w.product_name ?? w.matched_drug_code ?? "-"}
                    {w.symptom ? ` — ${w.symptom}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Link href="/medications" className={btnPrimaryCls}>
              ดูรายการใบสั่งยา
            </Link>
            <button onClick={resetForNext} className={btnSecondaryCls}>
              สั่งยาถัดไป
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="สั่งยาใหม่" />

      <Card>
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">ข้อมูลใบสั่งยา</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Encounter ID" required>
                <input
                  type="number"
                  className={inputCls}
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value)}
                />
              </Field>
              <Field label="รหัสแพทย์" hint="ไม่ระบุ = ใช้ doctor_code ของ encounter">
                <input
                  className={inputCls}
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value)}
                />
              </Field>
              <Field label="ผู้ทำรายการ">
                <input
                  className={inputCls}
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                />
              </Field>
              <div className="sm:col-span-3">
                <Field label="หมายเหตุ">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-600">รายการยาที่สั่ง</h2>
              <button onClick={addItem} className={btnSecondaryCls}>
                + เพิ่มรายการ
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label="Product ID" required>
                      <input
                        type="number"
                        className={inputCls}
                        value={item.product_id || ""}
                        onChange={(e) => updateItem(idx, { product_id: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="จำนวน" required hint="หน่วยใช้จริง เช่น เม็ด/cc">
                      <input
                        type="number"
                        className={inputCls}
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="ครั้งละ (dose)">
                      <input
                        className={inputCls}
                        value={item.dose ?? ""}
                        onChange={(e) => updateItem(idx, { dose: e.target.value })}
                      />
                    </Field>
                    <Field label="ความถี่">
                      <input
                        className={inputCls}
                        value={item.frequency ?? ""}
                        onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                      />
                    </Field>
                    <Field label="เวลา (timing)">
                      <input
                        className={inputCls}
                        value={item.timing ?? ""}
                        onChange={(e) => updateItem(idx, { timing: e.target.value })}
                      />
                    </Field>
                    <Field label="วิธีใช้ (route)">
                      <input
                        className={inputCls}
                        value={item.route ?? ""}
                        onChange={(e) => updateItem(idx, { route: e.target.value })}
                      />
                    </Field>
                    <Field label="จำนวนวันที่ใช้">
                      <input
                        type="number"
                        className={inputCls}
                        value={item.duration_days ?? ""}
                        onChange={(e) =>
                          updateItem(idx, {
                            duration_days: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </Field>
                    <Field label="คำแนะนำเพิ่มเติม">
                      <input
                        className={inputCls}
                        value={item.instruction ?? ""}
                        onChange={(e) => updateItem(idx, { instruction: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      ลบรายการนี้
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={loading} className={btnPrimaryCls}>
              {loading ? "กำลังบันทึก..." : "สั่งยา"}
            </button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
