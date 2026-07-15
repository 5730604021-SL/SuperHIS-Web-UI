"use client";

import { useCallback, useEffect, useState, FormEvent, ReactNode } from "react";
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
  formatDate,
  formatDateTime,
} from "@/components/ui";
import {
  listClinicalTools,
  getClinicalTool,
  registerClinicalTool,
  ClinicalTool,
  ClinicalToolRegisterBody,
  ListClinicalToolsParams,
} from "@/lib/api/tools";
import { ApiError } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "active", label: "ใช้งาน" },
  { value: "maintenance", label: "ส่งซ่อม/บำรุงรักษา" },
  { value: "retired", label: "ปลดระวาง" },
];

const emptyFilters = {
  tool_code: "",
  tool_name: "",
  category: "",
  brand: "",
  serial_no: "",
  location: "",
  status: "",
  warranty_expire_before: "",
};

const emptyForm = {
  tool_name: "",
  category: "",
  brand: "",
  model: "",
  serial_no: "",
  location: "",
  purchase_date: "",
  warranty_expire_date: "",
  note: "",
};

type FilterState = typeof emptyFilters;
type FormState = typeof emptyForm;
type SortBy =
  | "brand"
  | "category"
  | "created_date"
  | "purchase_date"
  | "status"
  | "tool_code"
  | "tool_id"
  | "tool_name"
  | "warranty_expire_date";

export default function ClinicalToolsPage() {
  const [tools, setTools] = useState<ClinicalTool[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("created_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [registerOpen, setRegisterOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredCode, setRegisteredCode] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClinicalTool | null>(null);

  const load = useCallback(
    async (params: ListClinicalToolsParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listClinicalTools(params);
        setTools(res.data);
        setTotalFound(res.total_found);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลเครื่องมือได้"
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
      tool_code: base.tool_code || undefined,
      tool_name: base.tool_name || undefined,
      category: base.category || undefined,
      brand: base.brand || undefined,
      serial_no: base.serial_no || undefined,
      location: base.location || undefined,
      status: (base.status || undefined) as ListClinicalToolsParams["status"],
      warranty_expire_before: base.warranty_expire_before || undefined,
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

  function openRegister() {
    setForm(emptyForm);
    setFormError(null);
    setRegisteredCode(null);
    setRegisterOpen(true);
  }

  function closeRegister() {
    setRegisterOpen(false);
  }

  async function handleRegisterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.tool_name.trim()) {
      setFormError("กรุณากรอกชื่อเครื่องมือ");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const body: ClinicalToolRegisterBody = {
        tool_name: form.tool_name,
        category: form.category || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        serial_no: form.serial_no || undefined,
        location: form.location || undefined,
        purchase_date: form.purchase_date || undefined,
        warranty_expire_date: form.warranty_expire_date || undefined,
        note: form.note || undefined,
      };
      const res = await registerClinicalTool(body);
      setRegisteredCode(res.tool_code);
      load(buildParams(filters, sortBy, sortOrder));
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "ไม่สามารถลงทะเบียนเครื่องมือได้"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleRegisterAgain() {
    setForm(emptyForm);
    setRegisteredCode(null);
    setFormError(null);
  }

  async function openDetail(toolId: number) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await getClinicalTool(toolId);
      setDetail(res.data);
    } catch (err) {
      setDetailError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายละเอียดเครื่องมือได้"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="เครื่องมือทางคลินิก"
        subtitle="ทะเบียนเครื่องมือ/อุปกรณ์ทางคลินิกของคลินิก"
        actions={
          <button className={btnPrimaryCls} onClick={openRegister}>
            ลงทะเบียนเครื่องมือ
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="รหัสเครื่องมือ"
            value={filters.tool_code}
            onChange={(e) => setFilters({ ...filters, tool_code: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="ชื่อเครื่องมือ"
            value={filters.tool_name}
            onChange={(e) => setFilters({ ...filters, tool_name: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="ประเภท เช่น hifu, laser"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="ยี่ห้อ"
            value={filters.brand}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="หมายเลขเครื่อง"
            value={filters.serial_no}
            onChange={(e) => setFilters({ ...filters, serial_no: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="ตำแหน่งที่ตั้ง/ห้อง"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className={inputCls}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={selectCls}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              หมดประกันก่อนวันที่
            </span>
            <input
              type="date"
              value={filters.warranty_expire_before}
              onChange={(e) =>
                setFilters({ ...filters, warranty_expire_before: e.target.value })
              }
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
      {!loading && !error && tools.length === 0 && <EmptyBox text="ไม่พบเครื่องมือ" />}

      {!loading && !error && tools.length > 0 && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th onClick={() => handleSort("tool_code")} active={sortBy === "tool_code"} dir={sortOrder}>
                รหัสเครื่องมือ
              </Th>
              <Th onClick={() => handleSort("tool_name")} active={sortBy === "tool_name"} dir={sortOrder}>
                ชื่อเครื่องมือ
              </Th>
              <Th onClick={() => handleSort("category")} active={sortBy === "category"} dir={sortOrder}>
                ประเภท
              </Th>
              <Th onClick={() => handleSort("brand")} active={sortBy === "brand"} dir={sortOrder}>
                ยี่ห้อ
              </Th>
              <Th>หมายเลขเครื่อง</Th>
              <Th>ตำแหน่งที่ตั้ง</Th>
              <Th onClick={() => handleSort("status")} active={sortBy === "status"} dir={sortOrder}>
                สถานะ
              </Th>
              <Th onClick={() => handleSort("warranty_expire_date")} active={sortBy === "warranty_expire_date"} dir={sortOrder}>
                หมดประกัน
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tools.map((tool) => (
              <tr
                key={tool.tool_id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => openDetail(tool.tool_id)}
              >
                <Td className="font-medium text-slate-800">{tool.tool_code}</Td>
                <Td>{tool.tool_name}</Td>
                <Td>{tool.category ?? "-"}</Td>
                <Td>{tool.brand ?? "-"}</Td>
                <Td>{tool.serial_no ?? "-"}</Td>
                <Td>{tool.location ?? "-"}</Td>
                <Td>
                  <Badge tone={statusTone(tool.status)}>{tool.status}</Badge>
                </Td>
                <Td>{formatDate(tool.warranty_expire_date)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={registerOpen}
        title="ลงทะเบียนเครื่องมือ"
        onClose={closeRegister}
        wide
      >
        {registeredCode ? (
          <div className="space-y-4">
            <SuccessBox>
              ลงทะเบียนสำเร็จ รหัสเครื่องมือ: <strong>{registeredCode}</strong>
            </SuccessBox>
            <div className="flex justify-end gap-2">
              <button className={btnSecondaryCls} onClick={handleRegisterAgain}>
                ลงทะเบียนเครื่องถัดไป
              </button>
              <button className={btnPrimaryCls} onClick={closeRegister}>
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <Field label="ชื่อเครื่องมือ" required>
              <input
                type="text"
                value={form.tool_name}
                onChange={(e) => setForm({ ...form, tool_name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ประเภท" hint="เช่น hifu, laser, rf, ipl, สุขภาพทั่วไป">
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="ยี่ห้อ">
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="รุ่น">
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="หมายเลขเครื่อง (Serial No)">
                <input
                  type="text"
                  value={form.serial_no}
                  onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="ตำแหน่งที่ตั้ง/ห้อง">
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="วันที่ซื้อ">
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="วันหมดประกัน">
                <input
                  type="date"
                  value={form.warranty_expire_date}
                  onChange={(e) =>
                    setForm({ ...form, warranty_expire_date: e.target.value })
                  }
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
              <button type="button" className={btnSecondaryCls} onClick={closeRegister}>
                ยกเลิก
              </button>
              <button type="submit" disabled={submitting} className={btnPrimaryCls}>
                {submitting ? "กำลังบันทึก..." : "ลงทะเบียน"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={detailOpen} title="รายละเอียดเครื่องมือ" onClose={() => setDetailOpen(false)}>
        {detailLoading && <LoadingBox />}
        {!detailLoading && detailError && <ErrorBox message={detailError} />}
        {!detailLoading && !detailError && detail && (
          <dl className="space-y-2 text-sm">
            <Row label="รหัสเครื่องมือ" value={detail.tool_code} />
            <Row label="ชื่อเครื่องมือ" value={detail.tool_name} />
            <Row label="ประเภท" value={detail.category ?? "-"} />
            <Row label="ยี่ห้อ" value={detail.brand ?? "-"} />
            <Row label="รุ่น" value={detail.model ?? "-"} />
            <Row label="หมายเลขเครื่อง" value={detail.serial_no ?? "-"} />
            <Row label="ตำแหน่งที่ตั้ง" value={detail.location ?? "-"} />
            <Row
              label="สถานะ"
              value={<Badge tone={statusTone(detail.status)}>{detail.status}</Badge>}
            />
            <Row label="วันที่ซื้อ" value={formatDate(detail.purchase_date)} />
            <Row label="วันหมดประกัน" value={formatDate(detail.warranty_expire_date)} />
            <Row label="หมายเหตุ" value={detail.note ?? "-"} />
            <Row label="วันที่ลงทะเบียน" value={formatDateTime(detail.created_date)} />
          </dl>
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
