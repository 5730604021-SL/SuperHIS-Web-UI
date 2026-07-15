"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Card,
  ErrorBox,
  Field,
  PageHeader,
  SuccessBox,
  btnPrimaryCls,
  btnSecondaryCls,
  inputCls,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { ProductCreateBody, createProduct } from "@/lib/api/products";

const emptyForm = {
  name: "",
  list_price: "0",
  standard_price: "0",
  barcode: "",
  description: "",
  is_included_patient_inventory: true,
  medical_category: "",
  insurance_category: "",
  billing_category: "",
  drug_category: "",
  stock_category: "",
  sale_category: "",
  roles_category: "",
  transfer_qty_coef: "1",
  unit_of_use: "",
  search_terms: "",
};

type FormState = typeof emptyForm;

export default function NewProductPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("กรุณาระบุชื่อสินค้า");
      return;
    }

    setLoading(true);
    try {
      const body: ProductCreateBody = {
        name: form.name,
        list_price: form.list_price !== "" ? Number(form.list_price) : undefined,
        standard_price:
          form.standard_price !== "" ? Number(form.standard_price) : undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        is_included_patient_inventory: form.is_included_patient_inventory,
        medical_category: form.medical_category || undefined,
        insurance_category: form.insurance_category || undefined,
        billing_category: form.billing_category || undefined,
        drug_category: form.drug_category || undefined,
        stock_category: form.stock_category || undefined,
        sale_category: form.sale_category || undefined,
        roles_category: form.roles_category || undefined,
        transfer_qty_coef:
          form.transfer_qty_coef !== "" ? Number(form.transfer_qty_coef) : undefined,
        unit_of_use: form.unit_of_use || undefined,
        search_terms: form.search_terms
          ? form.search_terms
              .split(",")
              .map((term) => term.trim())
              .filter((term) => term.length > 0)
          : undefined,
      };
      const res = await createProduct(body);
      setCreatedId(res.odoo_product_id ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNext() {
    setForm(emptyForm);
    setCreatedId(null);
    setError(null);
  }

  if (createdId !== null) {
    return (
      <AppShell>
        <PageHeader title="เพิ่มสินค้า" />
        <Card className="mx-auto max-w-md text-center">
          <SuccessBox>เพิ่มสินค้าสำเร็จ</SuccessBox>
          <p className="mt-4 mb-6 text-2xl font-bold text-teal-700">
            Product ID: {createdId}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/products" className={btnPrimaryCls}>
              ดูรายการสินค้า
            </Link>
            <button onClick={handleResetForNext} className={btnSecondaryCls}>
              เพิ่มสินค้าถัดไป
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="เพิ่มสินค้าใหม่" subtitle="สร้างสินค้าใน product.template ของ Odoo" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="ชื่อสินค้า" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputCls}
                  placeholder="เช่น ชานมไข่มุกน้องมิว"
                  required
                />
              </Field>
            </div>
            <Field label="บาร์โค้ด">
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => update("barcode", e.target.value)}
                className={inputCls}
                placeholder="8851234567890"
              />
            </Field>
            <Field label="ราคาขาย">
              <input
                type="number"
                step="0.01"
                value={form.list_price}
                onChange={(e) => update("list_price", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="ราคาทุน">
              <input
                type="number"
                step="0.01"
                value={form.standard_price}
                onChange={(e) => update("standard_price", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field
              label="สัดส่วนการแปลงหน่วย"
              hint="เช่น 100 = 1 ขวด → 100 cc"
            >
              <input
                type="number"
                step="0.01"
                value={form.transfer_qty_coef}
                onChange={(e) => update("transfer_qty_coef", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หน่วยที่ใช้จริง" hint="เช่น cc, mg">
              <input
                type="text"
                value={form.unit_of_use}
                onChange={(e) => update("unit_of_use", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่ทางการแพทย์">
              <input
                type="text"
                value={form.medical_category}
                onChange={(e) => update("medical_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่ประกัน">
              <input
                type="text"
                value={form.insurance_category}
                onChange={(e) => update("insurance_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่การเรียกเก็บเงิน">
              <input
                type="text"
                value={form.billing_category}
                onChange={(e) => update("billing_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่ยา">
              <input
                type="text"
                value={form.drug_category}
                onChange={(e) => update("drug_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่คลังสินค้า">
              <input
                type="text"
                value={form.stock_category}
                onChange={(e) => update("stock_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่การขาย">
              <input
                type="text"
                value={form.sale_category}
                onChange={(e) => update("sale_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="หมวดหมู่สิทธิ์">
              <input
                type="text"
                value={form.roles_category}
                onChange={(e) => update("roles_category", e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-3">
              <Field
                label="คำค้นหาเพิ่มเติม"
                hint="คั่นด้วยจุลภาค (,) หากมีมากกว่า 1 คำ"
              >
                <input
                  type="text"
                  value={form.search_terms}
                  onChange={(e) => update("search_terms", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="รายละเอียดสินค้า">
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_included_patient_inventory}
              onChange={(e) =>
                update("is_included_patient_inventory", e.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            รวมในรายการยาและเวชภัณฑ์ของผู้ป่วย
          </label>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className={btnPrimaryCls}>
              {loading ? "กำลังบันทึก..." : "เพิ่มสินค้า"}
            </button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
