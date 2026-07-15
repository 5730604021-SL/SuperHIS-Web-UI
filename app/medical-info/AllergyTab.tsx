"use client";

import { useState, FormEvent } from "react";
import {
  Allergy,
  AllergyCreateBody,
  AllergyStatus,
  AllergyUpdateBody,
  createAllergy,
  listAllergies,
  updateAllergy,
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
import { ALLERGY_TYPE_OPTIONS, allergyTypeLabel } from "./constants";

const emptyCreateForm = { hn: "", drug_code: "", symptom: "", type: "", note: "" };

export default function AllergyTab() {
  const [hnInput, setHnInput] = useState("");
  const [filterHn, setFilterHn] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [rows, setRows] = useState<Allergy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editRow, setEditRow] = useState<Allergy | null>(null);
  const [editForm, setEditForm] = useState<AllergyUpdateBody>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function load(targetHn: string, inactive: boolean) {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await listAllergies({ hn: targetHn, include_inactive: inactive });
      setRows(res.data);
      setTotal(res.total_found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลแพ้ยาได้");
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
    const drugCode = createForm.drug_code.trim();
    if (!hn || !drugCode) {
      setCreateError("กรุณากรอก HN และรหัสยา");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const body: AllergyCreateBody = {
        hn,
        drug_code: drugCode,
        symptom: createForm.symptom || undefined,
        type: createForm.type || undefined,
        note: createForm.note || undefined,
      };
      await createAllergy(body);
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

  function openEdit(row: Allergy) {
    setEditRow(row);
    setEditForm({
      drug_code: row.drug_code,
      symptom: row.symptom ?? "",
      type: row.type ?? "",
      note: row.note ?? "",
      status: row.status,
    });
    setEditError(null);
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editRow) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await updateAllergy(editRow.allergy_id, editForm);
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
              + เพิ่มรายการแพ้ยา/แพ้อาหาร
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
        <EmptyBox text="กรอก HN แล้วกดค้นหาเพื่อดูรายการแพ้ยา/แพ้อาหาร" />
      )}
      {!loading && !error && searched && rows.length === 0 && (
        <EmptyBox text="ไม่พบรายการแพ้ยา/แพ้อาหารของผู้ป่วยรายนี้" />
      )}

      {!loading && !error && rows.length > 0 && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th>รหัสยา/กลุ่มยา</Th>
              <Th>ประเภท</Th>
              <Th>อาการที่แพ้</Th>
              <Th>หมายเหตุ</Th>
              <Th>สถานะ</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.allergy_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{row.drug_code}</Td>
                <Td>{allergyTypeLabel(row.type)}</Td>
                <Td>{row.symptom ?? "-"}</Td>
                <Td>{row.note ?? "-"}</Td>
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

      <Modal open={createOpen} title="เพิ่มรายการแพ้ยา/แพ้อาหาร" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Field label="HN" required>
            <input
              type="text"
              value={createForm.hn}
              onChange={(e) => setCreateForm((f) => ({ ...f, hn: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="รหัสยา/กลุ่มยา" required hint="default_code ของยาใน Odoo หรือ drug_category_code">
            <input
              type="text"
              value={createForm.drug_code}
              onChange={(e) => setCreateForm((f) => ({ ...f, drug_code: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="ประเภท">
            <select
              value={createForm.type}
              onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
              className={selectCls}
            >
              <option value="">- ไม่ระบุ -</option>
              {ALLERGY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="อาการที่แพ้">
            <input
              type="text"
              placeholder="เช่น ผื่นขึ้น หายใจลำบาก"
              value={createForm.symptom}
              onChange={(e) => setCreateForm((f) => ({ ...f, symptom: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="หมายเหตุ">
            <textarea
              value={createForm.note}
              onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
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
        title={`แก้ไขรายการแพ้ยา/แพ้อาหาร${editRow ? ` (#${editRow.allergy_id})` : ""}`}
        onClose={() => setEditRow(null)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Field label="รหัสยา/กลุ่มยา">
            <input
              type="text"
              value={editForm.drug_code ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, drug_code: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="ประเภท">
            <select
              value={editForm.type ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
              className={selectCls}
            >
              <option value="">- ไม่ระบุ -</option>
              {ALLERGY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="อาการที่แพ้">
            <input
              type="text"
              value={editForm.symptom ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, symptom: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="หมายเหตุ">
            <textarea
              value={editForm.note ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
              className={inputCls}
            />
          </Field>
          <Field label="สถานะ" hint="inactive = ปิดรายการ (ไม่ลบข้อมูลจริงเพื่อคง audit trail)">
            <select
              value={editForm.status ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, status: e.target.value as AllergyStatus }))
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
