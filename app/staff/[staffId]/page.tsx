"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Badge,
  Card,
  ErrorBox,
  Field,
  LoadingBox,
  Modal,
  PageHeader,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDateTime,
  inputCls,
  selectCls,
  statusTone,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  STAFF_ROLE_OPTIONS,
  Staff,
  StaffRole,
  StaffUpdateBody,
  deleteStaff,
  getStaff,
  staffRoleLabel,
  updateStaff,
} from "@/lib/api/staff";

const emptyForm = {
  pname: "",
  firstname: "",
  lastname: "",
  role: "" as StaffRole | "",
  doctor_code: "",
  department: "",
  gender: "",
  phone_no: "",
  email: "",
  address: "",
  note: "",
};

type FormState = typeof emptyForm;

function toFormState(s: Staff): FormState {
  return {
    pname: s.pname ?? "",
    firstname: s.firstname ?? "",
    lastname: s.lastname ?? "",
    role: s.role ?? "",
    doctor_code: s.doctor_code ?? "",
    department: s.department ?? "",
    gender: s.gender != null ? String(s.gender) : "",
    phone_no: s.phone_no ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    note: s.note ?? "",
  };
}

export default function StaffDetailPage() {
  const params = useParams<{ staffId: string }>();
  const router = useRouter();
  const staffId = Number(params.staffId);

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStaff(staffId);
      setStaff(res.data);
      setForm(toFormState(res.data));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลบุคลากรได้"
      );
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit() {
    if (staff) setForm(toFormState(staff));
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const body: StaffUpdateBody = {
        pname: form.pname || undefined,
        firstname: form.firstname || undefined,
        lastname: form.lastname || undefined,
        role: form.role || undefined,
        doctor_code: form.doctor_code || undefined,
        department: form.department || undefined,
        gender: form.gender ? Number(form.gender) : undefined,
        phone_no: form.phone_no || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
      };
      await updateStaff(staffId, body);
      setEditing(false);
      await load();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกข้อมูลได้"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteStaff(staffId);
      router.push("/staff");
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "ไม่สามารถลบบุคลากรได้"
      );
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="รายละเอียดบุคลากร"
        subtitle={staff ? staff.staff_code : undefined}
        actions={
          <div className="flex gap-2">
            <Link href="/staff" className={btnSecondaryCls}>
              กลับรายชื่อ
            </Link>
            {staff && !editing && (
              <>
                <button onClick={startEdit} className={btnPrimaryCls}>
                  แก้ไข
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className={btnDangerCls}
                >
                  ลบ
                </button>
              </>
            )}
          </div>
        }
      />

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}

      {!loading && !error && staff && !editing && (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-400">รหัสพนักงาน</p>
              <p className="text-sm text-slate-800">{staff.staff_code}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">สถานะ</p>
              <Badge tone={statusTone(staff.status)}>{staff.status}</Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">ชื่อ-สกุล</p>
              <p className="text-sm text-slate-800">
                {staff.pname}
                {staff.firstname} {staff.lastname}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">ตำแหน่งงาน</p>
              <p className="text-sm text-slate-800">
                {staffRoleLabel(staff.role)}
                {staff.doctor_code ? ` (${staff.doctor_code})` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">แผนก</p>
              <p className="text-sm text-slate-800">{staff.department ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">เพศ</p>
              <p className="text-sm text-slate-800">
                {staff.gender === 1 ? "ชาย" : staff.gender === 2 ? "หญิง" : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">เบอร์โทร</p>
              <p className="text-sm text-slate-800">{staff.phone_no ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">อีเมล</p>
              <p className="text-sm text-slate-800">{staff.email ?? "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-400">ที่อยู่</p>
              <p className="text-sm text-slate-800">{staff.address ?? "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-400">หมายเหตุ</p>
              <p className="text-sm text-slate-800">{staff.note ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">วันที่สร้าง</p>
              <p className="text-sm text-slate-800">
                {formatDateTime(staff.created_date)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">วันที่ลาออก</p>
              <p className="text-sm text-slate-800">
                {formatDateTime(staff.resign_date)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && staff && editing && (
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="คำนำหน้า">
              <input
                type="text"
                value={form.pname}
                onChange={(e) => update("pname", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="ชื่อ">
              <input
                type="text"
                value={form.firstname}
                onChange={(e) => update("firstname", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="นามสกุล">
              <input
                type="text"
                value={form.lastname}
                onChange={(e) => update("lastname", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="ตำแหน่งงาน">
              <select
                value={form.role}
                onChange={(e) =>
                  update("role", e.target.value as StaffRole | "")
                }
                className={selectCls}
              >
                <option value="">- ไม่เปลี่ยน -</option>
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="เพศ">
              <select
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
                className={selectCls}
              >
                <option value="">- ไม่เปลี่ยน -</option>
                <option value="1">ชาย</option>
                <option value="2">หญิง</option>
              </select>
            </Field>
            {form.role === "doctor" && (
              <Field
                label="รหัสแพทย์ (doctor_code)"
                hint="ใช้โยง/ย้ายลิงก์ไปหมอคนใหม่"
              >
                <input
                  type="text"
                  value={form.doctor_code}
                  onChange={(e) => update("doctor_code", e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}
            <Field label="แผนก">
              <input
                type="text"
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="เบอร์โทร">
              <input
                type="text"
                value={form.phone_no}
                onChange={(e) => update("phone_no", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="อีเมล">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="ที่อยู่">
            <textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>

          <Field label="หมายเหตุ">
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          {saveError && <ErrorBox message={saveError} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={btnSecondaryCls}
            >
              ยกเลิก
            </button>
            <button type="submit" disabled={saving} className={btnPrimaryCls}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      )}

      <Modal
        open={confirmDelete}
        title="ยืนยันการลบบุคลากร"
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      >
        <p className="mb-4 text-sm text-slate-600">
          ต้องการปิดการใช้งานบุคลากร {staff?.staff_code} ใช่หรือไม่?
          (ระบบจะตั้งสถานะเป็น inactive — เปิดกลับมาใช้งานได้ในภายหลัง)
        </p>
        {deleteError && (
          <div className="mb-4">
            <ErrorBox message={deleteError} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
            className={btnSecondaryCls}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={btnDangerCls}
          >
            {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}
