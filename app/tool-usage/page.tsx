"use client";

import {
  useCallback,
  useEffect,
  useState,
  FormEvent,
  MouseEvent,
  ReactNode,
} from "react";
import AppShell from "@/components/AppShell";
import {
  PageHeader,
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
} from "@/components/ui";
import {
  listToolUsages,
  getToolUsage,
  createToolUsage,
  voidToolUsage,
  listClinicalTools,
  ToolUsage,
  ToolUsageCreateBody,
  ListToolUsageParams,
  ClinicalTool,
} from "@/lib/api/tools";
import { ApiError } from "@/lib/api";

const emptyFilters = {
  vn: "",
  hn: "",
  encounter_id: "",
  tool_code: "",
  doctor_code: "",
  staff_code: "",
  inv_id: "",
  include_voided: false,
  used_from: "",
  used_to: "",
  created_from: "",
  created_to: "",
};

const emptyForm = {
  tool_code: "",
  vn: "",
  encounter_id: "",
  doctor_code: "",
  staff_code: "",
  inv_id: "",
  used_date: "",
  usage_detail: "",
  note: "",
};

type FilterState = typeof emptyFilters;
type FormState = typeof emptyForm;
type SortBy =
  | "created_date"
  | "doctor_code"
  | "encounter_id"
  | "hn"
  | "inv_id"
  | "staff_id"
  | "status"
  | "usage_id"
  | "used_date"
  | "vn";

export default function ToolUsagePage() {
  const [usages, setUsages] = useState<ToolUsage[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("used_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [tools, setTools] = useState<ClinicalTool[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ToolUsage | null>(null);

  const [voidTarget, setVoidTarget] = useState<ToolUsage | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(
    async (params: ListToolUsageParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listToolUsages(params);
        setUsages(res.data);
        setTotalFound(res.total_found);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "ไม่สามารถโหลดประวัติการใช้เครื่องมือได้"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ sort_by: sortBy, sort_order: sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams(base: FilterState, by: SortBy, order: "asc" | "desc") {
    return {
      vn: base.vn || undefined,
      hn: base.hn || undefined,
      encounter_id: base.encounter_id ? Number(base.encounter_id) : undefined,
      tool_code: base.tool_code || undefined,
      doctor_code: base.doctor_code || undefined,
      staff_code: base.staff_code || undefined,
      inv_id: base.inv_id ? Number(base.inv_id) : undefined,
      include_voided: base.include_voided || undefined,
      used_from: base.used_from || undefined,
      used_to: base.used_to || undefined,
      created_from: base.created_from || undefined,
      created_to: base.created_to || undefined,
      sort_by: by,
      sort_order: order,
    };
  }

  function handleSearch() {
    load(buildParams(filters, sortBy, sortOrder));
  }

  function handleClear() {
    setFilters(emptyFilters);
    load(buildParams(emptyFilters, sortBy, sortOrder));
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(nextOrder);
    load(buildParams(filters, column, nextOrder));
  }

  async function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setCreatedId(null);
    setCreateOpen(true);
    try {
      const res = await listClinicalTools({ status: "active", limit: 100 });
      setTools(res.data);
    } catch {
      setTools([]);
    }
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !form.tool_code ||
      !form.vn ||
      !form.encounter_id ||
      !form.doctor_code ||
      !form.staff_code ||
      !form.inv_id
    ) {
      setFormError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const body: ToolUsageCreateBody = {
        tool_code: form.tool_code,
        vn: form.vn,
        encounter_id: Number(form.encounter_id),
        doctor_code: form.doctor_code,
        staff_code: form.staff_code,
        inv_id: Number(form.inv_id),
        used_date: form.used_date || undefined,
        usage_detail: form.usage_detail || undefined,
        note: form.note || undefined,
      };
      const res = await createToolUsage(body);
      setCreatedId(res.usage_id);
      load(buildParams(filters, sortBy, sortOrder));
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกการใช้เครื่องมือได้"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreateAgain() {
    setForm(emptyForm);
    setCreatedId(null);
    setFormError(null);
  }

  async function openDetail(usageId: number) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await getToolUsage(usageId);
      setDetail(res.data);
    } catch (err) {
      setDetailError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายละเอียดได้"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function askVoid(usage: ToolUsage, e: MouseEvent) {
    e.stopPropagation();
    setVoidTarget(usage);
    setVoidError(null);
  }

  async function confirmVoid() {
    if (!voidTarget) return;
    setVoiding(true);
    setVoidError(null);
    try {
      await voidToolUsage(voidTarget.usage_id);
      setVoidTarget(null);
      load(buildParams(filters, sortBy, sortOrder));
    } catch (err) {
      setVoidError(
        err instanceof ApiError ? err.message : "ไม่สามารถยกเลิกรายการได้"
      );
    } finally {
      setVoiding(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="ประวัติการใช้เครื่องมือ"
        subtitle="บันทึกและติดตามการใช้เครื่องมือทางคลินิกในหัตถการ"
        actions={
          <button className={btnPrimaryCls} onClick={openCreate}>
            บันทึกการใช้เครื่องมือ
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="VN"
            value={filters.vn}
            onChange={(e) => setFilters({ ...filters, vn: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="HN"
            value={filters.hn}
            onChange={(e) => setFilters({ ...filters, hn: e.target.value })}
            className={inputCls}
          />
          <input
            type="number"
            placeholder="Encounter ID"
            value={filters.encounter_id}
            onChange={(e) => setFilters({ ...filters, encounter_id: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="รหัสเครื่องมือ"
            value={filters.tool_code}
            onChange={(e) => setFilters({ ...filters, tool_code: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="รหัสแพทย์"
            value={filters.doctor_code}
            onChange={(e) => setFilters({ ...filters, doctor_code: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="รหัส staff"
            value={filters.staff_code}
            onChange={(e) => setFilters({ ...filters, staff_code: e.target.value })}
            className={inputCls}
          />
          <input
            type="number"
            placeholder="Inv ID"
            value={filters.inv_id}
            onChange={(e) => setFilters({ ...filters, inv_id: e.target.value })}
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={filters.include_voided}
              onChange={(e) =>
                setFilters({ ...filters, include_voided: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            รวมรายการที่ยกเลิกแล้ว
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              ใช้เครื่องตั้งแต่วันที่
            </span>
            <input
              type="date"
              value={filters.used_from}
              onChange={(e) => setFilters({ ...filters, used_from: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              ใช้เครื่องถึงวันที่
            </span>
            <input
              type="date"
              value={filters.used_to}
              onChange={(e) => setFilters({ ...filters, used_to: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              บันทึกตั้งแต่วันที่
            </span>
            <input
              type="date"
              value={filters.created_from}
              onChange={(e) => setFilters({ ...filters, created_from: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              บันทึกถึงวันที่
            </span>
            <input
              type="date"
              value={filters.created_to}
              onChange={(e) => setFilters({ ...filters, created_to: e.target.value })}
              className={inputCls}
            />
          </label>
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

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && usages.length === 0 && (
        <EmptyBox text="ไม่พบประวัติการใช้เครื่องมือ" />
      )}

      {!loading && !error && usages.length > 0 && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th onClick={() => handleSort("usage_id")} active={sortBy === "usage_id"} dir={sortOrder}>
                รหัส
              </Th>
              <Th onClick={() => handleSort("vn")} active={sortBy === "vn"} dir={sortOrder}>
                VN
              </Th>
              <Th onClick={() => handleSort("hn")} active={sortBy === "hn"} dir={sortOrder}>
                HN
              </Th>
              <Th>รหัสเครื่องมือ</Th>
              <Th onClick={() => handleSort("doctor_code")} active={sortBy === "doctor_code"} dir={sortOrder}>
                แพทย์
              </Th>
              <Th>Staff</Th>
              <Th onClick={() => handleSort("used_date")} active={sortBy === "used_date"} dir={sortOrder}>
                วันเวลาที่ใช้
              </Th>
              <Th onClick={() => handleSort("status")} active={sortBy === "status"} dir={sortOrder}>
                สถานะ
              </Th>
              <Th>การจัดการ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usages.map((usage) => (
              <tr
                key={usage.usage_id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => openDetail(usage.usage_id)}
              >
                <Td className="font-medium text-slate-800">{usage.usage_id}</Td>
                <Td>{usage.vn}</Td>
                <Td>{usage.hn ?? "-"}</Td>
                <Td>{usage.tool_code}</Td>
                <Td>{usage.doctor_code}</Td>
                <Td>{usage.staff_code}</Td>
                <Td>{formatDateTime(usage.used_date)}</Td>
                <Td>
                  <Badge tone={statusTone(usage.status)}>{usage.status}</Badge>
                </Td>
                <Td>
                  {usage.status !== "voided" && (
                    <button
                      className={btnDangerCls}
                      onClick={(e) => askVoid(usage, e)}
                    >
                      Void
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal open={createOpen} title="บันทึกการใช้เครื่องมือ" onClose={closeCreate} wide>
        {createdId ? (
          <div className="space-y-4">
            <SuccessBox>
              บันทึกสำเร็จ รหัสรายการ: <strong>{createdId}</strong>
            </SuccessBox>
            <div className="flex justify-end gap-2">
              <button className={btnSecondaryCls} onClick={handleCreateAgain}>
                บันทึกรายการถัดไป
              </button>
              <button className={btnPrimaryCls} onClick={closeCreate}>
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="เครื่องมือ" required>
                <select
                  value={form.tool_code}
                  onChange={(e) => setForm({ ...form, tool_code: e.target.value })}
                  className={selectCls}
                >
                  <option value="">- เลือกเครื่องมือ -</option>
                  {tools.map((tool) => (
                    <option key={tool.tool_id} value={tool.tool_code}>
                      {tool.tool_code} — {tool.tool_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="VN" required>
                <input
                  type="text"
                  value={form.vn}
                  onChange={(e) => setForm({ ...form, vn: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Encounter ID" required>
                <input
                  type="number"
                  value={form.encounter_id}
                  onChange={(e) => setForm({ ...form, encounter_id: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="รหัสแพทย์ผู้ทำหัตถการ" required>
                <input
                  type="text"
                  value={form.doctor_code}
                  onChange={(e) => setForm({ ...form, doctor_code: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="รหัส staff ผู้ใช้เครื่อง" required>
                <input
                  type="text"
                  value={form.staff_code}
                  onChange={(e) => setForm({ ...form, staff_code: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Inv ID" required hint="inv_id ของ item ใน patient_inventory">
                <input
                  type="number"
                  value={form.inv_id}
                  onChange={(e) => setForm({ ...form, inv_id: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="วันเวลาที่ใช้" hint="ไม่ระบุ = เวลาที่บันทึก">
                <input
                  type="datetime-local"
                  value={form.used_date}
                  onChange={(e) => setForm({ ...form, used_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="พารามิเตอร์การใช้งาน" hint="เช่น 300 shots / 2.0 J / หัว 4.5mm">
                <input
                  type="text"
                  value={form.usage_detail}
                  onChange={(e) => setForm({ ...form, usage_detail: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="หมายเหตุ">
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className={inputCls}
              />
            </Field>

            {formError && <ErrorBox message={formError} />}

            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondaryCls} onClick={closeCreate}>
                ยกเลิก
              </button>
              <button type="submit" disabled={submitting} className={btnPrimaryCls}>
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={detailOpen} title="รายละเอียดการใช้เครื่องมือ" onClose={() => setDetailOpen(false)}>
        {detailLoading && <LoadingBox />}
        {!detailLoading && detailError && <ErrorBox message={detailError} />}
        {!detailLoading && !detailError && detail && (
          <dl className="space-y-2 text-sm">
            <Row label="รหัสรายการ" value={detail.usage_id} />
            <Row label="VN" value={detail.vn} />
            <Row label="HN" value={detail.hn ?? "-"} />
            <Row label="รหัสเครื่องมือ" value={detail.tool_code} />
            <Row label="Encounter ID" value={detail.encounter_id} />
            <Row label="รหัสแพทย์" value={detail.doctor_code} />
            <Row label="รหัส staff" value={detail.staff_code} />
            <Row label="Inv ID" value={detail.inv_id} />
            <Row label="พารามิเตอร์การใช้งาน" value={detail.usage_detail ?? "-"} />
            <Row label="วันเวลาที่ใช้" value={formatDateTime(detail.used_date)} />
            <Row
              label="สถานะ"
              value={<Badge tone={statusTone(detail.status)}>{detail.status}</Badge>}
            />
            <Row label="หมายเหตุ" value={detail.note ?? "-"} />
            <Row label="บันทึกเมื่อ" value={formatDateTime(detail.created_date)} />
          </dl>
        )}
      </Modal>

      <Modal open={!!voidTarget} title="ยืนยันการยกเลิกรายการ" onClose={() => setVoidTarget(null)}>
        {voidTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ยืนยันการยกเลิกรายการใช้เครื่องมือ #{voidTarget.usage_id} (
              {voidTarget.tool_code} — VN {voidTarget.vn}) ใช่หรือไม่?
              การยกเลิกนี้จะไม่ลบข้อมูล แต่จะเปลี่ยนสถานะเป็นยกเลิก
            </p>
            {voidError && <ErrorBox message={voidError} />}
            <div className="flex justify-end gap-2">
              <button className={btnSecondaryCls} onClick={() => setVoidTarget(null)}>
                ยกเลิก
              </button>
              <button className={btnDangerCls} disabled={voiding} onClick={confirmVoid}>
                {voiding ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
