"use client";

import { useCallback, useEffect, useState, FormEvent, ReactNode } from "react";
import AppShell from "@/components/AppShell";
import {
  PageHeader,
  Badge,
  statusTone,
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
  formatDate,
  formatMoney,
} from "@/components/ui";
import {
  listCourses,
  registerCourse,
  Course,
  CourseItemInput,
  CourseRegisterBody,
  ListCoursesParams,
} from "@/lib/api/tools";
import { ApiError } from "@/lib/api";

const emptyFilters = {
  course_id: "",
  bussiness_course_id: "",
  name: "",
};

type FilterState = typeof emptyFilters;
type SortBy =
  | "bussiness_course_id"
  | "course_id"
  | "expiredate"
  | "name"
  | "price"
  | "startdate"
  | "status";

const emptyItem = { product_id: "", quantity: "" };

const emptyForm = {
  course_id: "",
  name: "",
  bussiness_course_id: "",
  startdate: "",
  expiredate: "",
  status: "active",
  price: "",
  course_detail: "",
  note: "",
  tag: "",
};

type FormState = typeof emptyForm;

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("startdate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [registerOpen, setRegisterOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  const [detail, setDetail] = useState<Course | null>(null);

  const load = useCallback(
    async (params: ListCoursesParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listCourses(params);
        setCourses(res.data);
        setTotalFound(res.total_found);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลคอร์สได้"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ sort_by: sortBy, sort_order: sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams(base: FilterState, by: SortBy, order: "asc" | "desc") {
    return {
      course_id: base.course_id || undefined,
      bussiness_course_id: base.bussiness_course_id || undefined,
      name: base.name || undefined,
      sort_by: by,
      sort_order: order,
    };
  }

  function handleSearch() {
    load(buildParams(filters, sortBy, sortOrder));
  }

  function handleClear() {
    setFilters(emptyFilters);
    load(buildParams(emptyFilters, sortBy, sortOrder));
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(nextOrder);
    load(buildParams(filters, column, nextOrder));
  }

  function openRegister() {
    setForm(emptyForm);
    setItems([{ ...emptyItem }]);
    setFormError(null);
    setRegisteredId(null);
    setRegisterOpen(true);
  }

  function closeRegister() {
    setRegisterOpen(false);
  }

  function updateItem(index: number, key: keyof typeof emptyItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleRegisterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !form.course_id ||
      !form.name ||
      !form.bussiness_course_id ||
      !form.startdate ||
      !form.price
    ) {
      setFormError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    const validItems = items.filter((it) => it.product_id && it.quantity);
    if (validItems.length === 0) {
      setFormError("กรุณาเพิ่มรายการสินค้าในคอร์สอย่างน้อย 1 รายการ");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const body: CourseRegisterBody = {
        course_id: form.course_id,
        name: form.name,
        bussiness_course_id: form.bussiness_course_id,
        startdate: form.startdate,
        expiredate: form.expiredate || undefined,
        status: form.status || undefined,
        price: Number(form.price),
        course_detail: form.course_detail || undefined,
        note: form.note || undefined,
        tag: form.tag
          ? form.tag.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        items: validItems.map<CourseItemInput>((it) => ({
          product_id: it.product_id,
          quantity: Number(it.quantity),
        })),
      };
      const res = await registerCourse(body);
      setRegisteredId(res.course_id);
      load(buildParams(filters, sortBy, sortOrder));
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "ไม่สามารถลงทะเบียนคอร์สได้"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleRegisterAgain() {
    setForm(emptyForm);
    setItems([{ ...emptyItem }]);
    setRegisteredId(null);
    setFormError(null);
  }

  return (
    <AppShell>
      <PageHeader
        title="คอร์ส"
        subtitle="คอร์สการรักษา/โปรแกรมสุขภาพที่ลงทะเบียนในระบบ"
        actions={
          <button className={btnPrimaryCls} onClick={openRegister}>
            ลงทะเบียนคอร์ส
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="รหัสคอร์ส"
            value={filters.course_id}
            onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="รหัสคอร์สธุรกิจ"
            value={filters.bussiness_course_id}
            onChange={(e) =>
              setFilters({ ...filters, bussiness_course_id: e.target.value })
            }
            className={inputCls}
          />
          <input
            type="text"
            placeholder="ชื่อคอร์ส"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={handleSearch} className={btnPrimaryCls}>
            ค้นหา
          </button>
          <button onClick={handleClear} className={btnSecondaryCls}>
            ล้าง
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}
      {!loading && !error && courses.length === 0 && (
        <EmptyBox text="ไม่พบคอร์ส" />
      )}

      {!loading && !error && courses.length > 0 && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th onClick={() => handleSort("course_id")} active={sortBy === "course_id"} dir={sortOrder}>
                รหัสคอร์ส
              </Th>
              <Th onClick={() => handleSort("name")} active={sortBy === "name"} dir={sortOrder}>
                ชื่อคอร์ส
              </Th>
              <Th onClick={() => handleSort("bussiness_course_id")} active={sortBy === "bussiness_course_id"} dir={sortOrder}>
                รหัสคอร์สธุรกิจ
              </Th>
              <Th onClick={() => handleSort("startdate")} active={sortBy === "startdate"} dir={sortOrder}>
                วันเริ่ม
              </Th>
              <Th onClick={() => handleSort("expiredate")} active={sortBy === "expiredate"} dir={sortOrder}>
                วันหมดอายุ
              </Th>
              <Th onClick={() => handleSort("status")} active={sortBy === "status"} dir={sortOrder}>
                สถานะ
              </Th>
              <Th onClick={() => handleSort("price")} active={sortBy === "price"} dir={sortOrder}>
                ราคา
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((course) => (
              <tr
                key={course.course_id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setDetail(course)}
              >
                <Td className="font-medium text-slate-800">{course.course_id}</Td>
                <Td>{course.name}</Td>
                <Td>{course.bussiness_course_id}</Td>
                <Td>{formatDate(course.startdate)}</Td>
                <Td>{formatDate(course.expiredate)}</Td>
                <Td>
                  <Badge tone={statusTone(course.status)}>{course.status}</Badge>
                </Td>
                <Td>{formatMoney(course.price)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={registerOpen}
        title="ลงทะเบียนคอร์ส"
        onClose={closeRegister}
        wide
      >
        {registeredId ? (
          <div className="space-y-4">
            <SuccessBox>
              ลงทะเบียนสำเร็จ รหัสคอร์ส: <strong>{registeredId}</strong>
            </SuccessBox>
            <div className="flex justify-end gap-2">
              <button className={btnSecondaryCls} onClick={handleRegisterAgain}>
                ลงทะเบียนคอร์สถัดไป
              </button>
              <button className={btnPrimaryCls} onClick={closeRegister}>
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="รหัสคอร์ส" required>
                <input
                  type="text"
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="ชื่อคอร์ส" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="รหัสคอร์สธุรกิจ" required>
                <input
                  type="text"
                  value={form.bussiness_course_id}
                  onChange={(e) =>
                    setForm({ ...form, bussiness_course_id: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="ราคาเต็ม" required>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="วันเริ่มคอร์ส" required>
                <input
                  type="datetime-local"
                  value={form.startdate}
                  onChange={(e) => setForm({ ...form, startdate: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="วันหมดอายุ">
                <input
                  type="datetime-local"
                  value={form.expiredate}
                  onChange={(e) => setForm({ ...form, expiredate: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="สถานะ">
                <input
                  type="text"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="แท็ก" hint="คั่นด้วยจุลภาค เช่น ผิวหน้า, ออร่า">
                <input
                  type="text"
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="รายละเอียดคอร์ส">
              <textarea
                value={form.course_detail}
                onChange={(e) => setForm({ ...form, course_detail: e.target.value })}
                rows={2}
                className={inputCls}
              />
            </Field>
            <Field label="หมายเหตุ">
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className={inputCls}
              />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  รายการสินค้าในคอร์ส<span className="ml-0.5 text-red-500">*</span>
                </span>
                <button type="button" className={btnSecondaryCls} onClick={addItem}>
                  + เพิ่มรายการ
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="รหัสสินค้า (product_id)"
                      value={item.product_id}
                      onChange={(e) => updateItem(index, "product_id", e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="จำนวน"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      className={btnSecondaryCls}
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {formError && <ErrorBox message={formError} />}

            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondaryCls} onClick={closeRegister}>
                ยกเลิก
              </button>
              <button type="submit" disabled={submitting} className={btnPrimaryCls}>
                {submitting ? "กำลังบันทึก..." : "ลงทะเบียน"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!detail} title="รายละเอียดคอร์ส" onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <Row label="รหัสคอร์ส" value={detail.course_id} />
              <Row label="ชื่อคอร์ส" value={detail.name} />
              <Row label="รหัสคอร์สธุรกิจ" value={detail.bussiness_course_id} />
              <Row label="วันเริ่มคอร์ส" value={formatDate(detail.startdate)} />
              <Row label="วันหมดอายุ" value={formatDate(detail.expiredate)} />
              <Row
                label="สถานะ"
                value={<Badge tone={statusTone(detail.status)}>{detail.status}</Badge>}
              />
              <Row label="ราคาเต็ม" value={formatMoney(detail.price)} />
              <Row label="รายละเอียด" value={detail.course_detail ?? "-"} />
              <Row label="หมายเหตุ" value={detail.note ?? "-"} />
              <Row
                label="แท็ก"
                value={detail.tag && detail.tag.length > 0 ? detail.tag.join(", ") : "-"}
              />
            </dl>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600">
                รายการสินค้าในคอร์ส
              </p>
              <TableShell>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>รหัสสินค้า</Th>
                    <Th>ชื่อสินค้า</Th>
                    <Th>จำนวน</Th>
                    <Th>สถานะ</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.items.map((item, index) => (
                    <tr key={index}>
                      <Td>{item.product_id}</Td>
                      <Td>{item.product_name ?? "-"}</Td>
                      <Td>{item.quantity}</Td>
                      <Td>
                        {item.status ? (
                          <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                        ) : (
                          "-"
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
