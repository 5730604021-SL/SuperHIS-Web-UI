"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import {
  approveDf,
  approveDfByVn,
  createDf,
  getDfMonthlySummary,
  getDfSummary,
  listDf,
  listDfMissing,
  reverseDf,
  suggestDf,
  DF_APPROVAL_STATUS_OPTIONS,
  DF_SOURCE_TYPE_OPTIONS,
  DfEntry,
  DfMissingRow,
  DfMonthlySummaryResponse,
  DfSuggestCandidate,
  DfSummaryRow,
  DfApprovalStatus,
  DfSourceType,
} from "@/lib/api/df";
import {
  PageHeader,
  Card,
  Badge,
  statusTone,
  Field,
  ErrorBox,
  SuccessBox,
  LoadingBox,
  EmptyBox,
  TableShell,
  Th,
  Td,
  Modal,
  inputCls,
  selectCls,
  btnPrimaryCls,
  btnSecondaryCls,
  btnDangerCls,
  formatDateTime,
  formatMoney,
} from "@/components/ui";

type TabKey = "entries" | "missing" | "summary";

const TABS: { key: TabKey; label: string }[] = [
  { key: "entries", label: "รายการ DF" },
  { key: "missing", label: "ยังไม่บันทึก DF" },
  { key: "summary", label: "สรุป" },
];

function sourceTypeLabel(value: string): string {
  return DF_SOURCE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function doctorName(row: {
  doctor_pname?: string | null;
  doctor_firstname?: string | null;
  doctor_lastname?: string | null;
}): string {
  const name = `${row.doctor_pname ?? ""}${row.doctor_firstname ?? ""} ${row.doctor_lastname ?? ""}`.trim();
  return name || "-";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentUserName(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("his_user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    const name = `${u.pname ?? ""}${u.firstname ?? ""} ${u.lastname ?? ""}`.trim();
    return name || u.username || "";
  } catch {
    return "";
  }
}

export default function DfPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("entries");

  // ---------- Tab: รายการ DF ----------
  const [entries, setEntries] = useState<DfEntry[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const [fDoctorCode, setFDoctorCode] = useState("");
  const [fHn, setFHn] = useState("");
  const [fVn, setFVn] = useState("");
  const [fSourceType, setFSourceType] = useState<DfSourceType | "">("");
  const [fApprovalStatus, setFApprovalStatus] = useState<DfApprovalStatus | "">("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fSortBy, setFSortBy] = useState("created_date");
  const [fSortOrder, setFSortOrder] = useState<"asc" | "desc">("desc");

  const fetchEntries = useCallback(
    async (params: Parameters<typeof listDf>[0]) => {
      setEntriesLoading(true);
      setEntriesError(null);
      try {
        const res = await listDf(params);
        setEntries(res.data);
        setEntriesTotal(res.total_found);
      } catch (err) {
        setEntriesError(
          err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายการ DF ได้"
        );
      } finally {
        setEntriesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries({ sort_by: "created_date", sort_order: "desc" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchEntries() {
    fetchEntries({
      doctor_code: fDoctorCode || undefined,
      hn: fHn || undefined,
      vn: fVn || undefined,
      source_type: fSourceType || undefined,
      approval_status: fApprovalStatus || undefined,
      date_from: fDateFrom || undefined,
      date_to: fDateTo || undefined,
      sort_by: fSortBy,
      sort_order: fSortOrder,
    });
  }

  function handleClearEntries() {
    setFDoctorCode("");
    setFHn("");
    setFVn("");
    setFSourceType("");
    setFApprovalStatus("");
    setFDateFrom("");
    setFDateTo("");
    setFSortBy("created_date");
    setFSortOrder("desc");
    fetchEntries({ sort_by: "created_date", sort_order: "desc" });
  }

  // ---- Approve single entry ----
  const [approveTarget, setApproveTarget] = useState<DfEntry | null>(null);
  const [approveBy, setApproveBy] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  function openApprove(entry: DfEntry) {
    setApproveTarget(entry);
    setApproveBy(currentUserName());
    setApproveError(null);
  }

  async function handleConfirmApprove() {
    if (!approveTarget) return;
    if (!approveBy.trim()) {
      setApproveError("กรุณากรอกชื่อผู้อนุมัติ");
      return;
    }
    setApproveLoading(true);
    setApproveError(null);
    try {
      await approveDf(approveTarget.df_id, { approved_by: approveBy.trim() });
      setApproveTarget(null);
      handleSearchEntries();
    } catch (err) {
      setApproveError(err instanceof ApiError ? err.message : "อนุมัติไม่สำเร็จ");
    } finally {
      setApproveLoading(false);
    }
  }

  // ---- Reverse entry ----
  const [reverseTarget, setReverseTarget] = useState<DfEntry | null>(null);
  const [reverseNote, setReverseNote] = useState("");
  const [reverseBy, setReverseBy] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);

  function openReverse(entry: DfEntry) {
    setReverseTarget(entry);
    setReverseNote("");
    setReverseBy(currentUserName());
    setReverseError(null);
  }

  async function handleConfirmReverse() {
    if (!reverseTarget) return;
    if (!reverseNote.trim()) {
      setReverseError("กรุณากรอกเหตุผลการกลับรายการ");
      return;
    }
    setReverseLoading(true);
    setReverseError(null);
    try {
      await reverseDf(reverseTarget.df_id, {
        note: reverseNote.trim(),
        created_by: reverseBy || undefined,
      });
      setReverseTarget(null);
      handleSearchEntries();
    } catch (err) {
      setReverseError(err instanceof ApiError ? err.message : "กลับรายการไม่สำเร็จ");
    } finally {
      setReverseLoading(false);
    }
  }

  // ---- Approve by VN ----
  const [approveVnOpen, setApproveVnOpen] = useState(false);
  const [approveVnVn, setApproveVnVn] = useState("");
  const [approveVnBy, setApproveVnBy] = useState("");
  const [approveVnLoading, setApproveVnLoading] = useState(false);
  const [approveVnError, setApproveVnError] = useState<string | null>(null);
  const [approveVnResult, setApproveVnResult] = useState<string | null>(null);

  function openApproveVn() {
    setApproveVnOpen(true);
    setApproveVnVn("");
    setApproveVnBy(currentUserName());
    setApproveVnError(null);
    setApproveVnResult(null);
  }

  async function handleConfirmApproveVn() {
    if (!approveVnVn.trim() || !approveVnBy.trim()) {
      setApproveVnError("กรุณากรอก VN และชื่อผู้อนุมัติ");
      return;
    }
    setApproveVnLoading(true);
    setApproveVnError(null);
    try {
      const res = await approveDfByVn({
        vn: approveVnVn.trim(),
        approved_by: approveVnBy.trim(),
      });
      setApproveVnResult(`อนุมัติสำเร็จ ${res.approved_count} รายการ`);
      handleSearchEntries();
    } catch (err) {
      setApproveVnError(err instanceof ApiError ? err.message : "อนุมัติไม่สำเร็จ");
    } finally {
      setApproveVnLoading(false);
    }
  }

  // ---- Create DF ----
  const emptyCreateForm = {
    doctor_code: "",
    hn: "",
    vn: "",
    df_amount: "",
    course_id: "",
    note: "",
    created_by: "",
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestCandidates, setSuggestCandidates] = useState<DfSuggestCandidate[] | null>(null);

  function openCreate() {
    setCreateOpen(true);
    setCreateForm({ ...emptyCreateForm, created_by: currentUserName() });
    setCreateError(null);
    setCreatedId(null);
    setSuggestCandidates(null);
    setSuggestError(null);
  }

  function updateCreateForm<K extends keyof typeof emptyCreateForm>(
    key: K,
    value: string
  ) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSuggest() {
    if (!createForm.vn.trim()) {
      setSuggestError("กรุณากรอก VN ก่อนขอคำแนะนำ");
      return;
    }
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const res = await suggestDf(createForm.vn.trim());
      setSuggestCandidates(res.candidates);
      updateCreateForm("hn", res.hn);
    } catch (err) {
      setSuggestError(err instanceof ApiError ? err.message : "ไม่สามารถขอคำแนะนำได้");
      setSuggestCandidates(null);
    } finally {
      setSuggestLoading(false);
    }
  }

  function applyCandidate(candidate: DfSuggestCandidate, withAmount: boolean) {
    setCreateForm((prev) => ({
      ...prev,
      doctor_code: candidate.doctor_code,
      df_amount:
        withAmount && candidate.last_df_amount != null
          ? String(candidate.last_df_amount)
          : prev.df_amount,
    }));
  }

  async function handleCreateSubmit() {
    setCreateError(null);
    if (!createForm.doctor_code.trim() || !createForm.hn.trim() || !createForm.vn.trim()) {
      setCreateError("กรุณากรอกหมอ, HN และ VN");
      return;
    }
    const amount = Number(createForm.df_amount);
    if (!createForm.df_amount || Number.isNaN(amount) || amount <= 0) {
      setCreateError("กรุณากรอกจำนวน DF ที่มากกว่า 0");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await createDf({
        doctor_code: createForm.doctor_code.trim(),
        hn: createForm.hn.trim(),
        vn: createForm.vn.trim(),
        df_amount: amount,
        course_id: createForm.course_id || undefined,
        note: createForm.note || undefined,
        created_by: createForm.created_by || undefined,
      });
      setCreatedId(res.df_id);
      handleSearchEntries();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "สร้างรายการ DF ไม่สำเร็จ");
    } finally {
      setCreateLoading(false);
    }
  }

  function handleCreateAgain() {
    setCreateForm({ ...emptyCreateForm, created_by: currentUserName() });
    setCreatedId(null);
    setCreateError(null);
    setSuggestCandidates(null);
  }

  // ---------- Tab: ยังไม่บันทึก DF ----------
  const [missingDate, setMissingDate] = useState(todayStr());
  const [missing, setMissing] = useState<DfMissingRow[]>([]);
  const [missingLoading, setMissingLoading] = useState(true);
  const [missingError, setMissingError] = useState<string | null>(null);
  const [missingTotal, setMissingTotal] = useState(0);

  const fetchMissing = useCallback(async (params: { date?: string }) => {
    setMissingLoading(true);
    setMissingError(null);
    try {
      const res = await listDfMissing(params);
      setMissing(res.data);
      setMissingTotal(res.total_found);
    } catch (err) {
      setMissingError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายการที่ยังไม่บันทึก DF ได้"
      );
    } finally {
      setMissingLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMissing({ date: todayStr() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchMissing() {
    fetchMissing({ date: missingDate || undefined });
  }

  // ---------- Tab: สรุป ----------
  const [sDateFrom, setSDateFrom] = useState("");
  const [sDateTo, setSDateTo] = useState("");
  const [sDoctorCode, setSDoctorCode] = useState("");
  const [summaryRows, setSummaryRows] = useState<DfSummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryTotalDoctors, setSummaryTotalDoctors] = useState(0);

  const fetchSummary = useCallback(
    async (params: Parameters<typeof getDfSummary>[0]) => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await getDfSummary(params);
        setSummaryRows(res.data);
        setSummaryTotalDoctors(res.total_doctors);
      } catch (err) {
        setSummaryError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดสรุปยอด DF ได้");
      } finally {
        setSummaryLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSummary({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSummary() {
    fetchSummary({
      date_from: sDateFrom || undefined,
      date_to: sDateTo || undefined,
      doctor_code: sDoctorCode || undefined,
    });
  }

  function handleClearSummary() {
    setSDateFrom("");
    setSDateTo("");
    setSDoctorCode("");
    fetchSummary({});
  }

  const summaryTotalAmount = summaryRows.reduce((sum, r) => sum + (Number(r.total_df) || 0), 0);

  // ---- สรุปรายเดือน ----
  const [monthDoctorCode, setMonthDoctorCode] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthResult, setMonthResult] = useState<DfMonthlySummaryResponse | null>(null);

  async function handleSearchMonth() {
    if (!monthDoctorCode.trim() || !month.trim()) {
      setMonthError("กรุณากรอกรหัสแพทย์และเดือน");
      return;
    }
    setMonthLoading(true);
    setMonthError(null);
    try {
      const res = await getDfMonthlySummary({
        doctor_code: monthDoctorCode.trim(),
        month: month.trim(),
      });
      setMonthResult(res);
    } catch (err) {
      setMonthError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดสรุปรายเดือนได้");
      setMonthResult(null);
    } finally {
      setMonthLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="ค่าธรรมเนียมแพทย์ (DF)"
        subtitle="บันทึก ตรวจสอบ และอนุมัติค่าธรรมเนียมแพทย์ต่อ visit"
      />

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-slate-500 hover:text-teal-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "entries" && (
        <div>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="รหัสแพทย์">
                <input
                  className={inputCls}
                  value={fDoctorCode}
                  onChange={(e) => setFDoctorCode(e.target.value)}
                  placeholder="doctor_code"
                />
              </Field>
              <Field label="HN">
                <input
                  className={inputCls}
                  value={fHn}
                  onChange={(e) => setFHn(e.target.value)}
                />
              </Field>
              <Field label="VN">
                <input
                  className={inputCls}
                  value={fVn}
                  onChange={(e) => setFVn(e.target.value)}
                />
              </Field>
              <Field label="ประเภทรายการ">
                <select
                  className={selectCls}
                  value={fSourceType}
                  onChange={(e) => setFSourceType(e.target.value as DfSourceType | "")}
                >
                  <option value="">- ทั้งหมด -</option>
                  {DF_SOURCE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="สถานะอนุมัติ">
                <select
                  className={selectCls}
                  value={fApprovalStatus}
                  onChange={(e) => setFApprovalStatus(e.target.value as DfApprovalStatus | "")}
                >
                  <option value="">- ทั้งหมด -</option>
                  {DF_APPROVAL_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="วันที่บันทึกตั้งแต่">
                <input
                  type="date"
                  className={inputCls}
                  value={fDateFrom}
                  onChange={(e) => setFDateFrom(e.target.value)}
                />
              </Field>
              <Field label="วันที่บันทึกถึง">
                <input
                  type="date"
                  className={inputCls}
                  value={fDateTo}
                  onChange={(e) => setFDateTo(e.target.value)}
                />
              </Field>
              <Field label="เรียงตาม">
                <div className="flex gap-2">
                  <select
                    className={selectCls}
                    value={fSortBy}
                    onChange={(e) => setFSortBy(e.target.value)}
                  >
                    <option value="created_date">วันที่บันทึก</option>
                    <option value="df_amount">จำนวนเงิน</option>
                    <option value="df_id">รหัส DF</option>
                    <option value="doctor_code">รหัสแพทย์</option>
                    <option value="hn">HN</option>
                    <option value="source_type">ประเภทรายการ</option>
                    <option value="vn">VN</option>
                  </select>
                  <select
                    className={selectCls}
                    value={fSortOrder}
                    onChange={(e) => setFSortOrder(e.target.value as "asc" | "desc")}
                  >
                    <option value="desc">มากไปน้อย</option>
                    <option value="asc">น้อยไปมาก</option>
                  </select>
                </div>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <button onClick={handleSearchEntries} className={btnPrimaryCls}>
                  ค้นหา
                </button>
                <button onClick={handleClearEntries} className={btnSecondaryCls}>
                  ล้าง
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={openApproveVn} className={btnSecondaryCls}>
                  อนุมัติทั้ง VN
                </button>
                <button onClick={openCreate} className={btnPrimaryCls}>
                  สร้างรายการ DF
                </button>
              </div>
            </div>
          </Card>

          <p className="mb-3 text-sm text-slate-500">
            พบ {entriesTotal.toLocaleString("th-TH")} รายการ
          </p>

          {entriesLoading && <LoadingBox />}
          {!entriesLoading && entriesError && <ErrorBox message={entriesError} />}
          {!entriesLoading && !entriesError && entries.length === 0 && (
            <EmptyBox text="ไม่พบรายการ DF" />
          )}
          {!entriesLoading && !entriesError && entries.length > 0 && (
            <TableShell>
              <thead className="bg-slate-50">
                <tr>
                  <Th>รหัส DF</Th>
                  <Th>วันที่บันทึก</Th>
                  <Th>VN</Th>
                  <Th>HN</Th>
                  <Th>แพทย์</Th>
                  <Th>จำนวนเงิน</Th>
                  <Th>ประเภท</Th>
                  <Th>สถานะ</Th>
                  <Th>หมายเหตุ</Th>
                  <Th>การดำเนินการ</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((row) => (
                  <tr key={row.df_id} className="hover:bg-slate-50">
                    <Td>{row.df_id}</Td>
                    <Td>{formatDateTime(row.created_date)}</Td>
                    <Td>{row.vn}</Td>
                    <Td>{row.hn}</Td>
                    <Td>{doctorName(row)}</Td>
                    <Td>{formatMoney(row.df_amount)}</Td>
                    <Td>{sourceTypeLabel(row.source_type)}</Td>
                    <Td>
                      <Badge tone={statusTone(row.approval_status)}>
                        {DF_APPROVAL_STATUS_OPTIONS.find((o) => o.value === row.approval_status)
                          ?.label ?? row.approval_status}
                      </Badge>
                    </Td>
                    <Td>{row.note ?? "-"}</Td>
                    <Td>
                      <div className="flex gap-2">
                        {row.approval_status === "pending" &&
                          row.source_type === "manual_service" && (
                            <button
                              onClick={() => openApprove(row)}
                              className="rounded-lg border border-teal-300 bg-white px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
                            >
                              อนุมัติ
                            </button>
                          )}
                        {row.source_type !== "reversal" && row.source_type !== "no_df" && (
                          <button
                            onClick={() => openReverse(row)}
                            className={`${btnDangerCls} px-3 py-1 text-xs`}
                          >
                            Reverse
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      {activeTab === "missing" && (
        <div>
          <Card className="mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <Field label="วันที่ตรวจ">
                  <input
                    type="date"
                    className={inputCls}
                    value={missingDate}
                    onChange={(e) => setMissingDate(e.target.value)}
                  />
                </Field>
              </div>
              <button onClick={handleSearchMissing} className={btnPrimaryCls}>
                ค้นหา
              </button>
            </div>
          </Card>

          <p className="mb-3 text-sm text-slate-500">
            พบ {missingTotal.toLocaleString("th-TH")} visit ที่ยังไม่บันทึก DF
          </p>

          {missingLoading && <LoadingBox />}
          {!missingLoading && missingError && <ErrorBox message={missingError} />}
          {!missingLoading && !missingError && missing.length === 0 && (
            <EmptyBox text="ไม่พบ visit ที่ยังไม่บันทึก DF ในวันนี้" />
          )}
          {!missingLoading && !missingError && missing.length > 0 && (
            <TableShell>
              <thead className="bg-slate-50">
                <tr>
                  <Th>VN</Th>
                  <Th>HN</Th>
                  <Th>สถานะ Visit</Th>
                  <Th>วันที่ Visit</Th>
                  <Th>วันที่เช็คเอาท์</Th>
                  <Th>มี Encounter หมอ</Th>
                  <Th>รายการตัดใช้</Th>
                  <Th>ยืนยันไม่มี DF</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missing.map((row) => (
                  <tr key={row.vn} className="hover:bg-slate-50">
                    <Td>{row.vn}</Td>
                    <Td>{row.hn}</Td>
                    <Td>
                      <Badge tone={statusTone(row.status)}>{row.status ?? "-"}</Badge>
                    </Td>
                    <Td>{formatDateTime(row.visitdate)}</Td>
                    <Td>{formatDateTime(row.checkout_date)}</Td>
                    <Td>
                      <Badge tone={row.has_doctor_encounter ? "blue" : "gray"}>
                        {row.has_doctor_encounter ? "มี" : "ไม่มี"}
                      </Badge>
                    </Td>
                    <Td>{row.deduct_entries}</Td>
                    <Td>
                      <Badge tone={row.no_df_confirmed ? "amber" : "gray"}>
                        {row.no_df_confirmed ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      {activeTab === "summary" && (
        <div>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="ตั้งแต่วันที่">
                <input
                  type="date"
                  className={inputCls}
                  value={sDateFrom}
                  onChange={(e) => setSDateFrom(e.target.value)}
                />
              </Field>
              <Field label="ถึงวันที่">
                <input
                  type="date"
                  className={inputCls}
                  value={sDateTo}
                  onChange={(e) => setSDateTo(e.target.value)}
                />
              </Field>
              <Field label="รหัสแพทย์">
                <input
                  className={inputCls}
                  value={sDoctorCode}
                  onChange={(e) => setSDoctorCode(e.target.value)}
                  placeholder="ไม่ระบุ = ทุกหมอ"
                />
              </Field>
              <div className="flex items-end gap-2">
                <button onClick={handleSearchSummary} className={btnPrimaryCls}>
                  ค้นหา
                </button>
                <button onClick={handleClearSummary} className={btnSecondaryCls}>
                  ล้าง
                </button>
              </div>
            </div>
          </Card>

          {summaryLoading && <LoadingBox />}
          {!summaryLoading && summaryError && <ErrorBox message={summaryError} />}
          {!summaryLoading && !summaryError && (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card>
                  <p className="text-sm text-slate-500">จำนวนแพทย์</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-800">
                    {summaryTotalDoctors.toLocaleString("th-TH")}
                  </p>
                </Card>
                <Card>
                  <p className="text-sm text-slate-500">ยอด DF สุทธิรวม (approved)</p>
                  <p className="mt-1 text-2xl font-semibold text-teal-700">
                    {formatMoney(summaryTotalAmount)} บาท
                  </p>
                </Card>
              </div>

              {summaryRows.length === 0 ? (
                <EmptyBox text="ไม่พบข้อมูลสรุป DF" />
              ) : (
                <TableShell>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>รหัสแพทย์</Th>
                      <Th>ชื่อแพทย์</Th>
                      <Th>ยอด DF สุทธิ</Th>
                      <Th>รายการรับ</Th>
                      <Th>รายการกลับรายการ</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryRows.map((row) => (
                      <tr key={row.doctor_code} className="hover:bg-slate-50">
                        <Td>{row.doctor_code}</Td>
                        <Td>{doctorName(row)}</Td>
                        <Td>{formatMoney(row.total_df)}</Td>
                        <Td>{row.earn_entries}</Td>
                        <Td>{row.reversal_entries}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </>
          )}

          <Card className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-600">สรุปรายเดือน</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <Field label="รหัสแพทย์" required>
                  <input
                    className={inputCls}
                    value={monthDoctorCode}
                    onChange={(e) => setMonthDoctorCode(e.target.value)}
                  />
                </Field>
              </div>
              <div className="min-w-[180px] flex-1">
                <Field label="เดือน" required>
                  <input
                    type="month"
                    className={inputCls}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </Field>
              </div>
              <button onClick={handleSearchMonth} className={btnPrimaryCls} disabled={monthLoading}>
                {monthLoading ? "กำลังค้นหา..." : "ค้นหา"}
              </button>
            </div>

            {monthError && (
              <div className="mt-3">
                <ErrorBox message={monthError} />
              </div>
            )}

            {monthResult && (
              <div className="mt-4">
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">แพทย์</p>
                    <p className="font-medium text-slate-800">{doctorName(monthResult)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">เดือน</p>
                    <p className="font-medium text-slate-800">{monthResult.month}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">ยอด DF สุทธิ</p>
                    <p className="font-medium text-teal-700">
                      {formatMoney(monthResult.total_df)} บาท
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">จำนวน visit</p>
                    <p className="font-medium text-slate-800">{monthResult.visit_count}</p>
                  </div>
                </div>

                {monthResult.entries.length === 0 ? (
                  <EmptyBox text="ไม่มีรายการในเดือนนี้" />
                ) : (
                  <TableShell>
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>รหัส DF</Th>
                        <Th>วันที่บันทึก</Th>
                        <Th>VN</Th>
                        <Th>HN</Th>
                        <Th>จำนวนเงิน</Th>
                        <Th>ประเภท</Th>
                        <Th>หมายเหตุ</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthResult.entries.map((e) => (
                        <tr key={e.df_id} className="hover:bg-slate-50">
                          <Td>{e.df_id}</Td>
                          <Td>{formatDateTime(e.created_date)}</Td>
                          <Td>{e.vn}</Td>
                          <Td>{e.hn}</Td>
                          <Td>{formatMoney(e.df_amount)}</Td>
                          <Td>{sourceTypeLabel(e.source_type)}</Td>
                          <Td>{e.note ?? "-"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: อนุมัติรายเดียว */}
      <Modal
        open={!!approveTarget}
        title="ยืนยันการอนุมัติ DF"
        onClose={() => setApproveTarget(null)}
      >
        {approveTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              อนุมัติรายการ DF #{approveTarget.df_id} ของ VN {approveTarget.vn} จำนวน{" "}
              {formatMoney(approveTarget.df_amount)} บาท ใช่หรือไม่?
            </p>
            <Field label="ผู้อนุมัติ" required>
              <input
                className={inputCls}
                value={approveBy}
                onChange={(e) => setApproveBy(e.target.value)}
              />
            </Field>
            {approveError && <ErrorBox message={approveError} />}
            <div className="flex justify-end gap-2">
              <button onClick={() => setApproveTarget(null)} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={approveLoading}
                className={btnPrimaryCls}
              >
                {approveLoading ? "กำลังบันทึก..." : "อนุมัติ"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Reverse */}
      <Modal
        open={!!reverseTarget}
        title="ยืนยันการกลับรายการ DF"
        onClose={() => setReverseTarget(null)}
      >
        {reverseTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              กลับรายการ DF #{reverseTarget.df_id} ของ VN {reverseTarget.vn} จำนวน{" "}
              {formatMoney(reverseTarget.df_amount)} บาท — จะสร้างรายการยอดติดลบใหม่
              และไม่สามารถกลับรายการซ้ำได้
            </p>
            <Field label="เหตุผลการกลับรายการ" required>
              <textarea
                className={inputCls}
                rows={3}
                value={reverseNote}
                onChange={(e) => setReverseNote(e.target.value)}
              />
            </Field>
            <Field label="ผู้ทำรายการ">
              <input
                className={inputCls}
                value={reverseBy}
                onChange={(e) => setReverseBy(e.target.value)}
              />
            </Field>
            {reverseError && <ErrorBox message={reverseError} />}
            <div className="flex justify-end gap-2">
              <button onClick={() => setReverseTarget(null)} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReverse}
                disabled={reverseLoading}
                className={btnDangerCls}
              >
                {reverseLoading ? "กำลังบันทึก..." : "กลับรายการ"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: อนุมัติทั้ง VN */}
      <Modal open={approveVnOpen} title="อนุมัติทั้ง VN" onClose={() => setApproveVnOpen(false)}>
        <div className="space-y-4">
          <Field label="VN" required>
            <input
              className={inputCls}
              value={approveVnVn}
              onChange={(e) => setApproveVnVn(e.target.value)}
            />
          </Field>
          <Field label="ผู้อนุมัติ" required>
            <input
              className={inputCls}
              value={approveVnBy}
              onChange={(e) => setApproveVnBy(e.target.value)}
            />
          </Field>
          {approveVnError && <ErrorBox message={approveVnError} />}
          {approveVnResult && <SuccessBox>{approveVnResult}</SuccessBox>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setApproveVnOpen(false)} className={btnSecondaryCls}>
              ปิด
            </button>
            <button
              onClick={handleConfirmApproveVn}
              disabled={approveVnLoading}
              className={btnPrimaryCls}
            >
              {approveVnLoading ? "กำลังบันทึก..." : "อนุมัติทั้งหมด"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: สร้างรายการ DF */}
      <Modal open={createOpen} title="สร้างรายการ DF" onClose={() => setCreateOpen(false)} wide>
        {createdId ? (
          <div className="space-y-4 text-center">
            <SuccessBox>สร้างรายการ DF สำเร็จ — รหัส DF: {createdId}</SuccessBox>
            <div className="flex justify-center gap-2">
              <button onClick={() => setCreateOpen(false)} className={btnSecondaryCls}>
                ปิด
              </button>
              <button onClick={handleCreateAgain} className={btnPrimaryCls}>
                สร้างรายการถัดไป
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  <Field label="VN" hint="กรอก VN แล้วขอคำแนะนำหมอที่เกี่ยวข้องกับ visit นี้">
                    <input
                      className={inputCls}
                      value={createForm.vn}
                      onChange={(e) => updateCreateForm("vn", e.target.value)}
                    />
                  </Field>
                </div>
                <button
                  onClick={handleSuggest}
                  disabled={suggestLoading}
                  className={btnSecondaryCls}
                >
                  {suggestLoading ? "กำลังค้นหา..." : "ขอคำแนะนำ"}
                </button>
              </div>
              {suggestError && (
                <div className="mt-2">
                  <ErrorBox message={suggestError} />
                </div>
              )}
              {suggestCandidates && (
                <div className="mt-2 space-y-2">
                  {suggestCandidates.length === 0 && (
                    <p className="text-sm text-slate-500">ไม่พบหมอที่เกี่ยวข้องกับ VN นี้</p>
                  )}
                  {suggestCandidates.map((c) => (
                    <div
                      key={c.doctor_code}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-800">
                          {c.doctor_code} — {doctorName(c)}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          ({c.sources.join(", ")})
                        </span>
                        {c.last_df_amount != null && (
                          <span className="ml-2 text-xs text-slate-400">
                            ครั้งก่อน {formatMoney(c.last_df_amount)} บาท
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyCandidate(c, false)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          ใช้หมอนี้
                        </button>
                        {c.last_df_amount != null && (
                          <button
                            onClick={() => applyCandidate(c, true)}
                            className="rounded-lg border border-teal-300 bg-white px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                          >
                            เท่าครั้งก่อน
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="รหัสแพทย์" required>
                <input
                  className={inputCls}
                  value={createForm.doctor_code}
                  onChange={(e) => updateCreateForm("doctor_code", e.target.value)}
                />
              </Field>
              <Field label="HN" required>
                <input
                  className={inputCls}
                  value={createForm.hn}
                  onChange={(e) => updateCreateForm("hn", e.target.value)}
                />
              </Field>
              <Field label="จำนวน DF (บาท)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={createForm.df_amount}
                  onChange={(e) => updateCreateForm("df_amount", e.target.value)}
                />
              </Field>
              <Field label="คอร์ส (course_id)" hint="ระบุถ้าเกี่ยวข้องกับคอร์ส">
                <input
                  className={inputCls}
                  value={createForm.course_id}
                  onChange={(e) => updateCreateForm("course_id", e.target.value)}
                />
              </Field>
              <Field label="ผู้บันทึก">
                <input
                  className={inputCls}
                  value={createForm.created_by}
                  onChange={(e) => updateCreateForm("created_by", e.target.value)}
                />
              </Field>
              <Field label="หมายเหตุ" hint="เช่น โบท็อกซ์ ครั้งที่ 5">
                <input
                  className={inputCls}
                  value={createForm.note}
                  onChange={(e) => updateCreateForm("note", e.target.value)}
                />
              </Field>
            </div>

            {createError && <ErrorBox message={createError} />}

            <div className="flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={createLoading}
                className={btnPrimaryCls}
              >
                {createLoading ? "กำลังบันทึก..." : "บันทึก DF"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
