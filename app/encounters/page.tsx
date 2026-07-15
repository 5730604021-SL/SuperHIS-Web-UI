"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Badge,
  BadgeTone,
  Card,
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
} from "@/components/ui";
import {
  Encounter,
  ENCOUNTER_STATUS_OPTIONS,
  EncounterStatus,
  ListEncountersParams,
  updateEncounterStatus,
  updateEncounterSummary,
  listEncounters,
} from "@/lib/api/encounters";
import { ApiError } from "@/lib/api";

type SortBy = "doctor_code" | "encounter_id" | "requestdate" | "status" | "type" | "vn";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "requestdate", label: "วันที่ Request" },
  { value: "encounter_id", label: "Encounter ID" },
  { value: "vn", label: "VN" },
  { value: "doctor_code", label: "รหัสแพทย์" },
  { value: "status", label: "สถานะ" },
  { value: "type", label: "ประเภท" },
];

function encounterStatusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case "done":
      return "green";
    case "pending":
      return "amber";
    case "ongoing":
      return "blue";
    case "cancel":
      return "red";
    case "postpone":
      return "gray";
    default:
      return "gray";
  }
}

function encounterStatusLabel(status: string | null | undefined): string {
  return (
    ENCOUNTER_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status ?? "-"
  );
}

function doctorDisplayName(row: Encounter): string {
  const name = `${row.doctor_pname ?? ""}${row.doctor_firstname ?? ""} ${row.doctor_lastname ?? ""}`.trim();
  return name || row.doctor_code || "-";
}

interface StatusModalState {
  open: boolean;
  encounter: Encounter | null;
  value: EncounterStatus;
  loading: boolean;
  error: string | null;
}

interface SummaryModalState {
  open: boolean;
  encounter: Encounter | null;
  value: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATUS_MODAL: StatusModalState = {
  open: false,
  encounter: null,
  value: "pending",
  loading: false,
  error: null,
};

const EMPTY_SUMMARY_MODAL: SummaryModalState = {
  open: false,
  encounter: null,
  value: "",
  loading: false,
  error: null,
};

export default function EncountersPage() {
  const [rows, setRows] = useState<Encounter[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [encounterId, setEncounterId] = useState("");
  const [vn, setVn] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [status, setStatus] = useState<EncounterStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("requestdate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [statusModal, setStatusModal] = useState<StatusModalState>(EMPTY_STATUS_MODAL);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState>(EMPTY_SUMMARY_MODAL);

  const fetchEncounters = useCallback(async (params: ListEncountersParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEncounters(params);
      setRows(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูล encounter ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
     
    fetchEncounters({ sort_by: sortBy, sort_order: sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function currentFilters(): ListEncountersParams {
    return {
      encounter_id: encounterId ? Number(encounterId) : undefined,
      vn: vn || undefined,
      doctor_code: doctorCode || undefined,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }

  function handleSearch() {
    fetchEncounters(currentFilters());
  }

  function handleClear() {
    setEncounterId("");
    setVn("");
    setDoctorCode("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setSortBy("requestdate");
    setSortOrder("desc");
    fetchEncounters({ sort_by: "requestdate", sort_order: "desc" });
  }

  function openStatusModal(encounter: Encounter) {
    setStatusModal({
      open: true,
      encounter,
      value: (encounter.status as EncounterStatus) ?? "pending",
      loading: false,
      error: null,
    });
  }

  function openSummaryModal(encounter: Encounter) {
    setSummaryModal({
      open: true,
      encounter,
      value: encounter.summary ?? "",
      loading: false,
      error: null,
    });
  }

  async function submitStatusModal() {
    if (!statusModal.encounter) return;
    setStatusModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await updateEncounterStatus({
        encounter_id: statusModal.encounter.encounter_id,
        status: statusModal.value,
      });
      setStatusModal(EMPTY_STATUS_MODAL);
      fetchEncounters(currentFilters());
    } catch (err) {
      setStatusModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถเปลี่ยนสถานะได้",
      }));
    }
  }

  async function submitSummaryModal() {
    if (!summaryModal.encounter) return;
    setSummaryModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await updateEncounterSummary({
        encounter_id: summaryModal.encounter.encounter_id,
        summary_text: summaryModal.value,
      });
      setSummaryModal(EMPTY_SUMMARY_MODAL);
      fetchEncounters(currentFilters());
    } catch (err) {
      setSummaryModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถบันทึกสรุปได้",
      }));
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Encounter"
        subtitle="รายการการพบแพทย์ต่อ visit"
        actions={
          <Link href="/encounters/new" className={btnPrimaryCls}>
            + สร้าง Encounter
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Encounter ID">
            <input
              type="number"
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              className={inputCls}
              placeholder="เลข Encounter ID"
            />
          </Field>
          <Field label="VN">
            <input
              type="text"
              value={vn}
              onChange={(e) => setVn(e.target.value)}
              className={inputCls}
              placeholder="เลขที่ visit"
            />
          </Field>
          <Field label="รหัสแพทย์">
            <input
              type="text"
              value={doctorCode}
              onChange={(e) => setDoctorCode(e.target.value)}
              className={inputCls}
              placeholder="doctor_code"
            />
          </Field>
          <Field label="สถานะ">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EncounterStatus | "")}
              className={selectCls}
            >
              <option value="">ทั้งหมด</option>
              {ENCOUNTER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="วันที่ Request ตั้งแต่">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="วันที่ Request ถึง">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="เรียงตาม">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className={selectCls}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ทิศทาง">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className={selectCls}
            >
              <option value="desc">มากไปน้อย</option>
              <option value="asc">น้อยไปมาก</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={handleSearch} className={btnPrimaryCls}>
            ค้นหา
          </button>
          <button onClick={handleClear} className={btnSecondaryCls}>
            ล้าง
          </button>
        </div>
      </Card>

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && rows.length === 0 && <EmptyBox text="ไม่พบข้อมูล encounter" />}

      {!loading && !error && rows.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>Encounter ID</Th>
              <Th>VN</Th>
              <Th>แพทย์</Th>
              <Th>ประเภท</Th>
              <Th>Chief Complaint</Th>
              <Th>วันที่ Request</Th>
              <Th>สถานะ</Th>
              <Th>การดำเนินการ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.encounter_id} className="hover:bg-slate-50">
                <Td>{row.encounter_id}</Td>
                <Td>{row.vn}</Td>
                <Td>{doctorDisplayName(row)}</Td>
                <Td>{row.type ?? "-"}</Td>
                <Td className="max-w-xs whitespace-normal">{row.cheif_complaint ?? "-"}</Td>
                <Td>{formatDateTime(row.requestdate)}</Td>
                <Td>
                  <Badge tone={encounterStatusTone(row.status)}>
                    {encounterStatusLabel(row.status)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openStatusModal(row)}
                      className={btnSecondaryCls}
                    >
                      เปลี่ยนสถานะ
                    </button>
                    <button
                      onClick={() => openSummaryModal(row)}
                      className={btnSecondaryCls}
                    >
                      บันทึกสรุป
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={statusModal.open}
        title={`เปลี่ยนสถานะ Encounter #${statusModal.encounter?.encounter_id ?? ""}`}
        onClose={() => setStatusModal(EMPTY_STATUS_MODAL)}
      >
        <div className="space-y-4">
          <Field label="สถานะใหม่" required>
            <select
              value={statusModal.value}
              onChange={(e) =>
                setStatusModal((prev) => ({
                  ...prev,
                  value: e.target.value as EncounterStatus,
                }))
              }
              className={selectCls}
            >
              {ENCOUNTER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          {statusModal.error && <ErrorBox message={statusModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStatusModal(EMPTY_STATUS_MODAL)}
              className={btnSecondaryCls}
              disabled={statusModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitStatusModal}
              className={btnPrimaryCls}
              disabled={statusModal.loading}
            >
              {statusModal.loading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={summaryModal.open}
        title={`บันทึกสรุป Encounter #${summaryModal.encounter?.encounter_id ?? ""}`}
        onClose={() => setSummaryModal(EMPTY_SUMMARY_MODAL)}
        wide
      >
        <div className="space-y-4">
          <Field label="เนื้อหาสรุป" required>
            <textarea
              value={summaryModal.value}
              onChange={(e) =>
                setSummaryModal((prev) => ({ ...prev, value: e.target.value }))
              }
              rows={6}
              className={inputCls}
              placeholder="สรุปการตรวจ / ผลการรักษา"
            />
          </Field>

          {summaryModal.error && <ErrorBox message={summaryModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSummaryModal(EMPTY_SUMMARY_MODAL)}
              className={btnSecondaryCls}
              disabled={summaryModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitSummaryModal}
              className={btnPrimaryCls}
              disabled={summaryModal.loading || !summaryModal.value.trim()}
            >
              {summaryModal.loading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
