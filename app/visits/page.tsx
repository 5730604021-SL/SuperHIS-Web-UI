"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Badge,
  EmptyBox,
  ErrorBox,
  Field,
  LoadingBox,
  Modal,
  PageHeader,
  Td,
  Th,
  TableShell,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDateTime,
  inputCls,
  selectCls,
  statusTone,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  FinishPayload,
  ListVisitsParams,
  PrescreeningPayload,
  Visit,
  finishVisit,
  listVisits,
  markArrival,
  updatePrescreening,
} from "@/lib/api/visits";

const SORT_FIELDS: { value: string; label: string }[] = [
  { value: "createdate", label: "วันที่สร้าง" },
  { value: "visitdate", label: "วันที่ Visit" },
  { value: "appointmentdate", label: "วันนัดหมาย" },
  { value: "vn", label: "VN" },
  { value: "hn", label: "HN" },
  { value: "status", label: "สถานะ" },
  { value: "checkout_date", label: "วันเช็คเอาท์" },
  { value: "agent_id", label: "Agent ID" },
  { value: "nurse_id", label: "Nurse ID" },
  { value: "height", label: "ส่วนสูง" },
  { value: "weight", label: "น้ำหนัก" },
  { value: "bp_systolic", label: "ความดัน Systolic" },
  { value: "bp_diastolic", label: "ความดัน Diastolic" },
  { value: "respiratory_rate", label: "อัตราการหายใจ" },
  { value: "heartrate", label: "อัตราการเต้นหัวใจ" },
  { value: "body_temp", label: "อุณหภูมิร่างกาย" },
];

// Real his_visit.status values driven by the backend state machine:
// "pending" (default on create) -> "arrived" (PATCH /visit/arrival)
// -> "wait_doctor" (PATCH /prescreening/{vn}) -> "done" (PATCH /visit/finish).
const FINISHED_STATUSES = new Set(["done"]);
const NOT_YET_ARRIVED_STATUSES = new Set(["pending"]);

function isFinishedStatus(status: string | null | undefined): boolean {
  return FINISHED_STATUSES.has((status ?? "").toLowerCase());
}

function canMarkArrival(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  if (FINISHED_STATUSES.has(s)) return false;
  return s === "" || NOT_YET_ARRIVED_STATUSES.has(s);
}

function chiefComplaintSummary(visit: Visit): string {
  const items = (visit.requests ?? [])
    .map((r) => r.cheif_complaint)
    .filter((v): v is string => Boolean(v));
  return items.length > 0 ? items.join(", ") : "-";
}

type Filters = {
  vn: string;
  hn: string;
  appointmentDateFrom: string;
  appointmentDateTo: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

const EMPTY_FILTERS: Filters = {
  vn: "",
  hn: "",
  appointmentDateFrom: "",
  appointmentDateTo: "",
  sortBy: "createdate",
  sortOrder: "desc",
};

function toListParams(f: Filters): ListVisitsParams {
  return {
    vn: f.vn || undefined,
    hn: f.hn || undefined,
    appointment_date_from: f.appointmentDateFrom || undefined,
    appointment_date_to: f.appointmentDateTo || undefined,
    sort_by: f.sortBy,
    sort_order: f.sortOrder,
  };
}

const EMPTY_PRESCREENING: PrescreeningPayload = {
  nurse_id: "",
  height: null,
  weight: null,
  bp_systolic: null,
  bp_diastolic: null,
  respiratory_rate: null,
  heartrate: null,
  body_temp: null,
};

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Arrival modal
  const [arrivalTarget, setArrivalTarget] = useState<Visit | null>(null);
  const [arrivalAgentId, setArrivalAgentId] = useState("");
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);

  // Finish modal
  const [finishTarget, setFinishTarget] = useState<Visit | null>(null);
  const [confirmNoDf, setConfirmNoDf] = useState(false);
  const [confirmedBy, setConfirmedBy] = useState("");
  const [finishSubmitting, setFinishSubmitting] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Prescreening modal
  const [prescreenTarget, setPrescreenTarget] = useState<Visit | null>(null);
  const [prescreenForm, setPrescreenForm] =
    useState<PrescreeningPayload>(EMPTY_PRESCREENING);
  const [prescreenSubmitting, setPrescreenSubmitting] = useState(false);
  const [prescreenError, setPrescreenError] = useState<string | null>(null);

  const load = useCallback(async (params: ListVisitsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listVisits(params);
      setVisits(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูล Visit ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(toListParams(EMPTY_FILTERS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    void load(toListParams(filters));
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    void load(toListParams(EMPTY_FILTERS));
  }

  function handleSort(field: string) {
    const nextOrder: "asc" | "desc" =
      filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc";
    const next = { ...filters, sortBy: field, sortOrder: nextOrder };
    setFilters(next);
    void load(toListParams(next));
  }

  function refresh() {
    void load(toListParams(filters));
  }

  function openArrivalModal(visit: Visit) {
    setArrivalTarget(visit);
    setArrivalAgentId(visit.agent_id ?? "");
    setArrivalError(null);
  }

  function closeArrivalModal() {
    setArrivalTarget(null);
    setArrivalAgentId("");
    setArrivalError(null);
  }

  async function submitArrival() {
    if (!arrivalTarget) return;
    if (!arrivalAgentId) {
      setArrivalError("กรุณาระบุ Agent ID");
      return;
    }
    setArrivalSubmitting(true);
    setArrivalError(null);
    try {
      await markArrival({ vn: arrivalTarget.vn, agent_id: arrivalAgentId });
      closeArrivalModal();
      refresh();
    } catch (err) {
      setArrivalError(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกการมาถึงได้"
      );
    } finally {
      setArrivalSubmitting(false);
    }
  }

  function openFinishModal(visit: Visit) {
    setFinishTarget(visit);
    setConfirmNoDf(false);
    setConfirmedBy("");
    setFinishError(null);
  }

  function closeFinishModal() {
    setFinishTarget(null);
    setConfirmNoDf(false);
    setConfirmedBy("");
    setFinishError(null);
  }

  async function submitFinish() {
    if (!finishTarget) return;
    setFinishSubmitting(true);
    setFinishError(null);
    try {
      const body: FinishPayload = {
        vn: finishTarget.vn,
        confirm_no_df: confirmNoDf,
        confirmed_by: confirmedBy || undefined,
      };
      await finishVisit(body);
      closeFinishModal();
      refresh();
    } catch (err) {
      setFinishError(
        err instanceof ApiError ? err.message : "ไม่สามารถจบ Visit ได้"
      );
    } finally {
      setFinishSubmitting(false);
    }
  }

  function openPrescreenModal(visit: Visit) {
    setPrescreenTarget(visit);
    setPrescreenForm({
      nurse_id: visit.nurse_id ?? "",
      height: visit.height ?? null,
      weight: visit.weight ?? null,
      bp_systolic: visit.bp_systolic ?? null,
      bp_diastolic: visit.bp_diastolic ?? null,
      respiratory_rate: visit.respiratory_rate ?? null,
      heartrate: visit.heartrate ?? null,
      body_temp: visit.body_temp ?? null,
    });
    setPrescreenError(null);
  }

  function closePrescreenModal() {
    setPrescreenTarget(null);
    setPrescreenForm(EMPTY_PRESCREENING);
    setPrescreenError(null);
  }

  function updatePrescreenField<K extends keyof PrescreeningPayload>(
    key: K,
    value: PrescreeningPayload[K]
  ) {
    setPrescreenForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitPrescreening() {
    if (!prescreenTarget) return;
    setPrescreenSubmitting(true);
    setPrescreenError(null);
    try {
      await updatePrescreening(prescreenTarget.vn, prescreenForm);
      closePrescreenModal();
      refresh();
    } catch (err) {
      setPrescreenError(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึก Prescreening ได้"
      );
    } finally {
      setPrescreenSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Visit / นัดหมาย"
        subtitle="ค้นหาและจัดการ visit ของผู้ป่วย ตั้งแต่รับเข้า จนถึง prescreening และจบ visit"
        actions={
          <Link href="/visits/new" className={btnPrimaryCls}>
            + สร้าง Visit / นัดหมาย
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="VN">
            <input
              type="text"
              value={filters.vn}
              onChange={(e) => setFilters((prev) => ({ ...prev, vn: e.target.value }))}
              className={inputCls}
              placeholder="เลขที่ visit"
            />
          </Field>
          <Field label="HN">
            <input
              type="text"
              value={filters.hn}
              onChange={(e) => setFilters((prev) => ({ ...prev, hn: e.target.value }))}
              className={inputCls}
              placeholder="เลขที่ผู้ป่วย"
            />
          </Field>
          <Field label="วันนัดหมายตั้งแต่">
            <input
              type="date"
              value={filters.appointmentDateFrom}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, appointmentDateFrom: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="วันนัดหมายถึง">
            <input
              type="date"
              value={filters.appointmentDateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, appointmentDateTo: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="เรียงตาม">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className={selectCls}
            >
              {SORT_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ทิศทาง">
            <select
              value={filters.sortOrder}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortOrder: e.target.value as "asc" | "desc",
                }))
              }
              className={selectCls}
            >
              <option value="desc">มากไปน้อย</option>
              <option value="asc">น้อยไปมาก</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={handleSearch} className={btnPrimaryCls}>
            ค้นหา
          </button>
          <button onClick={handleClear} className={btnSecondaryCls}>
            ล้าง
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading && <LoadingBox text="กำลังโหลดข้อมูล Visit..." />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && visits.length === 0 && (
        <EmptyBox text="ไม่พบข้อมูล Visit" />
      )}

      {!loading && !error && visits.length > 0 && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th onClick={() => handleSort("vn")} active={filters.sortBy === "vn"} dir={filters.sortOrder}>
                VN
              </Th>
              <Th onClick={() => handleSort("hn")} active={filters.sortBy === "hn"} dir={filters.sortOrder}>
                HN
              </Th>
              <Th onClick={() => handleSort("status")} active={filters.sortBy === "status"} dir={filters.sortOrder}>
                สถานะ
              </Th>
              <Th onClick={() => handleSort("appointmentdate")} active={filters.sortBy === "appointmentdate"} dir={filters.sortOrder}>
                วันนัดหมาย
              </Th>
              <Th onClick={() => handleSort("visitdate")} active={filters.sortBy === "visitdate"} dir={filters.sortOrder}>
                วันที่ Visit
              </Th>
              <Th>อาการ / Chief Complaint</Th>
              <Th onClick={() => handleSort("createdate")} active={filters.sortBy === "createdate"} dir={filters.sortOrder}>
                วันที่สร้าง
              </Th>
              <Th>การดำเนินการ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visits.map((v) => (
              <tr key={v.vn} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{v.vn}</Td>
                <Td>{v.hn}</Td>
                <Td>
                  <Badge tone={statusTone(v.status)}>{v.status ?? "-"}</Badge>
                </Td>
                <Td>{formatDateTime(v.appointmentdate)}</Td>
                <Td>{formatDateTime(v.visitdate)}</Td>
                <Td className="max-w-xs whitespace-normal">{chiefComplaintSummary(v)}</Td>
                <Td className="text-slate-500">{formatDateTime(v.createdate)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {canMarkArrival(v.status) && (
                      <button
                        onClick={() => openArrivalModal(v)}
                        className="rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
                      >
                        มาถึงแล้ว
                      </button>
                    )}
                    {!isFinishedStatus(v.status) && (
                      <button
                        onClick={() => openPrescreenModal(v)}
                        className="rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50"
                      >
                        Prescreening
                      </button>
                    )}
                    {!isFinishedStatus(v.status) && (
                      <button
                        onClick={() => openFinishModal(v)}
                        className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        จบ Visit
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {/* Arrival modal */}
      <Modal
        open={arrivalTarget !== null}
        title={`บันทึกการมาถึง — VN ${arrivalTarget?.vn ?? ""}`}
        onClose={closeArrivalModal}
      >
        <div className="space-y-4">
          <Field label="Agent ID" required>
            <input
              type="text"
              value={arrivalAgentId}
              onChange={(e) => setArrivalAgentId(e.target.value)}
              className={inputCls}
              placeholder="รหัสผู้รับ / เจ้าหน้าที่"
            />
          </Field>
          {arrivalError && <ErrorBox message={arrivalError} />}
          <div className="flex justify-end gap-2">
            <button onClick={closeArrivalModal} className={btnSecondaryCls}>
              ยกเลิก
            </button>
            <button
              onClick={submitArrival}
              disabled={arrivalSubmitting}
              className={btnPrimaryCls}
            >
              {arrivalSubmitting ? "กำลังบันทึก..." : "ยืนยันมาถึงแล้ว"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Finish visit modal */}
      <Modal
        open={finishTarget !== null}
        title={`ยืนยันการจบ Visit — VN ${finishTarget?.vn ?? ""}`}
        onClose={closeFinishModal}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ยืนยันว่าต้องการจบ visit นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={confirmNoDf}
              onChange={(e) => setConfirmNoDf(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            ยืนยันว่าไม่มีค่าธรรมเนียมแพทย์ (confirm_no_df)
          </label>
          <Field label="ผู้ยืนยัน (confirmed_by)">
            <input
              type="text"
              value={confirmedBy}
              onChange={(e) => setConfirmedBy(e.target.value)}
              className={inputCls}
            />
          </Field>
          {finishError && <ErrorBox message={finishError} />}
          <div className="flex justify-end gap-2">
            <button onClick={closeFinishModal} className={btnSecondaryCls}>
              ยกเลิก
            </button>
            <button
              onClick={submitFinish}
              disabled={finishSubmitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {finishSubmitting ? "กำลังบันทึก..." : "ยืนยันจบ Visit"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Prescreening modal */}
      <Modal
        open={prescreenTarget !== null}
        title={`Prescreening — VN ${prescreenTarget?.vn ?? ""}`}
        onClose={closePrescreenModal}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nurse ID">
              <input
                type="text"
                value={prescreenForm.nurse_id ?? ""}
                onChange={(e) => updatePrescreenField("nurse_id", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="ส่วนสูง (ซม.)">
              <input
                type="number"
                step="0.1"
                value={prescreenForm.height ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "height",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="น้ำหนัก (กก.)">
              <input
                type="number"
                step="0.1"
                value={prescreenForm.weight ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "weight",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="ความดัน Systolic">
              <input
                type="number"
                value={prescreenForm.bp_systolic ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "bp_systolic",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="ความดัน Diastolic">
              <input
                type="number"
                value={prescreenForm.bp_diastolic ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "bp_diastolic",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="อัตราการหายใจ">
              <input
                type="number"
                value={prescreenForm.respiratory_rate ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "respiratory_rate",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="อัตราการเต้นหัวใจ">
              <input
                type="number"
                value={prescreenForm.heartrate ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "heartrate",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="อุณหภูมิร่างกาย (°C)">
              <input
                type="number"
                step="0.1"
                value={prescreenForm.body_temp ?? ""}
                onChange={(e) =>
                  updatePrescreenField(
                    "body_temp",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </Field>
          </div>
          {prescreenError && <ErrorBox message={prescreenError} />}
          <div className="flex justify-end gap-2">
            <button onClick={closePrescreenModal} className={btnSecondaryCls}>
              ยกเลิก
            </button>
            <button
              onClick={submitPrescreening}
              disabled={prescreenSubmitting}
              className={btnPrimaryCls}
            >
              {prescreenSubmitting ? "กำลังบันทึก..." : "บันทึก Prescreening"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
