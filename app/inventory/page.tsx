"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
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
  inputCls,
  selectCls,
} from "@/components/ui";
import {
  DeductItem,
  InventoryItem,
  ListInventoryParams,
  PatientDeductBody,
  RestockBody,
  deductInventory,
  listInventory,
  restockInventory,
} from "@/lib/api/products";
import { ApiError } from "@/lib/api";
import { StockLocation, listLocations } from "@/lib/api/unit-inventory";

type SortBy = "available_quantity" | "id" | "quantity" | "reserved_quantity";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "quantity", label: "จำนวน" },
  { value: "reserved_quantity", label: "จำนวนที่จอง" },
  { value: "available_quantity", label: "จำนวนพร้อมใช้" },
];

const emptyFilters = {
  name: "",
  location_id: "",
  medical_category: "",
  insurance_category: "",
  billing_category: "",
  drug_category: "",
  stock_category: "",
  sale_category: "",
  roles_category: "",
  see_all: false,
};

type FiltersState = typeof emptyFilters;

interface DeductRow {
  id: string;
  quantity: string;
}

interface DeductModalState {
  open: boolean;
  hn: string;
  vn: string;
  location_id: string;
  used_by: string;
  created_by: string;
  idempotency_key: string;
  order_id: string;
  items: DeductRow[];
  loading: boolean;
  error: string | null;
}

interface RestockModalState {
  open: boolean;
  product_template_id: string;
  quantity: string;
  location_id: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_DEDUCT_MODAL: DeductModalState = {
  open: false,
  hn: "",
  vn: "",
  location_id: "",
  used_by: "",
  created_by: "",
  idempotency_key: "",
  order_id: "",
  items: [{ id: "", quantity: "" }],
  loading: false,
  error: null,
};

const EMPTY_RESTOCK_MODAL: RestockModalState = {
  open: false,
  product_template_id: "",
  quantity: "",
  location_id: "",
  loading: false,
  error: null,
};

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [deductModal, setDeductModal] = useState<DeductModalState>(EMPTY_DEDUCT_MODAL);
  const [restockModal, setRestockModal] = useState<RestockModalState>(
    EMPTY_RESTOCK_MODAL
  );

  // รวมยอด stock.quant ทุก location เป็นยอดเดียวต่อสินค้า แล้วเรียงตามเงื่อนไขที่เลือก
  const aggregatedRows = useMemo(() => {
    const map = new Map<
      number,
      {
        productId: number;
        productName: string;
        locationCount: number;
        quantity: number;
        reserved_quantity: number;
        available_quantity: number;
      }
    >();
    for (const item of rows) {
      if (!item.product_id) continue;
      const [id, name] = item.product_id;
      const agg = map.get(id) ?? {
        productId: id,
        productName: name,
        locationCount: 0,
        quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
      };
      agg.locationCount += 1;
      agg.quantity += item.quantity ?? 0;
      agg.reserved_quantity += item.reserved_quantity ?? 0;
      agg.available_quantity += item.available_quantity ?? 0;
      map.set(id, agg);
    }
    const list = [...map.values()];
    const dir = sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const va = sortBy === "id" ? a.productId : a[sortBy];
      const vb = sortBy === "id" ? b.productId : b[sortBy];
      return (va - vb) * dir;
    });
    return list;
  }, [rows, sortBy, sortOrder]);

  function buildParams(f: FiltersState, sb: SortBy, so: "asc" | "desc"): ListInventoryParams {
    return {
      name: f.name || undefined,
      location_id: f.location_id ? Number(f.location_id) : undefined,
      medical_category: f.medical_category || undefined,
      insurance_category: f.insurance_category || undefined,
      billing_category: f.billing_category || undefined,
      drug_category: f.drug_category || undefined,
      stock_category: f.stock_category || undefined,
      sale_category: f.sale_category || undefined,
      roles_category: f.roles_category || undefined,
      see_all: f.see_all || undefined,
      sort_by: sb,
      sort_order: so,
    };
  }

  const fetchInventory = useCallback(async (params: ListInventoryParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInventory(params);
      setRows(res.data);
      setTotalFound(res.total_count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลคลังสินค้าได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
     
    fetchInventory(buildParams(emptyFilters, "id", "desc"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    fetchInventory(buildParams(filters, sortBy, sortOrder));
  }

  function handleClear() {
    setFilters(emptyFilters);
    setSortBy("id");
    setSortOrder("desc");
    fetchInventory(buildParams(emptyFilters, "id", "desc"));
  }

  function updateFilter<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function reload() {
    fetchInventory(buildParams(filters, sortBy, sortOrder));
  }

  // -- Deduct modal ----------------------------------------------------------

  // โหลดรายชื่อ location ครั้งเดียวตอนเปิด modal ตัดสต็อกครั้งแรก
  // ถ้าโหลดไม่สำเร็จ fallback เป็นช่องกรอกเลขแทน
  const [locations, setLocations] = useState<StockLocation[] | null>(null);
  const [locationsLoadFailed, setLocationsLoadFailed] = useState(false);

  async function ensureLocations() {
    if (locations !== null) return;
    try {
      const res = await listLocations();
      const sorted = [...res.data].sort((a, b) =>
        (a.complete_name ?? a.name).localeCompare(b.complete_name ?? b.name)
      );
      setLocations(sorted);
    } catch {
      setLocations([]);
      setLocationsLoadFailed(true);
    }
  }

  function updateDeductRow(index: number, key: keyof DeductRow, value: string) {
    setDeductModal((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  }

  function addDeductRow() {
    setDeductModal((prev) => ({
      ...prev,
      items: [...prev.items, { id: "", quantity: "" }],
    }));
  }

  function removeDeductRow(index: number) {
    setDeductModal((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function submitDeductModal() {
    if (!deductModal.hn.trim() || !deductModal.vn.trim()) {
      setDeductModal((prev) => ({ ...prev, error: "กรุณาระบุ HN และ VN" }));
      return;
    }

    const items: DeductItem[] = deductModal.items
      .filter((row) => row.id !== "" && row.quantity !== "")
      .map((row) => ({ id: Number(row.id), quantity: Number(row.quantity) }));

    if (items.length === 0 && !deductModal.order_id) {
      setDeductModal((prev) => ({
        ...prev,
        error: "กรุณาระบุ Order ID หรือรายการสินค้าที่ต้องการตัดสต็อกอย่างน้อย 1 รายการ",
      }));
      return;
    }

    setDeductModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const body: PatientDeductBody = {
        hn: deductModal.hn,
        vn: deductModal.vn,
        location_id: deductModal.location_id ? Number(deductModal.location_id) : undefined,
        used_by: deductModal.used_by || undefined,
        created_by: deductModal.created_by || undefined,
        idempotency_key: deductModal.idempotency_key || undefined,
        order_id: deductModal.order_id ? Number(deductModal.order_id) : undefined,
        product_id: items.length > 0 ? items : undefined,
      };
      await deductInventory(body);
      setDeductModal(EMPTY_DEDUCT_MODAL);
      reload();
    } catch (err) {
      setDeductModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถตัดสต็อกได้",
      }));
    }
  }

  // -- Restock modal -----------------------------------------------------------

  async function submitRestockModal() {
    if (!restockModal.product_template_id.trim() || !restockModal.quantity.trim()) {
      setRestockModal((prev) => ({
        ...prev,
        error: "กรุณาระบุ Product Template ID และจำนวนที่ต้องการเติม",
      }));
      return;
    }

    setRestockModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const body: RestockBody = {
        product_template_id: Number(restockModal.product_template_id),
        quantity: Number(restockModal.quantity),
        location_id: restockModal.location_id ? Number(restockModal.location_id) : undefined,
      };
      await restockInventory(body);
      setRestockModal(EMPTY_RESTOCK_MODAL);
      reload();
    } catch (err) {
      setRestockModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถเติมสต็อกได้",
      }));
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="คลังกลาง"
        subtitle="ยอดคงเหลือรวมต่อสินค้า (รวมทุก internal location)"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                void ensureLocations();
                setDeductModal({ ...EMPTY_DEDUCT_MODAL, open: true });
              }}
              className={btnSecondaryCls}
            >
              ตัดสต็อก
            </button>
            <button
              onClick={() => setRestockModal({ ...EMPTY_RESTOCK_MODAL, open: true })}
              className={btnPrimaryCls}
            >
              เติมสต็อก
            </button>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="ชื่อสินค้า">
            <input
              type="text"
              value={filters.name}
              onChange={(e) => updateFilter("name", e.target.value)}
              className={inputCls}
              placeholder="ค้นหาชื่อสินค้า"
            />
          </Field>
          <Field label="Location ID">
            <input
              type="number"
              value={filters.location_id}
              onChange={(e) => updateFilter("location_id", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่ทางการแพทย์">
            <input
              type="text"
              value={filters.medical_category}
              onChange={(e) => updateFilter("medical_category", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่ประกัน">
            <input
              type="text"
              value={filters.insurance_category}
              onChange={(e) => updateFilter("insurance_category", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่การเรียกเก็บเงิน">
            <input
              type="text"
              value={filters.billing_category}
              onChange={(e) => updateFilter("billing_category", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่ยา">
            <input
              type="text"
              value={filters.drug_category}
              onChange={(e) => updateFilter("drug_category", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่คลังสินค้า" hint="เช่น cut, sub-cut, non-cut">
            <input
              type="text"
              value={filters.stock_category}
              onChange={(e) => updateFilter("stock_category", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่การขาย">
            <input
              type="text"
              value={filters.sale_category}
              onChange={(e) => updateFilter("sale_category", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="หมวดหมู่สิทธิ์">
            <input
              type="text"
              value={filters.roles_category}
              onChange={(e) => updateFilter("roles_category", e.target.value)}
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
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.see_all}
            onChange={(e) => updateFilter("see_all", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          แสดงสินค้าที่ปิดใช้งานด้วย
        </label>
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
        พบสินค้า {aggregatedRows.length.toLocaleString("th-TH")} รายการ (รวมยอดจาก{" "}
        {totalFound.toLocaleString("th-TH")} แถวตาม location)
      </p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && aggregatedRows.length === 0 && (
        <EmptyBox text="ไม่พบข้อมูลคลังสินค้า" />
      )}

      {!loading && !error && aggregatedRows.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>สินค้า</Th>
              <Th>จำนวน Location</Th>
              <Th>จำนวนรวม</Th>
              <Th>จำนวนที่จองรวม</Th>
              <Th>จำนวนพร้อมใช้รวม</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {aggregatedRows.map((item) => (
              <tr key={item.productId} className="hover:bg-slate-50">
                <Td className="whitespace-normal font-medium text-slate-800">
                  {item.productName}
                </Td>
                <Td>{item.locationCount.toLocaleString("th-TH")}</Td>
                <Td>{item.quantity.toLocaleString("th-TH")}</Td>
                <Td>{item.reserved_quantity.toLocaleString("th-TH")}</Td>
                <Td>{item.available_quantity.toLocaleString("th-TH")}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={deductModal.open}
        title="ตัดสต็อก (หักคลังของผู้ป่วย)"
        onClose={() => setDeductModal(EMPTY_DEDUCT_MODAL)}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="HN" required>
              <input
                type="text"
                value={deductModal.hn}
                onChange={(e) =>
                  setDeductModal((prev) => ({ ...prev, hn: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="VN" required hint="ต้องยังไม่ checkout">
              <input
                type="text"
                value={deductModal.vn}
                onChange={(e) =>
                  setDeductModal((prev) => ({ ...prev, vn: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Ward Location" hint="ต้องระบุถ้ามี item เป็น sub-cut">
              {locationsLoadFailed ? (
                <input
                  type="number"
                  value={deductModal.location_id}
                  onChange={(e) =>
                    setDeductModal((prev) => ({ ...prev, location_id: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="โหลดรายชื่อไม่สำเร็จ — กรอก Location ID เอง"
                />
              ) : (
                <select
                  value={deductModal.location_id}
                  onChange={(e) =>
                    setDeductModal((prev) => ({ ...prev, location_id: e.target.value }))
                  }
                  className={selectCls}
                  disabled={locations === null}
                >
                  <option value="">
                    {locations === null ? "กำลังโหลด..." : "— ไม่ระบุ —"}
                  </option>
                  {(locations ?? []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.complete_name ?? loc.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Order ID" hint="หักเต็ม remaining_qty ทุก item ใน order นี้">
              <input
                type="number"
                value={deductModal.order_id}
                onChange={(e) =>
                  setDeductModal((prev) => ({ ...prev, order_id: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="ผู้สั่งใช้ (doctor_code)">
              <input
                type="text"
                value={deductModal.used_by}
                onChange={(e) =>
                  setDeductModal((prev) => ({ ...prev, used_by: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="ผู้ทำรายการ">
              <input
                type="text"
                value={deductModal.created_by}
                onChange={(e) =>
                  setDeductModal((prev) => ({ ...prev, created_by: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Idempotency Key" hint="กันคำขอซ้ำ (ไม่บังคับ)">
                <input
                  type="text"
                  maxLength={100}
                  value={deductModal.idempotency_key}
                  onChange={(e) =>
                    setDeductModal((prev) => ({
                      ...prev,
                      idempotency_key: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">
              รายการสินค้าที่ต้องการตัดสต็อก (product.product id, FIFO)
            </p>
            <div className="space-y-2">
              {deductModal.items.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Product ID"
                    value={row.id}
                    onChange={(e) => updateDeductRow(index, "id", e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="จำนวน"
                    value={row.quantity}
                    onChange={(e) => updateDeductRow(index, "quantity", e.target.value)}
                    className={inputCls}
                  />
                  <button
                    onClick={() => removeDeductRow(index)}
                    className={btnSecondaryCls}
                    disabled={deductModal.items.length === 1}
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addDeductRow} className={`mt-2 ${btnSecondaryCls}`}>
              + เพิ่มรายการ
            </button>
          </div>

          {deductModal.error && <ErrorBox message={deductModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeductModal(EMPTY_DEDUCT_MODAL)}
              className={btnSecondaryCls}
              disabled={deductModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitDeductModal}
              className={btnPrimaryCls}
              disabled={deductModal.loading}
            >
              {deductModal.loading ? "กำลังตัดสต็อก..." : "ตัดสต็อก"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={restockModal.open}
        title="เติมสต็อก"
        onClose={() => setRestockModal(EMPTY_RESTOCK_MODAL)}
      >
        <div className="space-y-4">
          <Field label="Product Template ID" required hint="Odoo product.template id">
            <input
              type="number"
              value={restockModal.product_template_id}
              onChange={(e) =>
                setRestockModal((prev) => ({
                  ...prev,
                  product_template_id: e.target.value,
                }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="จำนวนที่ต้องการเติม" required>
            <input
              type="number"
              step="0.01"
              value={restockModal.quantity}
              onChange={(e) =>
                setRestockModal((prev) => ({ ...prev, quantity: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="Location ID" hint="ถ้าไม่ระบุจะใช้ WH/Stock">
            <input
              type="number"
              value={restockModal.location_id}
              onChange={(e) =>
                setRestockModal((prev) => ({ ...prev, location_id: e.target.value }))
              }
              className={inputCls}
            />
          </Field>

          {restockModal.error && <ErrorBox message={restockModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRestockModal(EMPTY_RESTOCK_MODAL)}
              className={btnSecondaryCls}
              disabled={restockModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitRestockModal}
              className={btnPrimaryCls}
              disabled={restockModal.loading}
            >
              {restockModal.loading ? "กำลังเติมสต็อก..." : "เติมสต็อก"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
