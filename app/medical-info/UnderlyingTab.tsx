"use client";

import { useState, FormEvent } from "react";
import {
  Underlying,
  UnderlyingCreateBody,
  UnderlyingStatus,
  UnderlyingUpdateBody,
  createUnderlying,
  listUnderlying,
  updateUnderlying,
} from "@/lib/api/medical-info";
import {
  Badge,
  statusTone,
  Field,
  ErrorBox,
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
} from "@/components/ui";

const emptyCreateForm = { hn: "", detail: "" };

export default function UnderlyingTab() {
  const [hnInput, setHnInput] = useState("");
  const [filterHn, setFilterHn] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [rows, setRows] = useState<Underlying[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editRow, setEditRow] = useState<Underlying | null>(null);
  const [editForm, setEditForm] = useState<UnderlyingUpdateBody>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function load(targetHn: string, inactive: boolean) {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await listUnderlying({ hn: targetHn, include_inactive: inactive });
      setRows(res.data);
      setTotal(res.total_found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลโรคประจำตัวได้");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    const trimmed = hnInput.trim();
    if (!trimmed) {
      setError("กรุณากรอก HN");
      return;
    }
    setFilterHn(trimmed);
    void load(trimmed, includeInactive);
  }

  function handleClear() {
    setHnInput("");
    setFilterHn("");
    setIncludeInactive(false);
    setRows([]);
    setTotal(0);
    setError(null);
    setSearched(false);
  }

  function handleToggleIncludeInactive(checked: boolean) {
    setIncludeInactive(checked);
    if (filterHn) void load(filterHn, checked);
  }

  function openCreate() {
    setCreateForm({ ...emptyCreateForm, hn: filterHn || hnInput.trim() });
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hn = createForm.hn.trim();
    const detail = createForm.detail.trim();
    if (!hn || !detail) {
      setCreateError("กรุณากรอก HN และโรคประจำตัว");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const body: UnderlyingCreateBody = { hn, detail };
      await createUnderlying(body);
      setCreateOpen(false);
      setHnInput(hn);
      setFilterHn(hn);
      void load(hn, includeInactive);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "ไม่สามารถบันทึกได้");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(row: Underlying) {
    setEditRow(row);
    setEditForm({ detail: row.detail, status: row.status });
    setEditError(null);
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editRow) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await updateUnderlying(editRow.underlying_id, editForm);
      setEditRow(null);
      void load(filterHn, includeInactive);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "ไม่สามารถแก้ไขได้");
    } finally {
      setEditLoading(false);
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
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className={inputCls}
            />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => handleToggleIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            รวมรายการที่ปิดแล้ว
          </label>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} className={btnPrimaryCls}>
              ค้นหา
            </button>
            <button onClick={handleClear} className={btnSecondaryCls}>
              ล้าง
            </button>
          </div>
          <div className="flex items-end justify-end">
            <button onClick={openCreate} className={btnPrimaryCls}>
              + เพิ่มโรคประจำตัว
            </button>
          </div>
        </div>
      </div>

      {searched && !loading && !error && (
        <p className="mb-3 text-sm text-slate-500">
          พบ {total.toLocaleString("th-TH")} รายการ
        </p>
      )}

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && !searched && (
        <EmptyBox text="กรอก HN แล้วกดค้นหาเพื่อดูรายการโรคประจำตัว" />
      )}
      {!loading && !error && searched && rows.length === 0 && (
        <EmptyBox text="ไม่พบรายการโรคประจำตัวของผู้ป่วยรายนี้" />
      )}

      {!loading && !error && rows.length > 0 && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th>โรคประจำตัว</Th>
              <Th>สถานะ</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.underlying_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{row.detail}</Td>
                <Td>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                </Td>
                <Td>
                  <button
                    onClick={() => openEdit(row)}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    แก้ไข
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal open={createOpen} title="เพิ่มโรคประจำตัว" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Field label="HN" required>
            <input
              type="text"
              value={createForm.hn}
              onChange={(e) => setCreateForm((f) => ({ ...f, hn: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="โรคประจำตัว" required hint="เช่น เบาหวาน ความดันโลหิตสูง ตั้งครรภ์">
            <input
              type="text"
              value={createForm.detail}
              onChange={(e) => setCreateForm((f) => ({ ...f, detail: e.target.value }))}
              className={inputCls}
            />
          </Field>
          {createError && <ErrorBox message={createError} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className={btnSecondaryCls}>
              ยกเลิก
            </button>
            <button type="submit" disabled={createLoading} className={btnPrimaryCls}>
              {createLoading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editRow !== null}
        title={`แก้ไขโรคประจำตัว${editRow ? ` (#${editRow.underlying_id})` : ""}`}
        onClose={() => setEditRow(null)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Field label="โรคประจำตัว">
            <input
              type="text"
              value={editForm.detail ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, detail: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="สถานะ" hint="inactive = ปิดรายการ (soft delete)">
            <select
              value={editForm.status ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, status: e.target.value as UnderlyingStatus }))
              }
              className={selectCls}
            >
              <option value="active">ใช้งาน (active)</option>
              <option value="inactive">ปิดรายการ (inactive)</option>
            </select>
          </Field>
          {editError && <ErrorBox message={editError} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditRow(null)} className={btnSecondaryCls}>
              ยกเลิก
            </button>
            <button type="submit" disabled={editLoading} className={btnPrimaryCls}>
              {editLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
