"use client";

import { useCallback, useState } from "react";
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
  SuccessBox,
  Td,
  Th,
  TableShell,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDate,
  formatDateTime,
  inputCls,
  selectCls,
  statusTone,
} from "@/components/ui";
import {
  CreatePatientInventoryResponse,
  FetchUpdateExpiredResponse,
  ListPatientInventoryParams,
  PATIENT_INVENTORY_SORT_OPTIONS,
  PATIENT_INVENTORY_STATUS_OPTIONS,
  PatientInventoryRecord,
  createPatientInventory,
  deletePatientInventory,
  extendExpiredInventory,
  fetchUpdateExpiredInventory,
  listPatientInventory,
  preparePatientInventory,
} from "@/lib/api/patient-inventory";
import { deductInventory } from "@/lib/api/products";
import { StockLocation, listLocations } from "@/lib/api/unit-inventory";
import { ApiError, Patient, listPatients } from "@/lib/api";

type SortBy = (typeof PATIENT_INVENTORY_SORT_OPTIONS)[number]["value"];

function canPrepare(status: string | null | undefined): boolean {
  return status === "ready_to_use";
}

// ปุ่ม "ใช้" ยิง POST /inventory/deduct (mode inv_id) ซึ่งหักได้เฉพาะ ready_to_use/extended
function canUse(status: string | null | undefined): boolean {
  return status === "ready_to_use" || status === "extended";
}

function canExtend(status: string | null | undefined): boolean {
  return status === "expired";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CreateForm {
  hn: string;
  orderId: string;
  itemId: string;
  itemName: string;
  createdBy: string;
  status: string;
  usedBy: string;
  medicationOrderId: string;
  detail: string;
  note: string;
  quantity: string;
  remainingQty: string;
  countUnit: string;
  type: string;
  usedInVisit: string;
  courseId: string;
}

const EMPTY_CREATE_FORM: CreateForm = {
  hn: "",
  orderId: "",
  itemId: "",
  itemName: "",
  createdBy: "",
  status: "ready_to_use",
  usedBy: "",
  medicationOrderId: "",
  detail: "",
  note: "",
  quantity: "1",
  remainingQty: "",
  countUnit: "",
  type: "item",
  usedInVisit: "",
  courseId: "",
};

interface CreateModalState {
  open: boolean;
  form: CreateForm;
  loading: boolean;
  error: string | null;
  result: CreatePatientInventoryResponse | null;
}

const EMPTY_CREATE_MODAL: CreateModalState = {
  open: false,
  form: EMPTY_CREATE_FORM,
  loading: false,
  error: null,
  result: null,
};

interface FetchUpdateModalState {
  open: boolean;
  currentDate: string;
  loading: boolean;
  error: string | null;
  result: FetchUpdateExpiredResponse | null;
}

const EMPTY_FETCH_UPDATE_MODAL: FetchUpdateModalState = {
  open: false,
  currentDate: "",
  loading: false,
  error: null,
  result: null,
};

interface UseModalState {
  open: boolean;
  record: PatientInventoryRecord | null;
  doctorId: string;
  vn: string;
  quantity: string;
  locationId: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_USE_MODAL: UseModalState = {
  open: false,
  record: null,
  doctorId: "",
  vn: "",
  quantity: "",
  locationId: "",
  loading: false,
  error: null,
};

interface ExtendModalState {
  open: boolean;
  record: PatientInventoryRecord | null;
  extendedDate: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_EXTEND_MODAL: ExtendModalState = {
  open: false,
  record: null,
  extendedDate: "",
  loading: false,
  error: null,
};

interface DeleteModalState {
  open: boolean;
  record: PatientInventoryRecord | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_DELETE_MODAL: DeleteModalState = {
  open: false,
  record: null,
  loading: false,
  error: null,
};

export default function PatientInventoryPage() {
  const [rows, setRows] = useState<PatientInventoryRecord[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hn, setHn] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [phone, setPhone] = useState("");
  const [vn, setVn] = useState("");
  const [patientPick, setPatientPick] = useState<{
    open: boolean;
    patients: Patient[];
  }>({ open: false, patients: [] });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [seeAll, setSeeAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("created_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [prepareBusyId, setPrepareBusyId] = useState<number | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const [createModal, setCreateModal] = useState<CreateModalState>(EMPTY_CREATE_MODAL);
  const [fetchUpdateModal, setFetchUpdateModal] = useState<FetchUpdateModalState>(
    EMPTY_FETCH_UPDATE_MODAL
  );
  const [useModal, setUseModal] = useState<UseModalState>(EMPTY_USE_MODAL);
  const [extendModal, setExtendModal] = useState<ExtendModalState>(EMPTY_EXTEND_MODAL);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>(EMPTY_DELETE_MODAL);

  const fetchInventory = useCallback(async (params: ListPatientInventoryParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPatientInventory(params);
      setRows(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลคลังของผู้ป่วยได้"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function currentFilters(): ListPatientInventoryParams {
    return {
      hn: hn || undefined,
      vn: vn || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      see_all: seeAll || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }

  async function handleSearch() {
    const fname = firstname.trim();
    const lname = lastname.trim();
    const phoneNo = phone.trim();

    // มี HN หรือไม่ได้กรอกชื่อ/เบอร์โทร → ค้นหาคลังได้ทันที
    if (hn.trim() || (!fname && !lname && !phoneNo)) {
      setSearched(true);
      fetchInventory(currentFilters());
      return;
    }

    // กรอกชื่อ/เบอร์โทรมา → ค้นหาผู้ป่วยเพื่อหา HN ก่อน
    setLoading(true);
    setError(null);
    try {
      const res = await listPatients({
        firstname: fname || undefined,
        lastname: lname || undefined,
        phone_no: phoneNo || undefined,
      });
      if (res.data.length === 0) {
        setSearched(true);
        setRows([]);
        setTotalFound(0);
        setLoading(false);
        setError("ไม่พบผู้ป่วยที่ตรงกับชื่อ/นามสกุล/เบอร์โทรที่ระบุ");
        return;
      }
      if (res.data.length === 1) {
        searchByPatient(res.data[0]);
        return;
      }
      setLoading(false);
      setPatientPick({ open: true, patients: res.data });
    } catch (err) {
      setSearched(true);
      setRows([]);
      setTotalFound(0);
      setLoading(false);
      setError(err instanceof ApiError ? err.message : "ไม่สามารถค้นหาผู้ป่วยได้");
    }
  }

  // เลือกผู้ป่วยได้ HN แล้ว → ค้นหาคลังต่อด้วย HN นั้น
  function searchByPatient(patient: Patient) {
    setPatientPick({ open: false, patients: [] });
    setHn(patient.hn);
    setSearched(true);
    fetchInventory({ ...currentFilters(), hn: patient.hn });
  }

  // refresh หลังทำรายการ เฉพาะเมื่อผู้ใช้ค้นหาไว้แล้ว
  function refreshIfSearched() {
    if (searched) fetchInventory(currentFilters());
  }

  function handleClear() {
    setHn("");
    setFirstname("");
    setLastname("");
    setPhone("");
    setVn("");
    setStatusFilter([]);
    setDateFrom("");
    setDateTo("");
    setSeeAll(false);
    setSortBy("created_date");
    setSortOrder("desc");
    setSearched(false);
    setRows([]);
    setTotalFound(0);
    setError(null);
    setPrepareError(null);
  }

  function toggleStatusFilter(value: string) {
    setStatusFilter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handlePrepare(record: PatientInventoryRecord) {
    setPrepareBusyId(record.inv_id);
    setPrepareError(null);
    try {
      await preparePatientInventory({ hn: record.hn, inv_id: record.inv_id });
      refreshIfSearched();
    } catch (err) {
      setPrepareError(
        err instanceof ApiError ? err.message : "ไม่สามารถเตรียมรายการได้"
      );
    } finally {
      setPrepareBusyId(null);
    }
  }

  // โหลดรายชื่อ location ครั้งเดียวตอนเปิด modal "ใช้" ครั้งแรก
  // ถ้าโหลดไม่สำเร็จ (locations = [] + loadFailed) จะ fallback เป็นช่องกรอกเลขแทน
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

  function openUseModal(record: PatientInventoryRecord) {
    void ensureLocations();
    setUseModal({
      open: true,
      record,
      doctorId: "",
      vn: record.used_in_visit ?? "",
      quantity: record.remaining_qty != null ? String(record.remaining_qty) : "",
      locationId: "",
      loading: false,
      error: null,
    });
  }

  async function submitUseModal() {
    const record = useModal.record;
    if (!record) return;
    if (!useModal.vn.trim()) {
      setUseModal((prev) => ({ ...prev, error: "กรุณากรอก VN (จำเป็นสำหรับการตัดสต็อก)" }));
      return;
    }
    const quantity = Number(useModal.quantity);
    if (!useModal.quantity.trim() || isNaN(quantity) || quantity <= 0) {
      setUseModal((prev) => ({ ...prev, error: "กรุณากรอกจำนวนที่ใช้ให้ถูกต้อง (มากกว่า 0)" }));
      return;
    }
    if (record.remaining_qty != null && quantity > record.remaining_qty) {
      setUseModal((prev) => ({
        ...prev,
        error: `จำนวนที่ใช้ (${quantity}) มากกว่าคงเหลือ (${record.remaining_qty})`,
      }));
      return;
    }
    setUseModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deductInventory({
        hn: record.hn,
        vn: useModal.vn.trim(),
        location_id: useModal.locationId ? Number(useModal.locationId) : undefined,
        used_by: useModal.doctorId.trim() || undefined,
        inv_id: [{ id: record.inv_id, quantity }],
      });
      setUseModal(EMPTY_USE_MODAL);
      refreshIfSearched();
    } catch (err) {
      setUseModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถตัดสต็อกได้",
      }));
    }
  }

  function openExtendModal(record: PatientInventoryRecord) {
    setExtendModal({ open: true, record, extendedDate: "", loading: false, error: null });
  }

  async function submitExtendModal() {
    const record = extendModal.record;
    if (!record) return;
    if (!extendModal.extendedDate) {
      setExtendModal((prev) => ({ ...prev, error: "กรุณาเลือกวันหมดอายุใหม่" }));
      return;
    }
    setExtendModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await extendExpiredInventory({
        hn: record.hn,
        inv_ids: [record.inv_id],
        extended_date: new Date(extendModal.extendedDate).toISOString(),
      });
      setExtendModal(EMPTY_EXTEND_MODAL);
      refreshIfSearched();
    } catch (err) {
      setExtendModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถต่ออายุได้",
      }));
    }
  }

  function openDeleteModal(record: PatientInventoryRecord) {
    setDeleteModal({ open: true, record, loading: false, error: null });
  }

  async function submitDeleteModal() {
    const record = deleteModal.record;
    if (!record) return;
    setDeleteModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deletePatientInventory({
        hn: record.hn,
        inv_id: record.inv_id,
      });
      setDeleteModal(EMPTY_DELETE_MODAL);
      refreshIfSearched();
    } catch (err) {
      setDeleteModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถลบรายการได้",
      }));
    }
  }

  function updateCreateForm<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    setCreateModal((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));
  }

  async function submitCreateModal() {
    const form = createModal.form;
    if (!form.hn.trim() || form.orderId.trim() === "" || form.itemId.trim() === "") {
      setCreateModal((prev) => ({
        ...prev,
        error: "กรุณากรอก HN, Order ID และ Item ID",
      }));
      return;
    }
    const orderId = Number(form.orderId);
    const itemId = Number(form.itemId);
    if (Number.isNaN(orderId) || Number.isNaN(itemId)) {
      setCreateModal((prev) => ({
        ...prev,
        error: "Order ID และ Item ID ต้องเป็นตัวเลข",
      }));
      return;
    }

    setCreateModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await createPatientInventory([
        {
          hn: form.hn.trim(),
          order_id: orderId,
          item_id: itemId,
          item_name: form.itemName || undefined,
          created_by: form.createdBy || undefined,
          status: form.status || undefined,
          used_by: form.usedBy || undefined,
          medication_order_id: form.medicationOrderId || undefined,
          detail: form.detail || undefined,
          note: form.note || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          remaining_qty: form.remainingQty ? Number(form.remainingQty) : undefined,
          count_unit: form.countUnit || undefined,
          type: form.type || undefined,
          used_in_visit: form.usedInVisit || undefined,
          course_id: form.courseId || undefined,
        },
      ]);
      setCreateModal((prev) => ({ ...prev, loading: false, result: res }));
      refreshIfSearched();
    } catch (err) {
      setCreateModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof ApiError ? err.message : "ไม่สามารถเพิ่มรายการได้",
      }));
    }
  }

  function openFetchUpdateModal() {
    setFetchUpdateModal({
      open: true,
      currentDate: todayStr(),
      loading: false,
      error: null,
      result: null,
    });
  }

  async function submitFetchUpdateModal() {
    if (!fetchUpdateModal.currentDate) return;
    setFetchUpdateModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetchUpdateExpiredInventory({
        current_date: fetchUpdateModal.currentDate,
      });
      setFetchUpdateModal((prev) => ({ ...prev, loading: false, result: res }));
      refreshIfSearched();
    } catch (err) {
      setFetchUpdateModal((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof ApiError ? err.message : "ไม่สามารถอัปเดตรายการหมดอายุได้",
      }));
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="คลังของผู้ป่วย"
        subtitle="ของที่ถูกสั่งและผูกกับผู้ป่วยรายตัว เช่น สินค้าในคอร์ส, ยา"
        actions={
          <>
            <button
              onClick={() => setCreateModal({ ...EMPTY_CREATE_MODAL, open: true })}
              className={btnPrimaryCls}
            >
              + เพิ่มรายการ
            </button>
            <button onClick={openFetchUpdateModal} className={btnSecondaryCls}>
              อัปเดตรายการหมดอายุ
            </button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="HN ผู้ป่วย" hint="ค้นหาแบบตรงทั้งหมด (exact match)">
            <input
              type="text"
              value={hn}
              onChange={(e) => setHn(e.target.value)}
              className={inputCls}
              placeholder="เช่น HN0000123"
            />
          </Field>
          <Field label="ชื่อ" hint="ไม่รู้ HN ก็ค้นหาด้วยชื่อได้">
            <input
              type="text"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              className={inputCls}
              placeholder="ค้นหาบางส่วนได้"
            />
          </Field>
          <Field label="นามสกุล" hint="ไม่รู้ HN ก็ค้นหาด้วยนามสกุลได้">
            <input
              type="text"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              className={inputCls}
              placeholder="ค้นหาบางส่วนได้"
            />
          </Field>
          <Field label="เบอร์โทร" hint="ค้นหาแบบตรงทั้งหมด (exact match)">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              placeholder="เช่น 0812345678"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="VN ที่ใช้">
            <input
              type="text"
              value={vn}
              onChange={(e) => setVn(e.target.value)}
              className={inputCls}
              placeholder="เลขที่ visit"
            />
          </Field>
          <Field label="วันที่สร้าง ตั้งแต่">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="วันที่สร้าง ถึง">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="เรียงตาม">
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className={selectCls}
              >
                {PATIENT_INVENTORY_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className={selectCls}
              >
                <option value="desc">มากไปน้อย</option>
                <option value="asc">น้อยไปมาก</option>
              </select>
            </div>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="สถานะ" hint="ไม่เลือก = ใช้ค่าเริ่มต้นของระบบ">
            <div className="flex flex-wrap gap-3 pt-1">
              {PATIENT_INVENTORY_STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-1.5 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(opt.value)}
                    onChange={() => toggleStatusFilter(opt.value)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {opt.label}
                </label>
              ))}
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={seeAll}
                  onChange={(e) => setSeeAll(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                แสดงทั้งหมด (รวมหมดอายุ)
              </label>
            </div>
          </Field>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleSearch} className={btnPrimaryCls}>
            ค้นหา
          </button>
          <button onClick={handleClear} className={btnSecondaryCls}>
            ล้าง
          </button>
        </div>
      </Card>

      {searched && (
        <p className="mb-3 text-sm text-slate-500">
          พบ {totalFound.toLocaleString("th-TH")} รายการ
        </p>
      )}

      {prepareError && (
        <div className="mb-3">
          <ErrorBox message={prepareError} />
        </div>
      )}

      {!searched && (
        <EmptyBox text="กรอกเงื่อนไขที่ต้องการ แล้วกด “ค้นหา” เพื่อแสดงข้อมูลคลังของผู้ป่วย" />
      )}

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {searched && !loading && !error && rows.length === 0 && (
        <EmptyBox text="ไม่พบข้อมูลคลังของผู้ป่วย" />
      )}

      {!loading && !error && rows.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>HN</Th>
              <Th>รายการ</Th>
              <Th>Order ID</Th>
              <Th>ประเภท</Th>
              <Th>จำนวน / คงเหลือ</Th>
              <Th>VN ที่ใช้</Th>
              <Th>วันหมดอายุ</Th>
              <Th>สถานะ</Th>
              <Th>วันที่สร้าง</Th>
              <Th>การดำเนินการ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.inv_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{row.hn}</Td>
                <Td>{row.item_name ?? row.item_id}</Td>
                <Td>{row.order_id}</Td>
                <Td>{row.type ?? "-"}</Td>
                <Td>
                  {row.quantity ?? "-"}
                  {row.remaining_qty != null ? ` / ${row.remaining_qty}` : ""}
                  {row.count_unit ? ` ${row.count_unit}` : ""}
                </Td>
                <Td>{row.used_in_visit ?? "-"}</Td>
                <Td>{formatDate(row.expired_date)}</Td>
                <Td>
                  <Badge tone={statusTone(row.status)}>{row.status ?? "-"}</Badge>
                </Td>
                <Td>{formatDateTime(row.created_date)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {canPrepare(row.status) && (
                      <button
                        onClick={() => handlePrepare(row)}
                        className={btnSecondaryCls}
                        disabled={prepareBusyId === row.inv_id}
                      >
                        {prepareBusyId === row.inv_id ? "กำลังเตรียม..." : "เตรียม"}
                      </button>
                    )}
                    {canUse(row.status) && (
                      <button
                        onClick={() => openUseModal(row)}
                        className={btnSecondaryCls}
                      >
                        ใช้
                      </button>
                    )}
                    {canExtend(row.status) && (
                      <button
                        onClick={() => openExtendModal(row)}
                        className={btnSecondaryCls}
                      >
                        ต่ออายุ
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(row)}
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

      {/* เลือกผู้ป่วย (กรณีค้นหาด้วยชื่อ/เบอร์โทรแล้วพบหลายราย) */}
      <Modal
        open={patientPick.open}
        title={`พบผู้ป่วย ${patientPick.patients.length} ราย`}
        onClose={() => setPatientPick({ open: false, patients: [] })}
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            พบผู้ป่วยที่ตรงกับเงื่อนไขมากกว่า 1 ราย กรุณาเลือกผู้ป่วยที่ต้องการดูข้อมูลคลัง
          </p>
          <TableShell>
            <thead>
              <tr>
                <Th>HN</Th>
                <Th>ชื่อ-สกุล</Th>
                <Th>เบอร์โทร</Th>
                <Th>วันเกิด</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientPick.patients.map((p) => (
                <tr key={p.hn} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{p.hn}</Td>
                  <Td>
                    {`${p.pname ?? ""}${p.firstname ?? ""} ${p.lastname ?? ""}`.trim() ||
                      "-"}
                  </Td>
                  <Td>{p.phone_no ?? "-"}</Td>
                  <Td>{formatDate(p.birthdate)}</Td>
                  <Td>
                    <button
                      onClick={() => searchByPatient(p)}
                      className={btnPrimaryCls}
                    >
                      เลือก
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="flex justify-end">
            <button
              onClick={() => setPatientPick({ open: false, patients: [] })}
              className={btnSecondaryCls}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </Modal>

      {/* เพิ่มรายการ */}
      <Modal
        open={createModal.open}
        title="เพิ่มรายการคลังของผู้ป่วย"
        onClose={() => setCreateModal(EMPTY_CREATE_MODAL)}
        wide
      >
        {createModal.result ? (
          <div className="space-y-4">
            <SuccessBox>เพิ่มรายการสำเร็จ</SuccessBox>
            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setCreateModal({ ...EMPTY_CREATE_MODAL, open: true })
                }
                className={btnSecondaryCls}
              >
                เพิ่มอีกรายการ
              </button>
              <button
                onClick={() => setCreateModal(EMPTY_CREATE_MODAL)}
                className={btnPrimaryCls}
              >
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="HN" required>
                <input
                  type="text"
                  value={createModal.form.hn}
                  onChange={(e) => updateCreateForm("hn", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Order ID" required>
                <input
                  type="number"
                  value={createModal.form.orderId}
                  onChange={(e) => updateCreateForm("orderId", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Item ID" required>
                <input
                  type="number"
                  value={createModal.form.itemId}
                  onChange={(e) => updateCreateForm("itemId", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ชื่อรายการ">
                <input
                  type="text"
                  value={createModal.form.itemName}
                  onChange={(e) => updateCreateForm("itemName", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ประเภท">
                <input
                  type="text"
                  value={createModal.form.type}
                  onChange={(e) => updateCreateForm("type", e.target.value)}
                  className={inputCls}
                  placeholder="item"
                />
              </Field>
              <Field label="สถานะเริ่มต้น">
                <select
                  value={createModal.form.status}
                  onChange={(e) => updateCreateForm("status", e.target.value)}
                  className={selectCls}
                >
                  {PATIENT_INVENTORY_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="จำนวน">
                <input
                  type="number"
                  value={createModal.form.quantity}
                  onChange={(e) => updateCreateForm("quantity", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="คงเหลือ">
                <input
                  type="number"
                  value={createModal.form.remainingQty}
                  onChange={(e) => updateCreateForm("remainingQty", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="หน่วยนับ">
                <input
                  type="text"
                  value={createModal.form.countUnit}
                  onChange={(e) => updateCreateForm("countUnit", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Course ID">
                <input
                  type="text"
                  value={createModal.form.courseId}
                  onChange={(e) => updateCreateForm("courseId", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="VN ที่ใช้">
                <input
                  type="text"
                  value={createModal.form.usedInVisit}
                  onChange={(e) => updateCreateForm("usedInVisit", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Medication Order ID">
                <input
                  type="text"
                  value={createModal.form.medicationOrderId}
                  onChange={(e) =>
                    updateCreateForm("medicationOrderId", e.target.value)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="ผู้สร้าง">
                <input
                  type="text"
                  value={createModal.form.createdBy}
                  onChange={(e) => updateCreateForm("createdBy", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ผู้ใช้">
                <input
                  type="text"
                  value={createModal.form.usedBy}
                  onChange={(e) => updateCreateForm("usedBy", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="รายละเอียด">
              <textarea
                value={createModal.form.detail}
                onChange={(e) => updateCreateForm("detail", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>
            <Field label="หมายเหตุ">
              <textarea
                value={createModal.form.note}
                onChange={(e) => updateCreateForm("note", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>

            {createModal.error && <ErrorBox message={createModal.error} />}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreateModal(EMPTY_CREATE_MODAL)}
                className={btnSecondaryCls}
                disabled={createModal.loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitCreateModal}
                className={btnPrimaryCls}
                disabled={createModal.loading}
              >
                {createModal.loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* อัปเดตรายการหมดอายุ */}
      <Modal
        open={fetchUpdateModal.open}
        title="อัปเดตรายการหมดอายุ"
        onClose={() => setFetchUpdateModal(EMPTY_FETCH_UPDATE_MODAL)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ระบบจะตรวจสอบรายการที่หมดอายุ ณ วันที่กำหนด และปรับสถานะเป็น &quot;หมดอายุ&quot;
            ให้โดยอัตโนมัติ
          </p>
          <Field label="ณ วันที่" required>
            <input
              type="date"
              value={fetchUpdateModal.currentDate}
              onChange={(e) =>
                setFetchUpdateModal((prev) => ({ ...prev, currentDate: e.target.value }))
              }
              className={inputCls}
            />
          </Field>

          {fetchUpdateModal.error && <ErrorBox message={fetchUpdateModal.error} />}
          {fetchUpdateModal.result && (
            <SuccessBox>
              อัปเดตรายการหมดอายุสำเร็จ
              {typeof fetchUpdateModal.result.updated === "number" && (
                <> — ปรับสถานะ {fetchUpdateModal.result.updated} รายการ</>
              )}
            </SuccessBox>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFetchUpdateModal(EMPTY_FETCH_UPDATE_MODAL)}
              className={btnSecondaryCls}
              disabled={fetchUpdateModal.loading}
            >
              ปิด
            </button>
            <button
              onClick={submitFetchUpdateModal}
              className={btnPrimaryCls}
              disabled={fetchUpdateModal.loading || !fetchUpdateModal.currentDate}
            >
              {fetchUpdateModal.loading ? "กำลังอัปเดต..." : "ยืนยันอัปเดต"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ใช้ — ยิง POST /inventory/deduct หัก stock จริง (ทั้งคลังผู้ป่วยและ Odoo) */}
      <Modal
        open={useModal.open}
        title={`ใช้ / ตัดสต็อก Inv ID #${useModal.record?.inv_id ?? ""}`}
        onClose={() => setUseModal(EMPTY_USE_MODAL)}
      >
        <div className="space-y-4">
          <Field label="VN" required hint="ต้องเป็น visit ของ HN นี้และยังไม่ checkout">
            <input
              type="text"
              value={useModal.vn}
              onChange={(e) => setUseModal((prev) => ({ ...prev, vn: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field
            label="จำนวนที่ใช้"
            required
            hint={`คงเหลือ ${useModal.record?.remaining_qty ?? "-"} ${useModal.record?.count_unit ?? ""}`}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              value={useModal.quantity}
              onChange={(e) =>
                setUseModal((prev) => ({ ...prev, quantity: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="ผู้สั่งใช้ (doctor_code)">
            <input
              type="text"
              value={useModal.doctorId}
              onChange={(e) =>
                setUseModal((prev) => ({ ...prev, doctorId: e.target.value }))
              }
              className={inputCls}
              placeholder="รหัสแพทย์ผู้สั่งใช้ (ไม่บังคับ)"
            />
          </Field>
          <Field label="Ward Location" hint="ต้องระบุถ้า item เป็น sub-cut">
            {locationsLoadFailed ? (
              <input
                type="number"
                value={useModal.locationId}
                onChange={(e) =>
                  setUseModal((prev) => ({ ...prev, locationId: e.target.value }))
                }
                className={inputCls}
                placeholder="โหลดรายชื่อไม่สำเร็จ — กรอก Location ID เอง"
              />
            ) : (
              <select
                value={useModal.locationId}
                onChange={(e) =>
                  setUseModal((prev) => ({ ...prev, locationId: e.target.value }))
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

          {useModal.error && <ErrorBox message={useModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setUseModal(EMPTY_USE_MODAL)}
              className={btnSecondaryCls}
              disabled={useModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitUseModal}
              className={btnPrimaryCls}
              disabled={useModal.loading}
            >
              {useModal.loading ? "กำลังตัดสต็อก..." : "ยืนยันการใช้ (ตัดสต็อก)"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ต่ออายุ */}
      <Modal
        open={extendModal.open}
        title={`ต่ออายุ Inv ID #${extendModal.record?.inv_id ?? ""}`}
        onClose={() => setExtendModal(EMPTY_EXTEND_MODAL)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            HN {extendModal.record?.hn} — วันหมดอายุปัจจุบัน:{" "}
            {formatDate(extendModal.record?.expired_date)}
          </p>
          <Field label="วันหมดอายุใหม่" required>
            <input
              type="datetime-local"
              value={extendModal.extendedDate}
              onChange={(e) =>
                setExtendModal((prev) => ({ ...prev, extendedDate: e.target.value }))
              }
              className={inputCls}
            />
          </Field>

          {extendModal.error && <ErrorBox message={extendModal.error} />}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setExtendModal(EMPTY_EXTEND_MODAL)}
              className={btnSecondaryCls}
              disabled={extendModal.loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={submitExtendModal}
              className={btnPrimaryCls}
              disabled={extendModal.loading}
            >
              {extendModal.loading ? "กำลังบันทึก..." : "ยืนยันต่ออายุ"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ลบ */}
      <Modal
        open={deleteModal.open}
        title="ยืนยันการลบรายการ"
        onClose={() => setDeleteModal(EMPTY_DELETE_MODAL)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ต้องการลบรายการ Inv ID{" "}
            <span className="font-medium text-slate-800">{deleteModal.record?.inv_id}</span>{" "}
            ของ HN{" "}
            <span className="font-medium text-slate-800">{deleteModal.record?.hn}</span>{" "}
            ({deleteModal.record?.item_name ?? deleteModal.record?.item_id}) ใช่หรือไม่?
            การลบไม่สามารถย้อนกลับได้
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
              {deleteModal.loading ? "กำลังลบ..." : "ลบรายการ"}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
