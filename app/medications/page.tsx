"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import {
  listMedicationOrders,
  getMedicationOrdersByVn,
  updateMedicationOrder,
  updateMedicationStatus,
  MedicationOrder,
  MedicationOrderByVnEncounter,
  MedicationItemCreate,
  MedicationOrderListStatus,
  MedicationOrderStatus,
  ListMedicationOrdersParams,
  MEDICATION_ORDER_STATUS_OPTIONS,
  MEDICATION_NEW_STATUS_OPTIONS,
} from "@/lib/api/medications";
import {
  PageHeader,
  Card,
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
  formatDateTime,
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

function itemsToEditable(items: MedicationOrder["items"]): MedicationItemCreate[] {
  if (!items || items.length === 0) return [emptyItem()];
  return items.map((it) => ({
    product_id: it.product_id,
    quantity: it.quantity,
    dose: it.dose ?? "",
    frequency: it.frequency ?? "",
    timing: it.timing ?? "",
    route: it.route ?? "",
    duration_days: it.duration_days ?? undefined,
    instruction: it.instruction ?? "",
  }));
}

export default function MedicationsPage() {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [medicationOrderId, setMedicationOrderId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [hn, setHn] = useState("");
  const [vn, setVn] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [status, setStatus] = useState<MedicationOrderListStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // VN quick lookup
  const [lookupVn, setLookupVn] = useState("");
  const [lookupStatus, setLookupStatus] = useState<MedicationOrderListStatus | "">("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<MedicationOrderByVnEncounter[] | null>(null);

  // Edit modal
  const [editOrder, setEditOrder] = useState<MedicationOrder | null>(null);
  const [editDoctorCode, setEditDoctorCode] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editItems, setEditItems] = useState<MedicationItemCreate[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status modal
  const [statusOrder, setStatusOrder] = useState<MedicationOrder | null>(null);
  const [newStatus, setNewStatus] = useState<MedicationOrderStatus>("dispensed");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const buildParams = useCallback((): ListMedicationOrdersParams => ({
    medication_order_id: medicationOrderId || undefined,
    encounter_id: encounterId ? Number(encounterId) : undefined,
    hn: hn || undefined,
    vn: vn || undefined,
    doctor_code: doctorCode || undefined,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [medicationOrderId, encounterId, hn, vn, doctorCode, status, dateFrom, dateTo]);

  const load = useCallback(async (params: ListMedicationOrdersParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMedicationOrders(params);
      setOrders(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดใบสั่งยาได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    void load(buildParams());
  }

  function handleClear() {
    setMedicationOrderId("");
    setEncounterId("");
    setHn("");
    setVn("");
    setDoctorCode("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    void load({});
  }

  async function handleVnLookup() {
    if (!lookupVn) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await getMedicationOrdersByVn(lookupVn, lookupStatus || undefined);
      setLookupResult(res.data);
    } catch (err) {
      setLookupResult(null);
      setLookupError(err instanceof ApiError ? err.message : "ไม่สามารถค้นหาใบสั่งยาตาม VN ได้");
    } finally {
      setLookupLoading(false);
    }
  }

  function openEdit(order: MedicationOrder) {
    setEditOrder(order);
    setEditDoctorCode(order.doctor_code ?? "");
    setEditNote(order.note ?? "");
    setEditItems(itemsToEditable(order.items));
    setEditError(null);
  }

  function closeEdit() {
    setEditOrder(null);
    setEditError(null);
  }

  function updateEditItem(idx: number, patch: Partial<MedicationItemCreate>) {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addEditItem() {
    setEditItems((prev) => [...prev, emptyItem()]);
  }

  function removeEditItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitEdit() {
    if (!editOrder) return;
    setEditError(null);

    const items = editItems
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

    if (items.length === 0) {
      setEditError("ต้องมีรายการยาอย่างน้อย 1 รายการ (product_id และ quantity ต้องมากกว่า 0)");
      return;
    }

    setEditLoading(true);
    try {
      await updateMedicationOrder(editOrder.medication_order_id, {
        doctor_code: editDoctorCode || undefined,
        note: editNote || undefined,
        items,
      });
      closeEdit();
      void load(buildParams());
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกการแก้ไขได้");
    } finally {
      setEditLoading(false);
    }
  }

  function openStatus(order: MedicationOrder) {
    setStatusOrder(order);
    setNewStatus("dispensed");
    setStatusError(null);
  }

  function closeStatus() {
    setStatusOrder(null);
    setStatusError(null);
  }

  async function submitStatus() {
    if (!statusOrder) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      await updateMedicationStatus({
        medication_order_id: statusOrder.medication_order_id,
        status: newStatus,
      });
      closeStatus();
      void load(buildParams());
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "ไม่สามารถเปลี่ยนสถานะได้");
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="ใบสั่งยา (Medication Orders)"
        actions={
          <Link href="/medications/new" className={btnPrimaryCls}>
            + สั่งยาใหม่
          </Link>
        }
      />

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">
          ค้นหาด่วนตาม VN
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="VN">
            <input
              className={inputCls}
              value={lookupVn}
              onChange={(e) => setLookupVn(e.target.value)}
              placeholder="เลข Visit Number"
            />
          </Field>
          <Field label="สถานะ">
            <select
              className={selectCls}
              value={lookupStatus}
              onChange={(e) => setLookupStatus(e.target.value as MedicationOrderListStatus | "")}
            >
              <option value="">ทั้งหมด</option>
              {MEDICATION_ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              onClick={handleVnLookup}
              disabled={lookupLoading || !lookupVn}
              className={`${btnPrimaryCls} w-full`}
            >
              {lookupLoading ? "กำลังค้นหา..." : "ค้นหา"}
            </button>
          </div>
        </div>

        {lookupError && <div className="mt-3"><ErrorBox message={lookupError} /></div>}

        {lookupResult && (
          <div className="mt-4 space-y-4">
            {lookupResult.length === 0 && <EmptyBox text="ไม่พบใบสั่งยาสำหรับ VN นี้" />}
            {lookupResult.map((enc) => (
              <div key={enc.encounter_id} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Encounter #{enc.encounter_id} {enc.vn ? `— VN ${enc.vn}` : ""}
                </p>
                {enc.medication_orders.length === 0 ? (
                  <p className="text-sm text-slate-400">ไม่มีใบสั่งยา</p>
                ) : (
                  <ul className="space-y-2">
                    {enc.medication_orders.map((mo) => (
                      <li key={mo.medication_order_id} className="rounded-md bg-slate-50 p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {mo.medication_order_id}
                          </span>
                          <Badge tone={statusTone(mo.status)}>{mo.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {mo.items.length} รายการยา
                          {mo.doctor_code ? ` · แพทย์ ${mo.doctor_code}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="รหัสใบสั่งยา">
            <input
              className={inputCls}
              value={medicationOrderId}
              onChange={(e) => setMedicationOrderId(e.target.value)}
              placeholder="MO-20250101-0001"
            />
          </Field>
          <Field label="Encounter ID">
            <input
              type="number"
              className={inputCls}
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
            />
          </Field>
          <Field label="HN">
            <input className={inputCls} value={hn} onChange={(e) => setHn(e.target.value)} />
          </Field>
          <Field label="VN">
            <input className={inputCls} value={vn} onChange={(e) => setVn(e.target.value)} />
          </Field>
          <Field label="รหัสแพทย์">
            <input
              className={inputCls}
              value={doctorCode}
              onChange={(e) => setDoctorCode(e.target.value)}
            />
          </Field>
          <Field label="สถานะ">
            <select
              className={selectCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as MedicationOrderListStatus | "")}
            >
              <option value="">ทั้งหมด</option>
              {MEDICATION_ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="วันที่สั่งตั้งแต่">
            <input
              type="date"
              className={inputCls}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Field>
          <Field label="วันที่สั่งถึง">
            <input
              type="date"
              className={inputCls}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
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
      </Card>

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && orders.length === 0 && <EmptyBox text="ไม่พบใบสั่งยา" />}

      {!loading && !error && orders.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>รหัสใบสั่งยา</Th>
              <Th>VN</Th>
              <Th>HN</Th>
              <Th>แพทย์</Th>
              <Th>สถานะ</Th>
              <Th>จำนวนรายการยา</Th>
              <Th>วันที่สั่ง</Th>
              <Th>การทำงาน</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.medication_order_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{o.medication_order_id}</Td>
                <Td>{o.vn ?? "-"}</Td>
                <Td>{o.hn ?? "-"}</Td>
                <Td>{o.doctor_code ?? "-"}</Td>
                <Td>
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                </Td>
                <Td>{o.items?.length ?? 0}</Td>
                <Td>{formatDateTime(o.created_date)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(o)}
                      disabled={o.status !== "ordered"}
                      className={btnSecondaryCls}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => openStatus(o)}
                      disabled={o.status !== "ordered"}
                      className={btnPrimaryCls}
                    >
                      เปลี่ยนสถานะ
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal open={!!editOrder} title={`แก้ไขใบสั่งยา ${editOrder?.medication_order_id ?? ""}`} onClose={closeEdit} wide>
        {editOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="รหัสแพทย์" hint="ไม่ระบุ = คงค่าเดิม">
                <input
                  className={inputCls}
                  value={editDoctorCode}
                  onChange={(e) => setEditDoctorCode(e.target.value)}
                />
              </Field>
              <Field label="หมายเหตุ" hint="ไม่ระบุ = คงค่าเดิม">
                <input
                  className={inputCls}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">รายการยา (แทนที่ทั้งชุด)</span>
                <button onClick={addEditItem} className={btnSecondaryCls}>
                  + เพิ่มรายการ
                </button>
              </div>
              <div className="space-y-3">
                {editItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Field label="Product ID">
                        <input
                          type="number"
                          className={inputCls}
                          value={item.product_id || ""}
                          onChange={(e) => updateEditItem(idx, { product_id: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="จำนวน">
                        <input
                          type="number"
                          className={inputCls}
                          value={item.quantity || ""}
                          onChange={(e) => updateEditItem(idx, { quantity: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="ครั้งละ (dose)">
                        <input
                          className={inputCls}
                          value={item.dose ?? ""}
                          onChange={(e) => updateEditItem(idx, { dose: e.target.value })}
                        />
                      </Field>
                      <Field label="ความถี่">
                        <input
                          className={inputCls}
                          value={item.frequency ?? ""}
                          onChange={(e) => updateEditItem(idx, { frequency: e.target.value })}
                        />
                      </Field>
                      <Field label="เวลา (timing)">
                        <input
                          className={inputCls}
                          value={item.timing ?? ""}
                          onChange={(e) => updateEditItem(idx, { timing: e.target.value })}
                        />
                      </Field>
                      <Field label="วิธีใช้ (route)">
                        <input
                          className={inputCls}
                          value={item.route ?? ""}
                          onChange={(e) => updateEditItem(idx, { route: e.target.value })}
                        />
                      </Field>
                      <Field label="จำนวนวันที่ใช้">
                        <input
                          type="number"
                          className={inputCls}
                          value={item.duration_days ?? ""}
                          onChange={(e) =>
                            updateEditItem(idx, {
                              duration_days: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </Field>
                      <Field label="คำแนะนำเพิ่มเติม">
                        <input
                          className={inputCls}
                          value={item.instruction ?? ""}
                          onChange={(e) => updateEditItem(idx, { instruction: e.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => removeEditItem(idx)}
                        disabled={editItems.length <= 1}
                        className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        ลบรายการนี้
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editError && <ErrorBox message={editError} />}

            <div className="flex justify-end gap-2">
              <button onClick={closeEdit} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button onClick={submitEdit} disabled={editLoading} className={btnPrimaryCls}>
                {editLoading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!statusOrder} title={`เปลี่ยนสถานะใบสั่งยา ${statusOrder?.medication_order_id ?? ""}`} onClose={closeStatus}>
        {statusOrder && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              สถานะปัจจุบัน: <Badge tone={statusTone(statusOrder.status)}>{statusOrder.status}</Badge>
            </p>
            <Field label="สถานะใหม่" required>
              <select
                className={selectCls}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as MedicationOrderStatus)}
              >
                {MEDICATION_NEW_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            {statusError && <ErrorBox message={statusError} />}

            <div className="flex justify-end gap-2">
              <button onClick={closeStatus} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button onClick={submitStatus} disabled={statusLoading} className={btnPrimaryCls}>
                {statusLoading ? "กำลังบันทึก..." : "ยืนยันเปลี่ยนสถานะ"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
