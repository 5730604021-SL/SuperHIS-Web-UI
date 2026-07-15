"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Badge,
  BadgeTone,
  Card,
  ErrorBox,
  Field,
  LoadingBox,
  Modal,
  PageHeader,
  SuccessBox,
  TableShell,
  Td,
  Th,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDateTime,
  formatMoney,
  inputCls,
  selectCls,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  CreateInvoiceResponse,
  InvoiceCreateBody,
  ListOrdersParams,
  Order,
  OrderSortBy,
  PaymentStatusResponse,
  createInvoice,
  deleteOrder,
  getPaymentStatus,
  listOrders,
} from "@/lib/api/orders";

const ORDER_STATE_LABEL: Record<string, string> = {
  draft: "ร่าง",
  sale: "ยืนยันแล้ว",
  done: "เสร็จสิ้น",
  cancel: "ยกเลิก",
};

function orderStateTone(state: string): BadgeTone {
  if (state === "done") return "green";
  if (state === "sale") return "blue";
  if (state === "draft") return "amber";
  if (state === "cancel") return "red";
  return "gray";
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "ชำระครบแล้ว",
  unpaid: "ยังไม่ชำระ",
  partial_paid: "ชำระบางส่วน",
};

function paymentStatusTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "partial_paid") return "amber";
  if (status === "unpaid") return "red";
  return "gray";
}

function partnerLabel(partnerId: Order["partner_id"]): string {
  return partnerId ? partnerId[1] : "-";
}

const DEFAULT_LIMIT = 20;

const emptyFilters: ListOrdersParams = {
  limit: DEFAULT_LIMIT,
  offset: 0,
  sort_by: "date_order",
  sort_order: "desc",
};

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ListOrdersParams>(emptyFilters);

  // draft inputs, only applied to `filters` on ค้นหา
  const [stateInput, setStateInput] = useState("");
  const [partnerIdInput, setPartnerIdInput] = useState("");

  const [expandedId, setExpandedId] = useState<number | null>(null);

  // สถานะชำระเงิน
  const [paymentTarget, setPaymentTarget] = useState<Order | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // ออกใบแจ้งหนี้
  const [invoiceTarget, setInvoiceTarget] = useState<Order | null>(null);
  const [invoiceMode, setInvoiceMode] = useState<"full" | "down">("full");
  const [depositType, setDepositType] = useState<"amount" | "percent">("amount");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPercent, setDepositPercent] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceResult, setInvoiceResult] = useState<CreateInvoiceResponse | null>(null);

  // ลบ
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOrders(filters);
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลออเดอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function handleSearch() {
    setFilters({
      ...filters,
      offset: 0,
      state: stateInput || undefined,
      partner_id: partnerIdInput ? Number(partnerIdInput) : undefined,
    });
  }

  function handleClear() {
    setStateInput("");
    setPartnerIdInput("");
    setFilters(emptyFilters);
  }

  function handleSort(column: OrderSortBy) {
    const nextOrder: "asc" | "desc" =
      filters.sort_by === column && filters.sort_order === "asc" ? "desc" : "asc";
    setFilters({ ...filters, sort_by: column, sort_order: nextOrder });
  }

  function handlePrevPage() {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const offset = Math.max((filters.offset ?? 0) - limit, 0);
    setFilters({ ...filters, offset });
  }

  function handleNextPage() {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const offset = (filters.offset ?? 0) + limit;
    setFilters({ ...filters, offset });
  }

  function toggleExpand(orderId: number) {
    setExpandedId((prev) => (prev === orderId ? null : orderId));
  }

  // --- สถานะชำระเงิน ---
  async function openPaymentModal(order: Order) {
    setPaymentTarget(order);
    setPaymentData(null);
    setPaymentError(null);
    setPaymentLoading(true);
    try {
      const res = await getPaymentStatus(order.id);
      setPaymentData(res);
    } catch (err) {
      setPaymentError(
        err instanceof ApiError ? err.message : "ไม่สามารถตรวจสถานะการชำระเงินได้"
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  function closePaymentModal() {
    setPaymentTarget(null);
  }

  // --- ออกใบแจ้งหนี้ ---
  function openInvoiceModal(order: Order) {
    setInvoiceTarget(order);
    setInvoiceMode("full");
    setDepositType("amount");
    setDepositAmount("");
    setDepositPercent("");
    setInvoiceError(null);
    setInvoiceResult(null);
  }

  function closeInvoiceModal() {
    setInvoiceTarget(null);
  }

  async function handleConfirmInvoice() {
    if (!invoiceTarget) return;
    setInvoiceError(null);

    const body: InvoiceCreateBody = { order_id: invoiceTarget.id, mode: invoiceMode };
    if (invoiceMode === "down") {
      if (depositType === "amount") {
        if (!depositAmount || Number(depositAmount) <= 0) {
          setInvoiceError("กรุณาระบุจำนวนเงินมัดจำ");
          return;
        }
        body.amount = Number(depositAmount);
      } else {
        if (!depositPercent || Number(depositPercent) <= 0 || Number(depositPercent) > 100) {
          setInvoiceError("กรุณาระบุเปอร์เซ็นต์มัดจำ (0-100)");
          return;
        }
        body.amount_percent = Number(depositPercent);
      }
    }

    setInvoiceLoading(true);
    try {
      const res = await createInvoice(body);
      setInvoiceResult(res);
      await load();
    } catch (err) {
      setInvoiceError(err instanceof ApiError ? err.message : "ไม่สามารถออกใบแจ้งหนี้ได้");
    } finally {
      setInvoiceLoading(false);
    }
  }

  // --- ลบออเดอร์ ---
  function openDeleteModal(order: Order) {
    setDeleteTarget(order);
    setDeleteError(null);
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setDeleteTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteOrder(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "ไม่สามารถลบออเดอร์ได้");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Order / ใบแจ้งหนี้ / การชำระเงิน"
        subtitle="ค้นหาออเดอร์, ตรวจสถานะชำระเงิน และออกใบแจ้งหนี้"
        actions={
          <Link href="/orders/new" className={btnPrimaryCls}>
            + สร้างออเดอร์ใหม่
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="สถานะ">
            <select
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              className={selectCls}
            >
              <option value="">ทั้งหมด</option>
              <option value="draft">ร่าง</option>
              <option value="sale">ยืนยันแล้ว</option>
              <option value="done">เสร็จสิ้น</option>
              <option value="cancel">ยกเลิก</option>
            </select>
          </Field>
          <Field label="Partner ID (Odoo)">
            <input
              type="number"
              value={partnerIdInput}
              onChange={(e) => setPartnerIdInput(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="จำนวนต่อหน้า">
            <select
              value={String(filters.limit ?? DEFAULT_LIMIT)}
              onChange={(e) =>
                setFilters({ ...filters, limit: Number(e.target.value), offset: 0 })
              }
              className={selectCls}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} className={`flex-1 ${btnPrimaryCls}`}>
              ค้นหา
            </button>
            <button onClick={handleClear} className={`flex-1 ${btnSecondaryCls}`}>
              ล้าง
            </button>
          </div>
        </div>
      </Card>

      <p className="mb-3 text-sm text-slate-500">แสดง {rows.length.toLocaleString("th-TH")} รายการ</p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}

      {!loading && !error && (
        <>
          <TableShell>
            <thead className="bg-slate-50">
              <tr>
                <Th
                  onClick={() => handleSort("name")}
                  active={filters.sort_by === "name"}
                  dir={filters.sort_order}
                >
                  เลขที่ออเดอร์
                </Th>
                <Th>HN</Th>
                <Th>ผู้รับบริการ</Th>
                <Th
                  onClick={() => handleSort("date_order")}
                  active={filters.sort_by === "date_order"}
                  dir={filters.sort_order}
                >
                  วันที่
                </Th>
                <Th
                  onClick={() => handleSort("state")}
                  active={filters.sort_by === "state"}
                  dir={filters.sort_order}
                >
                  สถานะ
                </Th>
                <Th
                  onClick={() => handleSort("amount_total")}
                  active={filters.sort_by === "amount_total"}
                  dir={filters.sort_order}
                >
                  ยอดรวม
                </Th>
                <Th>รายการ</Th>
                <Th>การดำเนินการ</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    ไม่พบข้อมูลออเดอร์
                  </td>
                </tr>
              )}
              {rows.map((order) => (
                <Fragment key={order.id}>
                  <tr className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-800">
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="text-teal-700 hover:underline"
                        title="ดูรายการสินค้าในออเดอร์นี้"
                      >
                        {order.name}
                      </button>
                    </Td>
                    <Td>{order.hn}</Td>
                    <Td>{partnerLabel(order.partner_id)}</Td>
                    <Td>{formatDateTime(order.date_order)}</Td>
                    <Td>
                      <Badge tone={orderStateTone(order.state)}>
                        {ORDER_STATE_LABEL[order.state] ?? order.state}
                      </Badge>
                    </Td>
                    <Td>{formatMoney(order.amount_total)}</Td>
                    <Td>{order.items.length}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openPaymentModal(order)}
                          className={btnSecondaryCls}
                        >
                          สถานะชำระเงิน
                        </button>
                        <button
                          onClick={() => openInvoiceModal(order)}
                          className={btnPrimaryCls}
                        >
                          ออกใบแจ้งหนี้
                        </button>
                        <button
                          onClick={() => openDeleteModal(order)}
                          className={btnDangerCls}
                        >
                          ลบ
                        </button>
                      </div>
                    </Td>
                  </tr>
                  {expandedId === order.id && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 px-4 py-3">
                        {order.items.length === 0 ? (
                          <p className="text-sm text-slate-400">ไม่มีรายการสินค้า</p>
                        ) : (
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-2 py-1">สินค้า</th>
                                <th className="px-2 py-1">จำนวน</th>
                                <th className="px-2 py-1">ราคา/หน่วย</th>
                                <th className="px-2 py-1">รวม</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {order.items.map((line) => (
                                <tr key={line.id}>
                                  <td className="px-2 py-1 text-slate-700">
                                    {line.product_id ? line.product_id[1] : line.name}
                                  </td>
                                  <td className="px-2 py-1 text-slate-700">
                                    {line.product_uom_qty}
                                  </td>
                                  <td className="px-2 py-1 text-slate-700">
                                    {formatMoney(line.price_unit)}
                                  </td>
                                  <td className="px-2 py-1 text-slate-700">
                                    {formatMoney(line.price_subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </TableShell>

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={handlePrevPage}
              disabled={(filters.offset ?? 0) === 0}
              className={btnSecondaryCls}
            >
              ก่อนหน้า
            </button>
            <button
              onClick={handleNextPage}
              disabled={rows.length < (filters.limit ?? DEFAULT_LIMIT)}
              className={btnSecondaryCls}
            >
              ถัดไป
            </button>
          </div>
        </>
      )}

      {/* Modal: สถานะชำระเงิน */}
      <Modal
        open={paymentTarget !== null}
        title={`สถานะชำระเงิน — ${paymentTarget?.name ?? ""}`}
        onClose={closePaymentModal}
      >
        {paymentLoading && <LoadingBox />}
        {!paymentLoading && paymentError && <ErrorBox message={paymentError} />}
        {!paymentLoading && !paymentError && paymentData && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">สถานะ</span>
              <Badge tone={paymentStatusTone(paymentData.status)}>
                {PAYMENT_STATUS_LABEL[paymentData.status] ?? paymentData.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ยอดค้างชำระ</span>
              <span className="font-medium text-slate-800">
                {formatMoney(paymentData.remaining_amount)} บาท
              </span>
            </div>
            <div>
              <p className="mb-1 text-slate-500">Invoice ที่ชำระแล้ว</p>
              {paymentData.paid_invoices.length === 0 ? (
                <p className="text-slate-400">- ไม่มี -</p>
              ) : (
                <ul className="list-inside list-disc text-slate-700">
                  {paymentData.paid_invoices.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-slate-500">Invoice ที่ยังค้างชำระ</p>
              {paymentData.remaining_invoices.length === 0 ? (
                <p className="text-slate-400">- ไม่มี -</p>
              ) : (
                <ul className="list-inside list-disc text-slate-700">
                  {paymentData.remaining_invoices.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={closePaymentModal} className={btnSecondaryCls}>
                ปิด
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: ออกใบแจ้งหนี้ */}
      <Modal
        open={invoiceTarget !== null}
        title={`ออกใบแจ้งหนี้ — ${invoiceTarget?.name ?? ""}`}
        onClose={closeInvoiceModal}
      >
        {invoiceTarget && !invoiceResult && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ยอดรวมออเดอร์: <span className="font-medium">{formatMoney(invoiceTarget.amount_total)} บาท</span>
            </p>
            <Field label="รูปแบบใบแจ้งหนี้" required>
              <select
                value={invoiceMode}
                onChange={(e) => setInvoiceMode(e.target.value as "full" | "down")}
                className={selectCls}
              >
                <option value="full">เต็มจำนวน</option>
                <option value="down">มัดจำ</option>
              </select>
            </Field>

            {invoiceMode === "down" && (
              <>
                <Field label="วิธีระบุยอดมัดจำ" required>
                  <select
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value as "amount" | "percent")}
                    className={selectCls}
                  >
                    <option value="amount">ระบุจำนวนเงิน (บาท)</option>
                    <option value="percent">ระบุเปอร์เซ็นต์ (%)</option>
                  </select>
                </Field>
                {depositType === "amount" ? (
                  <Field label="จำนวนเงินมัดจำ (บาท)" required>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                ) : (
                  <Field label="เปอร์เซ็นต์มัดจำ (0-100)" required>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                )}
              </>
            )}

            {invoiceError && <ErrorBox message={invoiceError} />}

            <div className="flex justify-end gap-2">
              <button onClick={closeInvoiceModal} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmInvoice}
                disabled={invoiceLoading}
                className={btnPrimaryCls}
              >
                {invoiceLoading ? "กำลังออกใบแจ้งหนี้..." : "ยืนยันออกใบแจ้งหนี้"}
              </button>
            </div>
          </div>
        )}

        {invoiceResult && (
          <div className="space-y-4">
            <SuccessBox>
              ออกใบแจ้งหนี้สำเร็จ ({invoiceResult.mode === "full" ? "เต็มจำนวน" : "มัดจำ"})
            </SuccessBox>
            {invoiceResult.invoices.length > 0 && (
              <ul className="space-y-1 text-sm text-slate-700">
                {invoiceResult.invoices.map((inv) => (
                  <li key={inv.id} className="flex justify-between">
                    <span>{inv.name}</span>
                    <span>{formatMoney(inv.amount_total)} บาท</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button onClick={closeInvoiceModal} className={btnPrimaryCls}>
                ปิด
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: ยืนยันการลบ */}
      <Modal
        open={deleteTarget !== null}
        title="ยืนยันการลบออเดอร์"
        onClose={closeDeleteModal}
      >
        <p className="mb-4 text-sm text-slate-600">
          ต้องการลบออเดอร์ {deleteTarget?.name} ใช่หรือไม่? (ระบบจะตั้งสถานะเป็น inactive ใน Odoo
          และย้อนรายการ DF ที่เกี่ยวข้อง — กู้คืนไม่ได้ผ่านหน้านี้)
        </p>
        {deleteError && (
          <div className="mb-4">
            <ErrorBox message={deleteError} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={closeDeleteModal} disabled={deleteLoading} className={btnSecondaryCls}>
            ยกเลิก
          </button>
          <button onClick={handleConfirmDelete} disabled={deleteLoading} className={btnDangerCls}>
            {deleteLoading ? "กำลังลบ..." : "ลบ"}
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}
