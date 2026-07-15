"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import {
  listDrugs,
  createDrugCategory,
  registerDrugCategoryProducts,
  Drug,
  ListDrugsParams,
} from "@/lib/api/medications";
import {
  PageHeader,
  Card,
  Badge,
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
  btnPrimaryCls,
  btnSecondaryCls,
  formatMoney,
} from "@/components/ui";

const PAGE_SIZE = 20;

export default function DrugsPage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const [search, setSearch] = useState("");
  const [drugCategoryCode, setDrugCategoryCode] = useState("");
  const [medicalCategory, setMedicalCategory] = useState("");
  const [insuranceCategory, setInsuranceCategory] = useState("");
  const [billingCategory, setBillingCategory] = useState("");
  const [stockCategory, setStockCategory] = useState("");
  const [saleCategory, setSaleCategory] = useState("");
  const [rolesCategory, setRolesCategory] = useState("");
  const [unitOfUse, setUnitOfUse] = useState("");
  const [seeAll, setSeeAll] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  // "สร้างหมวดยา" modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryUsage, setCategoryUsage] = useState("");
  const [categoryCondition, setCategoryCondition] = useState("");
  const [categoryDetail, setCategoryDetail] = useState("");
  const [categoryNote, setCategoryNote] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);

  // "จัดหมวดยาให้สินค้า" modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerCategoryCode, setRegisterCategoryCode] = useState("");
  const [registerProductIds, setRegisterProductIds] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  const buildParams = useCallback(
    (nextOffset: number): ListDrugsParams => ({
      limit: PAGE_SIZE,
      offset: nextOffset,
      see_all: seeAll || undefined,
      search: search || undefined,
      drug_category_code: drugCategoryCode || undefined,
      medical_category: medicalCategory || undefined,
      insurance_category: insuranceCategory || undefined,
      billing_category: billingCategory || undefined,
      stock_category: stockCategory || undefined,
      sale_category: saleCategory || undefined,
      roles_category: rolesCategory || undefined,
      unit_of_use: unitOfUse || undefined,
    }),
    [
      seeAll,
      search,
      drugCategoryCode,
      medicalCategory,
      insuranceCategory,
      billingCategory,
      stockCategory,
      saleCategory,
      rolesCategory,
      unitOfUse,
    ]
  );

  const load = useCallback(async (params: ListDrugsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDrugs(params);
      setDrugs(res.data);
      setTotalFound(res.total_count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลยาได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ limit: PAGE_SIZE, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    setOffset(0);
    setSelected(new Set());
    void load(buildParams(0));
  }

  function handleClear() {
    setSearch("");
    setDrugCategoryCode("");
    setMedicalCategory("");
    setInsuranceCategory("");
    setBillingCategory("");
    setStockCategory("");
    setSaleCategory("");
    setRolesCategory("");
    setUnitOfUse("");
    setSeeAll(false);
    setOffset(0);
    setSelected(new Set());
    void load({ limit: PAGE_SIZE, offset: 0 });
  }

  function handlePrev() {
    const nextOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(nextOffset);
    void load(buildParams(nextOffset));
  }

  function handleNext() {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    void load(buildParams(nextOffset));
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCategoryModal() {
    setCategoryName("");
    setCategoryUsage("");
    setCategoryCondition("");
    setCategoryDetail("");
    setCategoryNote("");
    setCategoryError(null);
    setCategorySuccess(null);
    setCategoryModalOpen(true);
  }

  async function submitCategory() {
    if (!categoryName) {
      setCategoryError("กรุณาระบุชื่อหมวดหมู่ยา");
      return;
    }
    setCategoryLoading(true);
    setCategoryError(null);
    try {
      const res = await createDrugCategory({
        drug_category_name: categoryName,
        usage_category: categoryUsage || undefined,
        condition: categoryCondition || undefined,
        detail: categoryDetail || undefined,
        note: categoryNote || undefined,
      });
      setCategorySuccess(
        `สร้างหมวดหมู่ยาสำเร็จ${res.drug_category_code ? ` (รหัส: ${res.drug_category_code})` : ""}`
      );
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : "ไม่สามารถสร้างหมวดหมู่ยาได้");
    } finally {
      setCategoryLoading(false);
    }
  }

  function openRegisterModal() {
    setRegisterCategoryCode("");
    setRegisterProductIds(Array.from(selected).join(", "));
    setRegisterError(null);
    setRegisterSuccess(null);
    setRegisterModalOpen(true);
  }

  async function submitRegister() {
    const ids = registerProductIds
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (!registerCategoryCode) {
      setRegisterError("กรุณาระบุรหัสหมวดหมู่ยา");
      return;
    }
    if (ids.length === 0) {
      setRegisterError("กรุณาระบุ Product ID อย่างน้อย 1 รายการ");
      return;
    }

    setRegisterLoading(true);
    setRegisterError(null);
    try {
      await registerDrugCategoryProducts({
        drug_category_code: registerCategoryCode,
        product_id: ids,
      });
      setRegisterSuccess(`จัดหมวดยาสำเร็จ (${ids.length} รายการ)`);
      setSelected(new Set());
      void load(buildParams(offset));
    } catch (err) {
      setRegisterError(err instanceof ApiError ? err.message : "ไม่สามารถจัดหมวดยาให้สินค้าได้");
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="ยา / หมวดยา"
        actions={
          <>
            <button onClick={openCategoryModal} className={btnSecondaryCls}>
              สร้างหมวดยา
            </button>
            <button
              onClick={openRegisterModal}
              disabled={selected.size === 0}
              className={btnPrimaryCls}
            >
              จัดหมวดยาให้สินค้า{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="ค้นหา" hint="ชื่อยา/หมวดหมู่">
            <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="รหัสหมวดหมู่ยา">
            <input
              className={inputCls}
              value={drugCategoryCode}
              onChange={(e) => setDrugCategoryCode(e.target.value)}
            />
          </Field>
          <Field label="หมวดหมู่ทางการแพทย์">
            <input
              className={inputCls}
              value={medicalCategory}
              onChange={(e) => setMedicalCategory(e.target.value)}
            />
          </Field>
          <Field label="หมวดหมู่ประกัน">
            <input
              className={inputCls}
              value={insuranceCategory}
              onChange={(e) => setInsuranceCategory(e.target.value)}
            />
          </Field>
          <Field label="หมวดหมู่การเบิกจ่าย">
            <input
              className={inputCls}
              value={billingCategory}
              onChange={(e) => setBillingCategory(e.target.value)}
            />
          </Field>
          <Field label="หมวดหมู่คลัง">
            <input
              className={inputCls}
              value={stockCategory}
              onChange={(e) => setStockCategory(e.target.value)}
            />
          </Field>
          <Field label="หมวดหมู่การขาย">
            <input
              className={inputCls}
              value={saleCategory}
              onChange={(e) => setSaleCategory(e.target.value)}
            />
          </Field>
          <Field label="หมวดหมู่บทบาท">
            <input
              className={inputCls}
              value={rolesCategory}
              onChange={(e) => setRolesCategory(e.target.value)}
            />
          </Field>
          <Field label="หน่วยใช้ยา (unit_of_use)">
            <input className={inputCls} value={unitOfUse} onChange={(e) => setUnitOfUse(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={seeAll}
              onChange={(e) => setSeeAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            รวมยาที่ปิดใช้งานแล้ว
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
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">พบ {totalFound.toLocaleString("th-TH")} รายการ</p>
        <div className="flex gap-2">
          <button onClick={handlePrev} disabled={offset === 0} className={btnSecondaryCls}>
            ก่อนหน้า
          </button>
          <button
            onClick={handleNext}
            disabled={offset + PAGE_SIZE >= totalFound}
            className={btnSecondaryCls}
          >
            ถัดไป
          </button>
        </div>
      </div>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && drugs.length === 0 && <EmptyBox text="ไม่พบข้อมูลยา" />}

      {!loading && !error && drugs.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th />
              <Th>รหัส (SKU)</Th>
              <Th>ชื่อยา</Th>
              <Th>หมวดยา</Th>
              <Th>ประเภทการใช้</Th>
              <Th>หน่วยใช้</Th>
              <Th>ราคาขาย</Th>
              <Th>คงเหลือ</Th>
              <Th>สถานะ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drugs.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggleSelected(d.id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </Td>
                <Td>{d.default_code ?? "-"}</Td>
                <Td className="font-medium text-slate-800">{d.name}</Td>
                <Td>{d.drug_category_name ?? "-"}</Td>
                <Td>{d.usage_category ?? "-"}</Td>
                <Td>{d.unit_of_use ?? "-"}</Td>
                <Td>{formatMoney(d.list_price)}</Td>
                <Td>{d.qty_available ?? "-"}</Td>
                <Td>
                  <Badge tone={d.is_active === false ? "red" : "green"}>
                    {d.is_active === false ? "ปิดใช้งาน" : "ใช้งาน"}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal open={categoryModalOpen} title="สร้างหมวดยา" onClose={() => setCategoryModalOpen(false)}>
        <div className="space-y-4">
          <Field label="ชื่อหมวดหมู่ยา" required>
            <input className={inputCls} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </Field>
          <Field label="ประเภทการใช้ (usage_category)" hint="ยาน้ำ, ยาเม็ด, ยาฉีด, ยากิน, อื่นๆ">
            <input className={inputCls} value={categoryUsage} onChange={(e) => setCategoryUsage(e.target.value)} />
          </Field>
          <Field label="เงื่อนไข (condition)">
            <input
              className={inputCls}
              value={categoryCondition}
              onChange={(e) => setCategoryCondition(e.target.value)}
            />
          </Field>
          <Field label="รายละเอียด (detail)">
            <input className={inputCls} value={categoryDetail} onChange={(e) => setCategoryDetail(e.target.value)} />
          </Field>
          <Field label="หมายเหตุ">
            <input className={inputCls} value={categoryNote} onChange={(e) => setCategoryNote(e.target.value)} />
          </Field>

          {categoryError && <ErrorBox message={categoryError} />}
          {categorySuccess && <SuccessBox>{categorySuccess}</SuccessBox>}

          <div className="flex justify-end gap-2">
            <button onClick={() => setCategoryModalOpen(false)} className={btnSecondaryCls}>
              ปิด
            </button>
            <button onClick={submitCategory} disabled={categoryLoading} className={btnPrimaryCls}>
              {categoryLoading ? "กำลังบันทึก..." : "สร้างหมวดยา"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={registerModalOpen} title="จัดหมวดยาให้สินค้า" onClose={() => setRegisterModalOpen(false)}>
        <div className="space-y-4">
          <Field label="รหัสหมวดหมู่ยา" required hint="ต้องมีอยู่ใน his_drug_category แล้ว">
            <input
              className={inputCls}
              value={registerCategoryCode}
              onChange={(e) => setRegisterCategoryCode(e.target.value)}
            />
          </Field>
          <Field label="Product ID" required hint="Odoo product.template id คั่นด้วยจุลภาค — เลือกจากตารางด้านล่างหรือแก้ไขเองได้">
            <textarea
              className={inputCls}
              rows={3}
              value={registerProductIds}
              onChange={(e) => setRegisterProductIds(e.target.value)}
            />
          </Field>

          {registerError && <ErrorBox message={registerError} />}
          {registerSuccess && <SuccessBox>{registerSuccess}</SuccessBox>}

          <div className="flex justify-end gap-2">
            <button onClick={() => setRegisterModalOpen(false)} className={btnSecondaryCls}>
              ปิด
            </button>
            <button onClick={submitRegister} disabled={registerLoading} className={btnPrimaryCls}>
              {registerLoading ? "กำลังบันทึก..." : "จัดหมวดยา"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
