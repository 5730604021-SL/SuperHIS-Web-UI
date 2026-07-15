"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Card,
  ErrorBox,
  Field,
  PageHeader,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatMoney,
  inputCls,
  selectCls,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  CreateOrderResponse,
  OrderCreateBody,
  Partner,
  createOrder,
  listPartners,
} from "@/lib/api/orders";
import { Product, listProducts } from "@/lib/api/products";
import { Course, listCourses } from "@/lib/api/tools";

interface PackageRow {
  id: string;
  name: string;
  quantity: string;
}

interface ProductRow {
  id: string;
  name: string;
  quantity: string;
}

const emptyForm = {
  hn: "",
  partnerId: "",
  vn: "",
  agentId: "",
  isVat: false,
  isServiceCharge: false,
  medicationOrderId: "",
  doctorCode: "",
  dfAmount: "",
};

type FormState = typeof emptyForm;

export default function NewOrderPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [packageRows, setPackageRows] = useState<PackageRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);

  const [packageSearch, setPackageSearch] = useState("");
  const [packageResults, setPackageResults] = useState<Course[]>([]);
  const [packageSearching, setPackageSearching] = useState(false);
  const [packageSearched, setPackageSearched] = useState(false);
  const [packageSearchError, setPackageSearchError] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [productSearched, setProductSearched] = useState(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnersError, setPartnersError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateOrderResponse | null>(null);

  const loadPartners = useCallback(async () => {
    setPartnersLoading(true);
    setPartnersError(null);
    try {
      const res = await listPartners({ limit: 50 });
      setPartners(res.data);
    } catch (err) {
      setPartnersError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายชื่อ Partner ได้"
      );
    } finally {
      setPartnersLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPartners();
  }, [loadPartners]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function removePackageRow(index: number) {
    setPackageRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePackageRow(index: number, key: keyof PackageRow, value: string) {
    setPackageRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  function removeProductRow(index: number) {
    setProductRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateProductRow(index: number, key: keyof ProductRow, value: string) {
    setProductRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  async function searchPackages() {
    const term = packageSearch.trim();
    if (!term) return;
    setPackageSearching(true);
    setPackageSearchError(null);
    setPackageSearched(true);
    try {
      const res = await listCourses({ name: term });
      setPackageResults(res.data);
    } catch (err) {
      setPackageResults([]);
      setPackageSearchError(
        err instanceof ApiError ? err.message : "ค้นหาคอร์สไม่สำเร็จ"
      );
    } finally {
      setPackageSearching(false);
    }
  }

  function addPackage(course: Course) {
    setPackageRows((prev) =>
      prev.some((row) => row.id === course.course_id)
        ? prev
        : [...prev, { id: course.course_id, name: course.name, quantity: "1" }]
    );
  }

  async function searchProducts() {
    const term = productSearch.trim();
    if (!term) return;
    setProductSearching(true);
    setProductSearchError(null);
    setProductSearched(true);
    try {
      // ค้นทั้งชื่อสินค้าและคำค้นหาเพิ่มเติม (search_terms) แล้วรวมผล
      const [byName, byTerm] = await Promise.all([
        listProducts({ name: term, limit: 20 }),
        listProducts({ search_terms: term, limit: 20 }),
      ]);
      const merged = new Map<number, Product>();
      for (const p of [...byName.data, ...byTerm.data]) merged.set(p.id, p);
      setProductResults([...merged.values()]);
    } catch (err) {
      setProductResults([]);
      setProductSearchError(
        err instanceof ApiError ? err.message : "ค้นหาสินค้าไม่สำเร็จ"
      );
    } finally {
      setProductSearching(false);
    }
  }

  function addProduct(product: Product) {
    setProductRows((prev) =>
      prev.some((row) => row.id === String(product.id))
        ? prev
        : [...prev, { id: String(product.id), name: product.name, quantity: "1" }]
    );
  }

  function validate(): string | null {
    if (!form.hn.trim()) {
      return "กรุณากรอก HN";
    }

    const hasPackages = packageRows.length > 0;
    const hasProducts = productRows.length > 0;
    const hasDf = form.dfAmount.trim() !== "";

    if (!hasPackages && !hasProducts && !hasDf) {
      return "ต้องระบุ Package, สินค้า หรือค่าแพทย์ (DF) อย่างน้อยหนึ่งอย่าง";
    }
    if (hasDf && !form.doctorCode.trim()) {
      return "ระบุค่าแพทย์ (DF) ต้องระบุรหัสหมอ (doctor_code) ด้วย";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const body: OrderCreateBody = {
        hn: form.hn.trim(),
        partner_id: form.partnerId ? Number(form.partnerId) : undefined,
        vn: form.vn || undefined,
        agent_id: form.agentId || undefined,
        is_vat: form.isVat,
        is_service_charge: form.isServiceCharge,
        medication_order_id: form.medicationOrderId || undefined,
        doctor_code: form.doctorCode || undefined,
        df_amount: form.dfAmount ? Number(form.dfAmount) : undefined,
        package_id:
          packageRows.length > 0
            ? packageRows.map((row) => ({
                id: row.id.trim(),
                quantity: row.quantity ? Number(row.quantity) : 1,
              }))
            : undefined,
        product_id:
          productRows.length > 0
            ? productRows.map((row) => ({
                id: Number(row.id),
                quantity: row.quantity ? Number(row.quantity) : 1,
              }))
            : undefined,
      };
      const res = await createOrder(body);
      setResult(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNext() {
    setForm(emptyForm);
    setPackageRows([]);
    setProductRows([]);
    setPackageSearch("");
    setPackageResults([]);
    setPackageSearched(false);
    setPackageSearchError(null);
    setProductSearch("");
    setProductResults([]);
    setProductSearched(false);
    setProductSearchError(null);
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <AppShell>
        <PageHeader title="สร้างออเดอร์ใหม่" />
        <Card className="mx-auto max-w-md text-center">
          <p className="mb-2 text-lg font-semibold text-emerald-700">สร้างออเดอร์สำเร็จ</p>
          <p className="mb-4 text-2xl font-bold text-teal-700">
            Order ID: {result.odoo_order_id}
          </p>
          <div className="mb-6 space-y-1 rounded-lg bg-slate-50 p-3 text-left text-sm text-slate-600">
            <div className="flex justify-between">
              <span>ยอดก่อนภาษี</span>
              <span>{formatMoney(result.pricing.subtotal)} บาท</span>
            </div>
            <div className="flex justify-between">
              <span>Service charge</span>
              <span>{formatMoney(result.pricing.service_charge)} บาท</span>
            </div>
            <div className="flex justify-between">
              <span>VAT</span>
              <span>{formatMoney(result.pricing.vat)} บาท</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าแพทย์ (DF)</span>
              <span>{formatMoney(result.pricing.df)} บาท</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-800">
              <span>ยอดรวมสุทธิ</span>
              <span>{formatMoney(result.pricing.grand_total)} บาท</span>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/orders" className={btnPrimaryCls}>
              ดูรายการออเดอร์
            </Link>
            <button onClick={handleResetForNext} className={btnSecondaryCls}>
              สร้างออเดอร์ถัดไป
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="สร้างออเดอร์ใหม่" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">ข้อมูลออเดอร์</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="HN" required>
                <input
                  type="text"
                  value={form.hn}
                  onChange={(e) => update("hn", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Partner (Odoo)"
                hint={
                  partnersError
                    ? partnersError
                    : "ไม่ระบุ = ระบบค้นหา Partner จาก HN ให้เอง"
                }
              >
                <select
                  value={form.partnerId}
                  onChange={(e) => update("partnerId", e.target.value)}
                  disabled={partnersLoading}
                  className={selectCls}
                >
                  <option value="">- ค้นหาจาก HN -</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={String(partner.id)}>
                      {partner.name} (ID: {partner.id})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="VN">
                <input
                  type="text"
                  value={form.vn}
                  onChange={(e) => update("vn", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Agent ID">
                <input
                  type="text"
                  value={form.agentId}
                  onChange={(e) => update("agentId", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="รหัสหมอ (doctor_code)">
                <input
                  type="text"
                  value={form.doctorCode}
                  onChange={(e) => update("doctorCode", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="อ้างอิงใบสั่งยา (Medication Order ID)"
                hint="ถ้าออเดอร์นี้คือการจ่ายยาตามใบสั่ง"
              >
                <input
                  type="text"
                  value={form.medicationOrderId}
                  onChange={(e) => update("medicationOrderId", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="ค่าแพทย์ (DF) (บาท)"
                hint="ต้องระบุรหัสหมอด้วย — ใช้กับเคสขายขาด/ทำจบวันนั้น"
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.dfAmount}
                  onChange={(e) => update("dfAmount", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isVat}
                  onChange={(e) => update("isVat", e.target.checked)}
                />
                คิด VAT
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isServiceCharge}
                  onChange={(e) => update("isServiceCharge", e.target.checked)}
                />
                คิด Service Charge
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              รายการ Package / คอร์ส
            </h2>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <div className="w-full sm:max-w-sm">
                <Field label="ค้นหาคอร์ส">
                  <input
                    type="text"
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchPackages();
                      }
                    }}
                    className={inputCls}
                    placeholder="พิมพ์ชื่อคอร์ส แล้วกด Enter"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => void searchPackages()}
                className={btnSecondaryCls}
                disabled={packageSearching}
              >
                {packageSearching ? "กำลังค้นหา..." : "ค้นหา"}
              </button>
            </div>
            {packageSearchError && (
              <div className="mb-3">
                <ErrorBox message={packageSearchError} />
              </div>
            )}
            {packageResults.length > 0 && (
              <div className="mb-3 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {packageResults.map((course) => {
                  const added = packageRows.some((row) => row.id === course.course_id);
                  return (
                    <button
                      type="button"
                      key={course.course_id}
                      onClick={() => addPackage(course)}
                      disabled={added}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <span>
                        {course.name}{" "}
                        <span className="text-slate-400">({course.course_id})</span>
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {added
                          ? "เพิ่มแล้ว"
                          : course.price != null
                            ? `${formatMoney(course.price)} บาท`
                            : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {packageSearched &&
              !packageSearching &&
              !packageSearchError &&
              packageResults.length === 0 && (
                <p className="mb-3 text-sm text-slate-400">ไม่พบคอร์สที่ค้นหา</p>
              )}
            {packageRows.length === 0 ? (
              <p className="text-sm text-slate-400">
                ยังไม่ได้เลือกคอร์ส — ค้นหาแล้วคลิกรายการเพื่อเพิ่ม
              </p>
            ) : (
              <div className="space-y-2">
                {packageRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2"
                  >
                    <div className="min-w-48 flex-1">
                      <p className="text-sm font-medium text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-400">รหัส: {row.id}</p>
                    </div>
                    <Field label="จำนวนชุด">
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => updatePackageRow(index, "quantity", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => removePackageRow(index)}
                      className={btnDangerCls}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">รายการสินค้า</h2>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <div className="w-full sm:max-w-sm">
                <Field label="ค้นหาสินค้า">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchProducts();
                      }
                    }}
                    className={inputCls}
                    placeholder="พิมพ์ชื่อสินค้าหรือคำค้นหา แล้วกด Enter"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => void searchProducts()}
                className={btnSecondaryCls}
                disabled={productSearching}
              >
                {productSearching ? "กำลังค้นหา..." : "ค้นหา"}
              </button>
            </div>
            {productSearchError && (
              <div className="mb-3">
                <ErrorBox message={productSearchError} />
              </div>
            )}
            {productResults.length > 0 && (
              <div className="mb-3 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {productResults.map((product) => {
                  const added = productRows.some(
                    (row) => row.id === String(product.id)
                  );
                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => addProduct(product)}
                      disabled={added}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <span>
                        {product.name}{" "}
                        {product.default_code && (
                          <span className="text-slate-400">[{product.default_code}]</span>
                        )}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {added
                          ? "เพิ่มแล้ว"
                          : product.list_price != null
                            ? `${formatMoney(product.list_price)} บาท`
                            : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {productSearched &&
              !productSearching &&
              !productSearchError &&
              productResults.length === 0 && (
                <p className="mb-3 text-sm text-slate-400">ไม่พบสินค้าที่ค้นหา</p>
              )}
            {productRows.length === 0 ? (
              <p className="text-sm text-slate-400">
                ยังไม่ได้เลือกสินค้า — ค้นหาแล้วคลิกรายการเพื่อเพิ่ม
              </p>
            ) : (
              <div className="space-y-2">
                {productRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2"
                  >
                    <div className="min-w-48 flex-1">
                      <p className="text-sm font-medium text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-400">Product ID: {row.id}</p>
                    </div>
                    <Field label="จำนวน (หน่วยใช้จริง)">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateProductRow(index, "quantity", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeProductRow(index)}
                      className={btnDangerCls}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end gap-2">
            <Link href="/orders" className={btnSecondaryCls}>
              ยกเลิก
            </Link>
            <button type="submit" disabled={loading} className={btnPrimaryCls}>
              {loading ? "กำลังบันทึก..." : "สร้างออเดอร์"}
            </button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
