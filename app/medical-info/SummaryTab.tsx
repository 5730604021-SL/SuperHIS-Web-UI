"use client";

import { useState } from "react";
import { MedicalSummary, getMedicalSummary } from "@/lib/api/medical-info";
import {
  Card,
  Badge,
  Field,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  inputCls,
  btnPrimaryCls,
} from "@/components/ui";
import { allergyTypeLabel, bloodTypeLabel } from "./constants";

export default function SummaryTab() {
  const [hnInput, setHnInput] = useState("");
  const [summary, setSummary] = useState<MedicalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function handleLoad() {
    const trimmed = hnInput.trim();
    if (!trimmed) {
      setError("กรุณากรอก HN");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMedicalSummary(trimmed);
      setSummary(res);
      setLoaded(true);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลดสรุปเวชระเบียนได้");
    } finally {
      setLoading(false);
    }
  }

  const allergies = summary?.data?.allergies ?? [];
  const underlyingDiseases = summary?.data?.underlying ?? [];
  const healthInfo = summary?.data?.health_info ?? null;

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
              โหลดสรุป
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && !loaded && (
        <EmptyBox text="กรอก HN แล้วกดโหลดสรุปเพื่อดูเวชระเบียนพื้นฐาน" />
      )}

      {!loading && !error && loaded && summary && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              แพ้ยา/แพ้อาหาร (active)
            </h2>
            {allergies.length === 0 ? (
              <EmptyBox text="ไม่มีข้อมูลแพ้ยา/แพ้อาหาร" />
            ) : (
              <ul className="space-y-2">
                {allergies.map((a, idx) => (
                  <li
                    key={a.allergy_id ?? idx}
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-red-800">{a.drug_code}</span>
                      <Badge tone="red">{allergyTypeLabel(a.type)}</Badge>
                    </div>
                    {a.symptom && <p className="mt-1 text-red-700">อาการ: {a.symptom}</p>}
                    {a.note && <p className="mt-1 text-red-700">หมายเหตุ: {a.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              โรคประจำตัว (active)
            </h2>
            {underlyingDiseases.length === 0 ? (
              <EmptyBox text="ไม่มีข้อมูลโรคประจำตัว" />
            ) : (
              <ul className="space-y-2">
                {underlyingDiseases.map((u, idx) => (
                  <li
                    key={u.underlying_id ?? idx}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    {u.detail}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">ข้อมูลสุขภาพ</h2>
            {!healthInfo ? (
              <EmptyBox text="ยังไม่มีข้อมูลสุขภาพของผู้ป่วยรายนี้" />
            ) : (
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">กรุ๊ปเลือด</p>
                  <p className="font-medium text-slate-800">
                    {bloodTypeLabel(healthInfo.blood_type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Rh</p>
                  <p className="font-medium text-slate-800">{healthInfo.rh ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Bombay (O-Bombae)</p>
                  <p className="font-medium text-slate-800">
                    {healthInfo.o_bombae ? "มี" : "ไม่มี"}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <p className="text-xs text-slate-400">
            หมายเหตุ: แพ้ยา/แพ้อาหารและโรคประจำตัวข้างต้นแสดงเฉพาะรายการที่ active
            เท่านั้น ปิดรายการหรือแก้ไขได้จากแท็บ &ldquo;แพ้ยา/แพ้อาหาร&rdquo; และ
            &ldquo;โรคประจำตัว&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
