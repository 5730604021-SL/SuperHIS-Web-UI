"use client";

import { Fragment, FormEvent, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  PageHeader,
  Card,
  Badge,
  BadgeTone,
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
  btnDangerCls,
  formatDateTime,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  listUnitStock,
  deductUnitStock,
  listLocations,
  createLocation,
  listTransfers,
  createTransfer,
  cancelTransfer,
  listUom,
  listPickingTypes,
  UnitStockItem,
  StockLocation,
  StockTransfer,
  UomItem,
  PickingType,
  ListUnitStockParams,
  ListTransfersParams,
  ListLocationsParams,
} from "@/lib/api/unit-inventory";

type TabKey = "stock" | "transfers" | "locations";

const TABS: { key: TabKey; label: string }[] = [
  { key: "stock", label: "สต็อก" },
  { key: "transfers", label: "โอนย้าย" },
  { key: "locations", label: "สถานที่เก็บ" },
];

const TRANSFER_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "ร่าง" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "assigned", label: "พร้อมโอน" },
  { value: "done", label: "เสร็จสิ้น" },
  { value: "cancel", label: "ยกเลิก" },
];

const TRANSFER_STATE_LABEL: Record<string, string> = Object.fromEntries(
  TRANSFER_STATE_OPTIONS.map((o) => [o.value, o.label])
);

function transferTone(state: string): BadgeTone {
  switch (state) {
    case "done":
      return "green";
    case "cancel":
      return "red";
    case "assigned":
      return "blue";
    case "confirmed":
      return "amber";
    default:
      return "gray";
  }
}

function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("th-TH", { maximumFractionDigits: 4 });
}

interface DeductFormState {
  location_id: string;
  product_template_id: string;
  quantity: string;
  uom_id: string;
}

const emptyDeductForm: DeductFormState = {
  location_id: "",
  product_template_id: "",
  quantity: "",
  uom_id: "",
};

interface TransferItemRow {
  product_template_id: string;
  quantity: string;
  uom_id: string;
}

const emptyTransferItemRow: TransferItemRow = {
  product_template_id: "",
  quantity: "",
  uom_id: "",
};

interface TransferFormState {
  from_location_id: string;
  to_location_id: string;
}

const emptyTransferForm: TransferFormState = {
  from_location_id: "",
  to_location_id: "",
};

interface LocationFormState {
  name: string;
  parent_location_id: string;
}

const emptyLocationForm: LocationFormState = { name: "", parent_location_id: "" };

export default function UnitInventoryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("stock");

  // ---------- Shared reference data (locations / uom / picking types) ----------
  const [allLocations, setAllLocations] = useState<StockLocation[]>([]);
  const [uomList, setUomList] = useState<UomItem[]>([]);
  const [pickingTypes, setPickingTypes] = useState<PickingType[]>([]);
  const [refError, setRefError] = useState<string | null>(null);

  const loadShared = useCallback(async () => {
    setRefError(null);
    try {
      const [locRes, uomRes, ptRes] = await Promise.all([
        listLocations({ sort_by: "complete_name", sort_order: "asc" }),
        listUom({ sort_by: "name", sort_order: "asc" }),
        listPickingTypes({}),
      ]);
      setAllLocations(locRes.data);
      setUomList(uomRes.data);
      setPickingTypes(ptRes.data);
    } catch (err) {
      setRefError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลอ้างอิงได้"
      );
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadShared();
  }, [loadShared]);

  const internalPickingType =
    pickingTypes.find((p) => p.code === "internal") ?? pickingTypes[0] ?? null;

  // ================= สต็อก =================
  const [stockFilters, setStockFilters] = useState<ListUnitStockParams>({
    sort_by: "id",
    sort_order: "desc",
  });
  const [stockLocationInput, setStockLocationInput] = useState("");
  const [stockProductInput, setStockProductInput] = useState("");
  const [stockRows, setStockRows] = useState<UnitStockItem[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  const loadStock = useCallback(async () => {
    setStockLoading(true);
    setStockError(null);
    try {
      const res = await listUnitStock(stockFilters);
      setStockRows(res.data);
      setStockTotal(res.total_count);
    } catch (err) {
      setStockError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลสต็อกได้"
      );
    } finally {
      setStockLoading(false);
    }
  }, [stockFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStock();
  }, [loadStock]);

  function handleStockSearch() {
    setStockFilters((prev) => ({
      ...prev,
      location_id: stockLocationInput ? Number(stockLocationInput) : undefined,
      product_template_id: stockProductInput
        ? Number(stockProductInput)
        : undefined,
    }));
  }

  function handleStockClear() {
    setStockLocationInput("");
    setStockProductInput("");
    setStockFilters({ sort_by: "id", sort_order: "desc" });
  }

  function handleStockSort(column: string) {
    setStockFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order:
        prev.sort_by === column && prev.sort_order === "asc" ? "desc" : "asc",
    }));
  }

  const [deductOpen, setDeductOpen] = useState(false);
  const [deductForm, setDeductForm] = useState<DeductFormState>(emptyDeductForm);
  const [deductSubmitting, setDeductSubmitting] = useState(false);
  const [deductError, setDeductError] = useState<string | null>(null);

  function openDeductModal() {
    setDeductForm(emptyDeductForm);
    setDeductError(null);
    setDeductOpen(true);
  }

  async function handleDeductSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeductError(null);

    if (
      !deductForm.location_id ||
      !deductForm.product_template_id ||
      !deductForm.quantity
    ) {
      setDeductError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const qty = Number(deductForm.quantity);
    if (!(qty > 0)) {
      setDeductError("จำนวนต้องมากกว่า 0");
      return;
    }

    setDeductSubmitting(true);
    try {
      await deductUnitStock({
        location_id: Number(deductForm.location_id),
        product_template_id: Number(deductForm.product_template_id),
        quantity: qty,
        uom_id: deductForm.uom_id ? Number(deductForm.uom_id) : undefined,
      });
      setDeductOpen(false);
      await loadStock();
    } catch (err) {
      setDeductError(
        err instanceof ApiError ? err.message : "ไม่สามารถตัดสต็อกได้"
      );
    } finally {
      setDeductSubmitting(false);
    }
  }

  // ================= โอนย้าย =================
  const [transferFilters, setTransferFilters] = useState<ListTransfersParams>({
    sort_by: "scheduled_date",
    sort_order: "desc",
  });
  const [transferStateInput, setTransferStateInput] = useState("");
  const [transferFromInput, setTransferFromInput] = useState("");
  const [transferToInput, setTransferToInput] = useState("");
  const [transferRows, setTransferRows] = useState<StockTransfer[]>([]);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferLoading, setTransferLoading] = useState(true);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [expandedTransferId, setExpandedTransferId] = useState<number | null>(
    null
  );

  const loadTransfers = useCallback(async () => {
    setTransferLoading(true);
    setTransferError(null);
    try {
      const res = await listTransfers(transferFilters);
      setTransferRows(res.data);
      setTransferTotal(res.total_count);
    } catch (err) {
      setTransferError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายการโอนย้ายได้"
      );
    } finally {
      setTransferLoading(false);
    }
  }, [transferFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTransfers();
  }, [loadTransfers]);

  function handleTransferSearch() {
    setTransferFilters((prev) => ({
      ...prev,
      state: transferStateInput || undefined,
      from_location_id: transferFromInput ? Number(transferFromInput) : undefined,
      to_location_id: transferToInput ? Number(transferToInput) : undefined,
    }));
  }

  function handleTransferClear() {
    setTransferStateInput("");
    setTransferFromInput("");
    setTransferToInput("");
    setTransferFilters({ sort_by: "scheduled_date", sort_order: "desc" });
  }

  function handleTransferSort(column: string) {
    setTransferFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order:
        prev.sort_by === column && prev.sort_order === "asc" ? "desc" : "asc",
    }));
  }

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] =
    useState<TransferFormState>(emptyTransferForm);
  const [transferItemRows, setTransferItemRows] = useState<TransferItemRow[]>([
    emptyTransferItemRow,
  ]);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferFormError, setTransferFormError] = useState<string | null>(
    null
  );

  function openTransferModal() {
    setTransferForm(emptyTransferForm);
    setTransferItemRows([emptyTransferItemRow]);
    setTransferFormError(null);
    setTransferModalOpen(true);
  }

  function addTransferItemRow() {
    setTransferItemRows((prev) => [...prev, emptyTransferItemRow]);
  }

  function removeTransferItemRow(index: number) {
    setTransferItemRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTransferItemRow(
    index: number,
    field: keyof TransferItemRow,
    value: string
  ) {
    setTransferItemRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleCreateTransferSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTransferFormError(null);

    if (!transferForm.from_location_id || !transferForm.to_location_id) {
      setTransferFormError("กรุณาเลือก Location ต้นทางและปลายทาง");
      return;
    }
    if (transferForm.from_location_id === transferForm.to_location_id) {
      setTransferFormError("Location ต้นทางและปลายทางต้องไม่ใช่ที่เดียวกัน");
      return;
    }
    if (
      transferItemRows.some(
        (row) => !row.product_template_id || !row.quantity || !(Number(row.quantity) > 0)
      )
    ) {
      setTransferFormError(
        "กรุณากรอก Product Template ID และจำนวน (มากกว่า 0) ให้ครบทุกรายการ"
      );
      return;
    }

    setTransferSubmitting(true);
    try {
      await createTransfer({
        from_location_id: Number(transferForm.from_location_id),
        to_location_id: Number(transferForm.to_location_id),
        items: transferItemRows.map((row) => ({
          product_template_id: Number(row.product_template_id),
          quantity: Number(row.quantity),
          uom_id: row.uom_id ? Number(row.uom_id) : undefined,
        })),
      });
      setTransferModalOpen(false);
      await loadTransfers();
    } catch (err) {
      setTransferFormError(
        err instanceof ApiError ? err.message : "ไม่สามารถสร้างใบโอนได้"
      );
    } finally {
      setTransferSubmitting(false);
    }
  }

  const [cancelTarget, setCancelTarget] = useState<StockTransfer | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function closeCancelModal() {
    setCancelTarget(null);
    setCancelError(null);
  }

  async function handleCancelConfirm() {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await cancelTransfer(cancelTarget.id);
      setCancelTarget(null);
      await loadTransfers();
    } catch (err) {
      setCancelError(
        err instanceof ApiError ? err.message : "ไม่สามารถยกเลิกใบโอนได้"
      );
    } finally {
      setCancelSubmitting(false);
    }
  }

  // ================= สถานที่เก็บ =================
  const [locationFilters, setLocationFilters] = useState<ListLocationsParams>({
    sort_by: "complete_name",
    sort_order: "asc",
  });
  const [locationNameInput, setLocationNameInput] = useState("");
  const [locationRows, setLocationRows] = useState<StockLocation[]>([]);
  const [locationTotal, setLocationTotal] = useState(0);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadLocationsTab = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const res = await listLocations(locationFilters);
      setLocationRows(res.data);
      setLocationTotal(res.total_count);
    } catch (err) {
      setLocationError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดรายการสถานที่เก็บได้"
      );
    } finally {
      setLocationLoading(false);
    }
  }, [locationFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLocationsTab();
  }, [loadLocationsTab]);

  function handleLocationSearch() {
    setLocationFilters((prev) => ({ ...prev, name: locationNameInput || undefined }));
  }

  function handleLocationClear() {
    setLocationNameInput("");
    setLocationFilters({ sort_by: "complete_name", sort_order: "asc" });
  }

  function handleLocationSort(column: string) {
    setLocationFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order:
        prev.sort_by === column && prev.sort_order === "asc" ? "desc" : "asc",
    }));
  }

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationForm, setLocationForm] =
    useState<LocationFormState>(emptyLocationForm);
  const [locationSubmitting, setLocationSubmitting] = useState(false);
  const [locationFormError, setLocationFormError] = useState<string | null>(
    null
  );

  function openLocationModal() {
    setLocationForm(emptyLocationForm);
    setLocationFormError(null);
    setLocationModalOpen(true);
  }

  async function handleCreateLocationSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocationFormError(null);

    if (!locationForm.name || !locationForm.parent_location_id) {
      setLocationFormError("กรุณากรอกชื่อและเลือก Parent Location");
      return;
    }

    setLocationSubmitting(true);
    try {
      await createLocation({
        name: locationForm.name,
        parent_location_id: Number(locationForm.parent_location_id),
      });
      setLocationModalOpen(false);
      await loadLocationsTab();
      await loadShared();
    } catch (err) {
      setLocationFormError(
        err instanceof ApiError ? err.message : "ไม่สามารถเพิ่ม Location ได้"
      );
    } finally {
      setLocationSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="คลังหน่วยงาน"
        subtitle="จัดการสต็อกตาม location และการโอนย้ายระหว่างหน่วยงาน"
      />

      {refError && (
        <div className="mb-4">
          <ErrorBox message={refError} />
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stock" && (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Ward / Location">
                <select
                  className={selectCls}
                  value={stockLocationInput}
                  onChange={(e) => setStockLocationInput(e.target.value)}
                >
                  <option value="">- ทั้งหมด -</option>
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.complete_name ?? loc.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product Template ID">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="เช่น 123"
                  value={stockProductInput}
                  onChange={(e) => setStockProductInput(e.target.value)}
                />
              </Field>
              <div className="flex items-end gap-2">
                <button className={btnPrimaryCls} onClick={handleStockSearch}>
                  ค้นหา
                </button>
                <button className={btnSecondaryCls} onClick={handleStockClear}>
                  ล้าง
                </button>
              </div>
              <div className="flex items-end justify-end">
                <button className={btnPrimaryCls} onClick={openDeductModal}>
                  ตัดสต็อก
                </button>
              </div>
            </div>
          </Card>

          <p className="mb-3 text-sm text-slate-500">
            พบ {stockTotal.toLocaleString("th-TH")} รายการ
          </p>

          <TableShell>
            <thead>
              <tr>
                <Th
                  onClick={() => handleStockSort("id")}
                  active={stockFilters.sort_by === "id"}
                  dir={stockFilters.sort_order}
                >
                  ID
                </Th>
                <Th>Location</Th>
                <Th>Product Template</Th>
                <Th
                  onClick={() => handleStockSort("quantity")}
                  active={stockFilters.sort_by === "quantity"}
                  dir={stockFilters.sort_order}
                >
                  จำนวน
                </Th>
                <Th
                  onClick={() => handleStockSort("reserved_quantity")}
                  active={stockFilters.sort_by === "reserved_quantity"}
                  dir={stockFilters.sort_order}
                >
                  จองแล้ว
                </Th>
                <Th
                  onClick={() => handleStockSort("available_quantity")}
                  active={stockFilters.sort_by === "available_quantity"}
                  dir={stockFilters.sort_order}
                >
                  คงเหลือใช้ได้
                </Th>
                <Th>หน่วย</Th>
              </tr>
            </thead>
            <tbody>
              {stockLoading && (
                <tr>
                  <td colSpan={7}>
                    <LoadingBox />
                  </td>
                </tr>
              )}
              {!stockLoading && stockError && (
                <tr>
                  <td colSpan={7} className="p-4">
                    <ErrorBox message={stockError} />
                  </td>
                </tr>
              )}
              {!stockLoading && !stockError && stockRows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyBox text="ไม่พบข้อมูลสต็อก" />
                  </td>
                </tr>
              )}
              {!stockLoading &&
                !stockError &&
                stockRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <Td>{row.id}</Td>
                    <Td>{row.location_id ? row.location_id[1] : "-"}</Td>
                    <Td>{row.product_id ? row.product_id[1] : "-"}</Td>
                    <Td>{formatQty(row.quantity)}</Td>
                    <Td>{formatQty(row.reserved_quantity)}</Td>
                    <Td>{formatQty(row.available_quantity)}</Td>
                    <Td>{row.uom_id ? row.uom_id[1] : "-"}</Td>
                  </tr>
                ))}
            </tbody>
          </TableShell>

          <Modal
            open={deductOpen}
            title="ตัดสต็อก"
            onClose={() => setDeductOpen(false)}
          >
            <form onSubmit={handleDeductSubmit} className="space-y-4">
              <Field label="Ward / Location" required>
                <select
                  required
                  className={selectCls}
                  value={deductForm.location_id}
                  onChange={(e) =>
                    setDeductForm((f) => ({ ...f, location_id: e.target.value }))
                  }
                >
                  <option value="">- เลือก -</option>
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.complete_name ?? loc.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Product Template ID"
                required
                hint="Odoo product.template id"
              >
                <input
                  required
                  type="number"
                  className={inputCls}
                  value={deductForm.product_template_id}
                  onChange={(e) =>
                    setDeductForm((f) => ({
                      ...f,
                      product_template_id: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="จำนวนที่ต้องการตัด" required>
                <input
                  required
                  type="number"
                  step="any"
                  min="0"
                  className={inputCls}
                  value={deductForm.quantity}
                  onChange={(e) =>
                    setDeductForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </Field>
              <Field label="หน่วย (UoM)" hint="ถ้าไม่เลือก จะใช้หน่วยของสินค้า">
                <select
                  className={selectCls}
                  value={deductForm.uom_id}
                  onChange={(e) =>
                    setDeductForm((f) => ({ ...f, uom_id: e.target.value }))
                  }
                >
                  <option value="">- ใช้หน่วยของสินค้า -</option>
                  {uomList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </Field>
              {deductError && <ErrorBox message={deductError} />}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondaryCls}
                  onClick={() => setDeductOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={deductSubmitting}
                  className={btnPrimaryCls}
                >
                  {deductSubmitting ? "กำลังบันทึก..." : "ตัดสต็อก"}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {activeTab === "transfers" && (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="สถานะ">
                <select
                  className={selectCls}
                  value={transferStateInput}
                  onChange={(e) => setTransferStateInput(e.target.value)}
                >
                  <option value="">- ทั้งหมด -</option>
                  {TRANSFER_STATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location ต้นทาง">
                <select
                  className={selectCls}
                  value={transferFromInput}
                  onChange={(e) => setTransferFromInput(e.target.value)}
                >
                  <option value="">- ทั้งหมด -</option>
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.complete_name ?? loc.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location ปลายทาง">
                <select
                  className={selectCls}
                  value={transferToInput}
                  onChange={(e) => setTransferToInput(e.target.value)}
                >
                  <option value="">- ทั้งหมด -</option>
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.complete_name ?? loc.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end gap-2">
                <button className={btnPrimaryCls} onClick={handleTransferSearch}>
                  ค้นหา
                </button>
                <button className={btnSecondaryCls} onClick={handleTransferClear}>
                  ล้าง
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button className={btnPrimaryCls} onClick={openTransferModal}>
                สร้างใบโอน
              </button>
            </div>
          </Card>

          <p className="mb-3 text-sm text-slate-500">
            พบ {transferTotal.toLocaleString("th-TH")} รายการ
          </p>

          <TableShell>
            <thead>
              <tr>
                <Th
                  onClick={() => handleTransferSort("name")}
                  active={transferFilters.sort_by === "name"}
                  dir={transferFilters.sort_order}
                >
                  เลขที่ใบโอน
                </Th>
                <Th
                  onClick={() => handleTransferSort("state")}
                  active={transferFilters.sort_by === "state"}
                  dir={transferFilters.sort_order}
                >
                  สถานะ
                </Th>
                <Th>ต้นทาง</Th>
                <Th>ปลายทาง</Th>
                <Th
                  onClick={() => handleTransferSort("scheduled_date")}
                  active={transferFilters.sort_by === "scheduled_date"}
                  dir={transferFilters.sort_order}
                >
                  กำหนดโอน
                </Th>
                <Th
                  onClick={() => handleTransferSort("date_done")}
                  active={transferFilters.sort_by === "date_done"}
                  dir={transferFilters.sort_order}
                >
                  เสร็จสิ้นเมื่อ
                </Th>
                <Th>รายการ</Th>
                <Th>การดำเนินการ</Th>
              </tr>
            </thead>
            <tbody>
              {transferLoading && (
                <tr>
                  <td colSpan={8}>
                    <LoadingBox />
                  </td>
                </tr>
              )}
              {!transferLoading && transferError && (
                <tr>
                  <td colSpan={8} className="p-4">
                    <ErrorBox message={transferError} />
                  </td>
                </tr>
              )}
              {!transferLoading && !transferError && transferRows.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyBox text="ไม่พบรายการโอนย้าย" />
                  </td>
                </tr>
              )}
              {!transferLoading &&
                !transferError &&
                transferRows.map((t) => (
                  <Fragment key={t.id}>
                    <tr
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() =>
                        setExpandedTransferId((id) => (id === t.id ? null : t.id))
                      }
                    >
                      <Td className="font-medium text-slate-800">{t.name}</Td>
                      <Td>
                        <Badge tone={transferTone(t.state)}>
                          {TRANSFER_STATE_LABEL[t.state] ?? t.state}
                        </Badge>
                      </Td>
                      <Td>{t.location_id ? t.location_id[1] : "-"}</Td>
                      <Td>{t.location_dest_id ? t.location_dest_id[1] : "-"}</Td>
                      <Td>{formatDateTime(t.scheduled_date || null)}</Td>
                      <Td>{formatDateTime(t.date_done || null)}</Td>
                      <Td>{t.items?.length ?? 0} รายการ</Td>
                      <Td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelTarget(t);
                          }}
                          disabled={t.state === "done" || t.state === "cancel"}
                          className={btnDangerCls}
                        >
                          ยกเลิก
                        </button>
                      </Td>
                    </tr>
                    {expandedTransferId === t.id && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50 px-4 py-3">
                          {t.items && t.items.length > 0 ? (
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="px-2 py-1 text-left">สินค้า</th>
                                  <th className="px-2 py-1 text-left">จำนวน</th>
                                  <th className="px-2 py-1 text-left">หน่วย</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.items.map((it, idx) => (
                                  <tr key={it.id ?? idx}>
                                    <td className="px-2 py-1">
                                      {it.product_id ? it.product_id[1] : "-"}
                                    </td>
                                    <td className="px-2 py-1">
                                      {formatQty(it.product_uom_qty)}
                                    </td>
                                    <td className="px-2 py-1">
                                      {it.product_uom ? it.product_uom[1] : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs text-slate-400">
                              ไม่มีรายการสินค้า
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
            </tbody>
          </TableShell>

          <Modal
            open={transferModalOpen}
            title="สร้างใบโอน"
            onClose={() => setTransferModalOpen(false)}
            wide
          >
            <form onSubmit={handleCreateTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Location ต้นทาง" required>
                  <select
                    required
                    className={selectCls}
                    value={transferForm.from_location_id}
                    onChange={(e) =>
                      setTransferForm((f) => ({
                        ...f,
                        from_location_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">- เลือก -</option>
                    {allLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.complete_name ?? loc.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Location ปลายทาง" required>
                  <select
                    required
                    className={selectCls}
                    value={transferForm.to_location_id}
                    onChange={(e) =>
                      setTransferForm((f) => ({
                        ...f,
                        to_location_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">- เลือก -</option>
                    {allLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.complete_name ?? loc.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {internalPickingType && (
                <p className="text-xs text-slate-400">
                  ประเภทการโอน: {internalPickingType.name}
                  {internalPickingType.code ? ` (${internalPickingType.code})` : ""}
                </p>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    รายการสินค้า
                  </span>
                  <button
                    type="button"
                    onClick={addTransferItemRow}
                    className={btnSecondaryCls}
                  >
                    + เพิ่มรายการ
                  </button>
                </div>
                <div className="space-y-3">
                  {transferItemRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4"
                    >
                      <Field label="Product Template ID" required>
                        <input
                          required
                          type="number"
                          className={inputCls}
                          value={row.product_template_id}
                          onChange={(e) =>
                            updateTransferItemRow(
                              idx,
                              "product_template_id",
                              e.target.value
                            )
                          }
                        />
                      </Field>
                      <Field label="จำนวน" required>
                        <input
                          required
                          type="number"
                          step="any"
                          min="0"
                          className={inputCls}
                          value={row.quantity}
                          onChange={(e) =>
                            updateTransferItemRow(idx, "quantity", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="หน่วย (UoM)" hint="ไม่เลือก = หน่วยของสินค้า">
                        <select
                          className={selectCls}
                          value={row.uom_id}
                          onChange={(e) =>
                            updateTransferItemRow(idx, "uom_id", e.target.value)
                          }
                        >
                          <option value="">- ใช้หน่วยของสินค้า -</option>
                          {uomList.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={transferItemRows.length <= 1}
                          onClick={() => removeTransferItemRow(idx)}
                          className={btnDangerCls}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {transferFormError && <ErrorBox message={transferFormError} />}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondaryCls}
                  onClick={() => setTransferModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className={btnPrimaryCls}
                >
                  {transferSubmitting ? "กำลังบันทึก..." : "สร้างใบโอน"}
                </button>
              </div>
            </form>
          </Modal>

          <Modal
            open={!!cancelTarget}
            title="ยืนยันการยกเลิกใบโอน"
            onClose={closeCancelModal}
          >
            <p className="mb-4 text-sm text-slate-600">
              ต้องการยกเลิกใบโอน{" "}
              <span className="font-medium text-slate-800">
                {cancelTarget?.name}
              </span>{" "}
              ใช่หรือไม่?
            </p>
            {cancelError && (
              <div className="mb-3">
                <ErrorBox message={cancelError} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondaryCls}
                onClick={closeCancelModal}
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={handleCancelConfirm}
                className={btnDangerCls}
              >
                {cancelSubmitting ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
              </button>
            </div>
          </Modal>
        </>
      )}

      {activeTab === "locations" && (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="ชื่อ Location">
                <input
                  className={inputCls}
                  placeholder="เช่น Ward A, ICU"
                  value={locationNameInput}
                  onChange={(e) => setLocationNameInput(e.target.value)}
                />
              </Field>
              <div className="flex items-end gap-2">
                <button className={btnPrimaryCls} onClick={handleLocationSearch}>
                  ค้นหา
                </button>
                <button className={btnSecondaryCls} onClick={handleLocationClear}>
                  ล้าง
                </button>
              </div>
              <div />
              <div className="flex items-end justify-end">
                <button className={btnPrimaryCls} onClick={openLocationModal}>
                  เพิ่ม Location
                </button>
              </div>
            </div>
          </Card>

          <p className="mb-3 text-sm text-slate-500">
            พบ {locationTotal.toLocaleString("th-TH")} รายการ
          </p>

          <TableShell>
            <thead>
              <tr>
                <Th
                  onClick={() => handleLocationSort("id")}
                  active={locationFilters.sort_by === "id"}
                  dir={locationFilters.sort_order}
                >
                  ID
                </Th>
                <Th
                  onClick={() => handleLocationSort("name")}
                  active={locationFilters.sort_by === "name"}
                  dir={locationFilters.sort_order}
                >
                  ชื่อ
                </Th>
                <Th
                  onClick={() => handleLocationSort("complete_name")}
                  active={locationFilters.sort_by === "complete_name"}
                  dir={locationFilters.sort_order}
                >
                  ชื่อเต็ม
                </Th>
              </tr>
            </thead>
            <tbody>
              {locationLoading && (
                <tr>
                  <td colSpan={3}>
                    <LoadingBox />
                  </td>
                </tr>
              )}
              {!locationLoading && locationError && (
                <tr>
                  <td colSpan={3} className="p-4">
                    <ErrorBox message={locationError} />
                  </td>
                </tr>
              )}
              {!locationLoading && !locationError && locationRows.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyBox text="ไม่พบสถานที่เก็บ" />
                  </td>
                </tr>
              )}
              {!locationLoading &&
                !locationError &&
                locationRows.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50">
                    <Td>{loc.id}</Td>
                    <Td>{loc.name}</Td>
                    <Td>{loc.complete_name ?? "-"}</Td>
                  </tr>
                ))}
            </tbody>
          </TableShell>

          <Modal
            open={locationModalOpen}
            title="เพิ่ม Location"
            onClose={() => setLocationModalOpen(false)}
          >
            <form onSubmit={handleCreateLocationSubmit} className="space-y-4">
              <Field label="ชื่อ Location" required hint="เช่น Ward A, ICU, OPD">
                <input
                  required
                  className={inputCls}
                  value={locationForm.name}
                  onChange={(e) =>
                    setLocationForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Parent Location" required>
                <select
                  required
                  className={selectCls}
                  value={locationForm.parent_location_id}
                  onChange={(e) =>
                    setLocationForm((f) => ({
                      ...f,
                      parent_location_id: e.target.value,
                    }))
                  }
                >
                  <option value="">- เลือก -</option>
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.complete_name ?? loc.name}
                    </option>
                  ))}
                </select>
              </Field>
              {locationFormError && <ErrorBox message={locationFormError} />}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondaryCls}
                  onClick={() => setLocationModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={locationSubmitting}
                  className={btnPrimaryCls}
                >
                  {locationSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </AppShell>
  );
}
