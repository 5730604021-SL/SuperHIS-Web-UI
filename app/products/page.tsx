"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Badge,
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
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatMoney,
  inputCls,
  selectCls,
} from "@/components/ui";
import {
  ListProductsParams,
  Product,
  ProductUpdateBody,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/lib/api/products";
import { ApiError } from "@/lib/api";

type SortBy =
  | "default_code"
  | "detailed_type"
  | "id"
  | "list_price"
  | "name"
  | "qty_available"
  | "standard_price";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "name", label: "ชื่อสินค้า" },
  { value: "default_code", label: "รหัสสินค้า" },
  { value: "detailed_type", label: "ประเภท" },
  { value: "list_price", label: "ราคาขาย" },
  { value: "standard_price", label: "ราคาทุน" },
  { value: "qty_available", label: "คงเหลือ" },
];

const DETAILED_TYPE_OPTIONS = [
  { value: "product", label: "สินค้าคงคลัง (product)" },
  { value: "consu", label: "วัสดุสิ้นเปลือง (consu)" },
  { value: "service", label: "บริการ (service)" },
];

const emptyFilters = {
  name: "",
  default_code: "",
  detailed_type: "",
  medical_category: "",
  insurance_category: "",
  billing_category: "",
  drug_category: "",
  stock_category: "",
  sale_category: "",
  roles_category: "",
  unit_of_use: "",
  search_terms: "",
  is_included_patient_inventory: "" as "" | "true" | "false",
  see_all: false,
};

type FiltersState = typeof emptyFilters;

interface EditModalState {
  open: boolean;
  product: Product | null;
  form: {
    name: string;
    default_code: string;
    detailed_type: string;
    list_price: string;
    standard_price: string;
    transfer_qty_coef: string;
    unit_of_use: string;
    medical_category: string;
    insurance_category: string;
    billing_category: string;
    drug_category: string;
    stock_category: string;
    sale_category: string;
    roles_category: string;
    search_terms: string;
    is_included_patient_inventory: boolean;
    is_active: boolean;
  };
  loading: boolean;
  error: string | null;
}

interface DeleteModalState {
  open: boolean;
  product: Product | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_DELETE_MODAL: DeleteModalState = {
  open: false,
  product: null,
  loading: false,
  error: null,
};

function toEditForm(product: Product): EditModalState["form"] {
  return {
    name: product.name ?? "",
    default_code: product.default_code ?? "",
    detailed_type: product.detailed_type ?? "",
    list_price: product.list_price != null ? String(product.list_price) : "",
    standard_price:
      product.standard_price != null ? String(product.standard_price) : "",
    transfer_qty_coef:
      product.transfer_qty_coef != null ? String(product.transfer_qty_coef) : "",
    unit_of_use: product.unit_of_use ?? "",
    medical_category: product.medical_category ?? "",
    insurance_category: product.insurance_category ?? "",
    billing_category: product.billing_category ?? "",
    drug_category: product.drug_category ?? "",
    stock_category: product.stock_category ?? "",
    sale_category: product.sale_category ?? "",
    roles_category: product.roles_category ?? "",
    search_terms: (product.search_terms ?? []).join(", "),
    is_included_patient_inventory: Boolean(product.is_included_patient_inventory),
    is_active: product.is_active !== false,
  };
}

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>(EMPTY_DELETE_MODAL);

  function buildParams(f: FiltersState, sb: SortBy, so: "asc" | "desc"): ListProductsParams {
    return {
      name: f.name || undefined,
      default_code: f.default_code || undefined,
      detailed_type: f.detailed_type || undefined,
      medical_category: f.medical_category || undefined,
      insurance_category: f.insurance_category || undefined,
      billing_category: f.billing_category || undefined,
      drug_category: f.drug_category || undefined,
      stock_category: f.stock_category || undefined,
      sale_category: f.sale_category || undefined,
      roles_category: f.roles_category || undefined,
      unit_of_use: f.unit_of_use || undefined,
      search_terms: f.search_terms || undefined,
      is_included_patient_inventory:
        f.is_included_patient_inventory === ""
          ? undefined
          : f.is_included_patient_inventory === "true",
      see_all: f.see_all || undefined,
      sort_by: sb,
      sort_order: so,
    };
  }

  const fetchProducts = useCallback(async (params: ListProductsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts(params);
      setRows(res.data);
      setTotalFound(res.total_count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
     
    fetchProducts(buildParams(emptyFilters, "id", "desc"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    fetchProducts(buildParams(filters, sortBy, sortOrder));
  }

  function handleClear() {
    setFilters(emptyFilters);
    setSortBy("id");
    setSortOrder("desc");
    fetchProducts(buildParams(emptyFilters, "id", "desc"));
  }

  function updateFilter<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function openEditModal(product: Product) {
    setEditModal({
      open: true,
      product,
      form: toEditForm(product),
      loading: false,
      error: null,
    });
  }

  function updateEditForm<K extends keyof EditModalState["form"]>(
    key: K,
    value: EditModalState["form"][K]
  ) {
    setEditModal((prev) =>
      prev ? { ...prev, form: { ...prev.form, [key]: value } } : prev
    );
  }

  async function submitEditModal() {
    if (!editModal || !editModal.product) return;
    setEditModal((prev) => (prev ? { ...prev, loading: true, error: null } : prev));
    try {
      const f = editModal.form;
      const body: ProductUpdateBody = {
        name: f.name || undefined,
        default_code: f.default_code || undefined,
        detailed_type: f.detailed_type || undefined,
        list_price: f.list_price !== "" ? Number(f.list_price) : undefined,
        standard_price: f.standard_price !== "" ? Number(f.standard_price) : undefined,
        transfer_qty_coef:
          f.transfer_qty_coef !== "" ? Number(f.transfer_qty_coef) : undefined,
        unit_of_use: f.unit_of_use || undefined,
        medical_category: f.medical_category || undefined,
        insurance_category: f.insurance_category || undefined,
        billing_category: f.billing_category || undefined,
        drug_category: f.drug_category || undefined,
        stock_category: f.stock_category || undefined,
        sale_category: f.sale_category || undefined,
        roles_category: f.roles_category || undefined,
        search_terms: f.search_terms
          ? f.search_terms
              .split(",")
              .map((term) => term.trim())
              .filter((term) => term.length > 0)
          : undefined,
        is_included_patient_inventory: f.is_included_patient_inventory,
        is_active: f.is_active,
      };
      await updateProduct(editModal.product.id, body);
      setEditModal(null);
      fetchProducts(buildParams(filters, sortBy, sortOrder));
    } catch (err) {
      setEditModal((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              error: err instanceof ApiError ? err.message : "ไม่สามารถบันทึกสินค้าได้",
            }
          : prev
      );
    }
  }

  function openDeleteModal(product: Product) {
    setDeleteModal({ open: true, product, loading: false, error: null });
  }

  async function submitDeleteModal() {
    if (!deleteModal.product) return;
    setDeleteModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteProduct(deleteModal.product.id);
      setDeleteModal(EMPTY_DELETE_MODAL);
      fetchProducts(buildParams(filters, sortBy, sortOrder));
    } catch (err) {
      setDeleteModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถลบสินค้าได้",
      }));
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="สินค้า"
        subtitle="รายการสินค้าทุกประเภทจาก Odoo (product.template)"
        actions={
          <Link href="/products/new" className={btnPrimaryCls}>
            + เพิ่มสินค้า
          </Link>
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
          <Field label="รหัสสินค้า">
            <input
              type="text"
              value={filters.default_code}
              onChange={(e) => updateFilter("default_code", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ประเภทสินค้า">
            <select
              value={filters.detailed_type}
              onChange={(e) => updateFilter("detailed_type", e.target.value)}
              className={selectCls}
            >
              <option value="">ทั้งหมด</option>
              {DETAILED_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="รวมในคลังผู้ป่วย">
            <select
              value={filters.is_included_patient_inventory}
              onChange={(e) =>
                updateFilter(
                  "is_included_patient_inventory",
                  e.target.value as FiltersState["is_included_patient_inventory"]
                )
              }
              className={selectCls}
            >
              <option value="">ทั้งหมด</option>
              <option value="true">ใช่</option>
              <option value="false">ไม่ใช่</option>
            </select>
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
          <Field label="หมวดหมู่คลังสินค้า">
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
          <Field label="หน่วยที่ใช้จริง">
            <input
              type="text"
              value={filters.unit_of_use}
              onChange={(e) => updateFilter("unit_of_use", e.target.value)}
              className={inputCls}
              placeholder="เช่น cc, mg"
            />
          </Field>
          <Field label="คำค้นหาเพิ่มเติม">
            <input
              type="text"
              value={filters.search_terms}
              onChange={(e) => updateFilter("search_terms", e.target.value)}
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
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && rows.length === 0 && <EmptyBox text="ไม่พบข้อมูลสินค้า" />}

      {!loading && !error && rows.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>รหัสสินค้า</Th>
              <Th>ชื่อสินค้า</Th>
              <Th>ประเภท</Th>
              <Th>หมวดหมู่ทางการแพทย์</Th>
              <Th>ราคาขาย</Th>
              <Th>ราคาทุน</Th>
              <Th>คงเหลือ</Th>
              <Th>สถานะ</Th>
              <Th>การดำเนินการ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <Td>{product.default_code ?? "-"}</Td>
                <Td className="whitespace-normal font-medium text-slate-800">
                  {product.name}
                </Td>
                <Td>{product.detailed_type ?? "-"}</Td>
                <Td>{product.medical_category ?? "-"}</Td>
                <Td>{formatMoney(product.list_price)}</Td>
                <Td>{formatMoney(product.standard_price)}</Td>
                <Td>{product.qty_available ?? "-"}</Td>
                <Td>
                  <Badge tone={product.is_active !== false ? "green" : "red"}>
                    {product.is_active !== false ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className={btnSecondaryCls}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => openDeleteModal(product)}
                      className={btnDangerCls}
                    >
                      ลบ
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={Boolean(editModal?.open)}
        title={`แก้ไขสินค้า: ${editModal?.product?.name ?? ""}`}
        onClose={() => setEditModal(null)}
        wide
      >
        {editModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="ชื่อสินค้า" required>
                <input
                  type="text"
                  value={editModal.form.name}
                  onChange={(e) => updateEditForm("name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="รหัสสินค้า">
                <input
                  type="text"
                  value={editModal.form.default_code}
                  onChange={(e) => updateEditForm("default_code", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ประเภทสินค้า">
                <select
                  value={editModal.form.detailed_type}
                  onChange={(e) => updateEditForm("detailed_type", e.target.value)}
                  className={selectCls}
                >
                  <option value="">- ไม่ระบุ -</option>
                  {DETAILED_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ราคาขาย">
                <input
                  type="number"
                  step="0.01"
                  value={editModal.form.list_price}
                  onChange={(e) => updateEditForm("list_price", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ราคาทุน">
                <input
                  type="number"
                  step="0.01"
                  value={editModal.form.standard_price}
                  onChange={(e) => updateEditForm("standard_price", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="สัดส่วนการแปลงหน่วย">
                <input
                  type="number"
                  step="0.01"
                  value={editModal.form.transfer_qty_coef}
                  onChange={(e) =>
                    updateEditForm("transfer_qty_coef", e.target.value)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="หน่วยที่ใช้จริง">
                <input
                  type="text"
                  value={editModal.form.unit_of_use}
                  onChange={(e) => updateEditForm("unit_of_use", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่ทางการแพทย์">
                <input
                  type="text"
                  value={editModal.form.medical_category}
                  onChange={(e) => updateEditForm("medical_category", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่ประกัน">
                <input
                  type="text"
                  value={editModal.form.insurance_category}
                  onChange={(e) =>
                    updateEditForm("insurance_category", e.target.value)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่การเรียกเก็บเงิน">
                <input
                  type="text"
                  value={editModal.form.billing_category}
                  onChange={(e) => updateEditForm("billing_category", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่ยา">
                <input
                  type="text"
                  value={editModal.form.drug_category}
                  onChange={(e) => updateEditForm("drug_category", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่คลังสินค้า">
                <input
                  type="text"
                  value={editModal.form.stock_category}
                  onChange={(e) => updateEditForm("stock_category", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่การขาย">
                <input
                  type="text"
                  value={editModal.form.sale_category}
                  onChange={(e) => updateEditForm("sale_category", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หมวดหมู่สิทธิ์">
                <input
                  type="text"
                  value={editModal.form.roles_category}
                  onChange={(e) => updateEditForm("roles_category", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="sm:col-span-3">
                <Field label="คำค้นหาเพิ่มเติม" hint="คั่นด้วยจุลภาค (,) หากมีมากกว่า 1 คำ">
                  <input
                    type="text"
                    value={editModal.form.search_terms}
                    onChange={(e) => updateEditForm("search_terms", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editModal.form.is_included_patient_inventory}
                  onChange={(e) =>
                    updateEditForm("is_included_patient_inventory", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                รวมในรายการยาและเวชภัณฑ์ของผู้ป่วย
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editModal.form.is_active}
                  onChange={(e) => updateEditForm("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                ใช้งาน
              </label>
            </div>

            {editModal.error && <ErrorBox message={editModal.error} />}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditModal(null)}
                className={btnSecondaryCls}
                disabled={editModal.loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitEditModal}
                className={btnPrimaryCls}
                disabled={editModal.loading || !editModal.form.name.trim()}
              >
                {editModal.loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteModal.open}
        title="ยืนยันการลบสินค้า"
        onClose={() => setDeleteModal(EMPTY_DELETE_MODAL)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ต้องการลบสินค้า{" "}
            <span className="font-semibold text-slate-800">
              {deleteModal.product?.name}
            </span>{" "}
            ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
          </p>

          {deleteModal.error && <ErrorBox message={deleteModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteModal(EMPTY_DELETE_MODAL)}
              className={btnSecondaryCls}
              disabled={deleteModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitDeleteModal}
              className={btnDangerCls}
              disabled={deleteModal.loading}
            >
              {deleteModal.loading ? "กำลังลบ..." : "ลบสินค้า"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
