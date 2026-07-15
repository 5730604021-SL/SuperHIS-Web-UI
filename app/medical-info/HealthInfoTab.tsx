"use client";

import { useState, FormEvent } from "react";
import { getHealthInfo, upsertHealthInfo } from "@/lib/api/medical-info";
import {
  Card,
  Field,
  ErrorBox,
  SuccessBox,
  LoadingBox,
  EmptyBox,
  inputCls,
  selectCls,
  btnPrimaryCls,
} from "@/components/ui";
import { BLOOD_TYPE_OPTIONS } from "./constants";

export default function HealthInfoTab() {
  const [hnInput, setHnInput] = useState("");
  const [hn, setHn] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [recordExists, setRecordExists] = useState(false);

  const [bloodType, setBloodType] = useState<string>("");
  const [rh, setRh] = useState("");
  const [oBombae, setOBombae] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleLoad() {
    const trimmed = hnInput.trim();
    if (!trimmed) {
      setLoadError("กรุณากรอก HN");
      return;
    }
    setLoading(true);
    setLoadError(null);
    setSaveSuccess(false);
    try {
      const res = await getHealthInfo(trimmed);
      setHn(trimmed);
      setLoaded(true);
      if (res.data) {
        setRecordExists(true);
        setBloodType(String(res.data.blood_type));
        setRh(res.data.rh ?? "");
        setOBombae(Boolean(res.data.o_bombae));
      } else {
        setRecordExists(false);
        setBloodType("");
        setRh("");
        setOBombae(false);
      }
    } catch (err) {
      setLoaded(false);
      setLoadError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลสุขภาพได้");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bloodType) {
      setSaveError("กรุณาเลือกกรุ๊ปเลือด");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await upsertHealthInfo(hn, {
        blood_type: Number(bloodType),
        rh: rh || undefined,
        o_bombae: oBombae,
      });
      setRecordExists(true);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "ไม่สามารถบันทึกข้อมูลสุขภาพได้");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="HN" required>
            <input
              type="text"
              placeholder="HN ผู้ป่วย"
              value={hnInput}
              onChange={(e) => setHnInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              className={inputCls}
            />
          </Field>
          <div className="flex items-end">
            <button onClick={handleLoad} className={btnPrimaryCls}>
              โหลดข้อมูล
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingBox />}
      {!loading && loadError && <ErrorBox message={loadError} />}
      {!loading && !loadError && !loaded && (
        <EmptyBox text="กรอก HN แล้วกดโหลดข้อมูลเพื่อดู/แก้ไขข้อมูลสุขภาพ" />
      )}

      {!loading && !loadError && loaded && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              ข้อมูลสุขภาพของ HN: {hn}
            </h2>
            {!recordExists && (
              <span className="text-xs text-slate-400">
                ยังไม่มีข้อมูล — บันทึกเพื่อสร้างใหม่
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="กรุ๊ปเลือด" required>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className={selectCls}
                >
                  <option value="">- เลือก -</option>
                  {BLOOD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rh">
                <select value={rh} onChange={(e) => setRh(e.target.value)} className={selectCls}>
                  <option value="">- ไม่ระบุ -</option>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
              </Field>
              <Field label="Bombay (O-Bombae)">
                <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={oBombae}
                    onChange={(e) => setOBombae(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  หมู่เลือด Bombay (โอบอมเบย์)
                </label>
              </Field>
            </div>

            {saveError && <ErrorBox message={saveError} />}
            {saveSuccess && <SuccessBox>บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว</SuccessBox>}

            <div className="flex justify-end gap-2">
              <button type="submit" disabled={saving} className={btnPrimaryCls}>
                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลสุขภาพ"}
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
