"use client";

import { useCallback, useEffect, useState } from "react";
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
  Td,
  Th,
  TableShell,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDate,
  formatGender,
  formatMoney,
  inputCls,
  selectCls,
} from "@/components/ui";
import {
  ApiError,
  Doctor,
  ListDoctorsParams,
  listDoctors,
  updateDfCap,
} from "@/lib/api/doctors";

type SortBy =
  | "created_date"
  | "df_cap"
  | "doctor_code"
  | "firstname"
  | "lastname"
  | "ward"
  | "is_active";

const emptyFilters: ListDoctorsParams = {
  sort_by: "created_date",
  sort_order: "desc",
};

export default function DoctorsPage() {
  const [rows, setRows] = useState<Doctor[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ListDoctorsParams>(emptyFilters);

  // draft inputs, only applied to `filters` on ค้นหา
  const [doctorCode, setDoctorCode] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [ward, setWard] = useState("");
  const [gender, setGender] = useState("");
  const [isActive, setIsActive] = useState("");
  const [phoneNo, setPhoneNo] = useState("");

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [dfCapInput, setDfCapInput] = useState("");
  const [dfCapUnlimited, setDfCapUnlimited] = useState(false);
  const [dfCapSaving, setDfCapSaving] = useState(false);
  const [dfCapError, setDfCapError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDoctors(filters);
      setRows(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลแพทย์ได้"
      );
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
      doctor_code: doctorCode || undefined,
      firstname: firstname || undefined,
      lastname: lastname || undefined,
      ward: ward || undefined,
      gender: gender ? Number(gender) : undefined,
      is_active: isActive === "" ? undefined : isActive === "true",
      phone_no: phoneNo || undefined,
    });
  }

  function handleClear() {
    setDoctorCode("");
    setFirstname("");
    setLastname("");
    setWard("");
    setGender("");
    setIsActive("");
    setPhoneNo("");
    setFilters(emptyFilters);
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      filters.sort_by === column && filters.sort_order === "asc"
        ? "desc"
        : "asc";
    setFilters({ ...filters, sort_by: column, sort_order: nextOrder });
  }

  function openDfCapModal(doctor: Doctor) {
    setEditingDoctor(doctor);
    setDfCapUnlimited(doctor.df_cap === null || doctor.df_cap === undefined);
    setDfCapInput(doctor.df_cap != null ? String(doctor.df_cap) : "");
    setDfCapError(null);
  }

  function closeDfCapModal() {
    setEditingDoctor(null);
    setDfCapError(null);
  }

  async function handleSaveDfCap() {
    if (!editingDoctor) return;
    setDfCapSaving(true);
    setDfCapError(null);
    try {
      await updateDfCap({
        doctor_code: editingDoctor.doctor_code,
        df_cap: dfCapUnlimited
          ? null
          : dfCapInput === ""
          ? null
          : Number(dfCapInput),
      });
      closeDfCapModal();
      await load();
    } catch (err) {
      setDfCapError(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกเพดาน DF ได้"
      );
    } finally {
      setDfCapSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="รายชื่อแพทย์"
        subtitle="ค้นหาและจัดการข้อมูลแพทย์ในระบบ"
        actions={
          <Link href="/doctors/new" className={btnPrimaryCls}>
            + ลงทะเบียนแพทย์
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="รหัสแพทย์">
            <input
              type="text"
              value={doctorCode}
              onChange={(e) => setDoctorCode(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ชื่อ">
            <input
              type="text"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="นามสกุล">
            <input
              type="text"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="แผนก/หอผู้ป่วย">
            <input
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="เพศ">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={selectCls}
            >
              <option value="">ทั้งหมด</option>
              <option value="1">ชาย</option>
              <option value="2">หญิง</option>
            </select>
          </Field>
          <Field label="สถานะการทำงาน">
            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value)}
              className={selectCls}
            >
              <option value="">ทั้งหมด</option>
              <option value="true">ปฏิบัติงาน</option>
              <option value="false">พ้นสภาพ</option>
            </select>
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <input
              type="text"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              className={inputCls}
            />
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

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading && <LoadingBox />}
      {!loading && error && <ErrorBox message={error} />}

      {!loading && !error && (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <Th
                onClick={() => handleSort("doctor_code")}
                active={filters.sort_by === "doctor_code"}
                dir={filters.sort_order}
              >
                รหัสแพทย์
              </Th>
              <Th
                onClick={() => handleSort("firstname")}
                active={filters.sort_by === "firstname"}
                dir={filters.sort_order}
              >
                ชื่อ-สกุล
              </Th>
              <Th>เพศ</Th>
              <Th
                onClick={() => handleSort("ward")}
                active={filters.sort_by === "ward"}
                dir={filters.sort_order}
              >
                แผนก/หอผู้ป่วย
              </Th>
              <Th>เบอร์โทร</Th>
              <Th
                onClick={() => handleSort("df_cap")}
                active={filters.sort_by === "df_cap"}
                dir={filters.sort_order}
              >
                เพดาน DF
              </Th>
              <Th
                onClick={() => handleSort("is_active")}
                active={filters.sort_by === "is_active"}
                dir={filters.sort_order}
              >
                สถานะ
              </Th>
              <Th
                onClick={() => handleSort("created_date")}
                active={filters.sort_by === "created_date"}
                dir={filters.sort_order}
              >
                วันที่สร้าง
              </Th>
              <Th>การจัดการ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                  ไม่พบข้อมูลแพทย์
                </td>
              </tr>
            )}
            {rows.map((doctor) => (
              <tr key={doctor.doctor_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">
                  {doctor.doctor_code}
                </Td>
                <Td>
                  {doctor.pname}
                  {doctor.firstname} {doctor.lastname}
                </Td>
                <Td>{formatGender(doctor.gender)}</Td>
                <Td>{doctor.ward ?? "-"}</Td>
                <Td>{doctor.phone_no ?? "-"}</Td>
                <Td>{formatMoney(doctor.df_cap)}</Td>
                <Td>
                  <Badge tone={doctor.is_active ? "green" : "red"}>
                    {doctor.is_active ? "ปฏิบัติงาน" : "พ้นสภาพ"}
                  </Badge>
                </Td>
                <Td>{formatDate(doctor.created_date)}</Td>
                <Td>
                  <button
                    onClick={() => openDfCapModal(doctor)}
                    className={btnSecondaryCls}
                  >
                    แก้ไข DF Cap
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={editingDoctor !== null}
        title={`แก้ไขเพดาน DF — ${editingDoctor?.doctor_code ?? ""}`}
        onClose={closeDfCapModal}
      >
        {editingDoctor && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {editingDoctor.pname}
              {editingDoctor.firstname} {editingDoctor.lastname}
            </p>
            <Field
              label="เพดาน DF ต่อรายการ (บาท)"
              hint="ไม่จำกัด = ใช้กันคีย์เลขผิดตอนบันทึก DF"
            >
              <input
                type="number"
                min={0}
                step="0.01"
                value={dfCapInput}
                disabled={dfCapUnlimited}
                onChange={(e) => setDfCapInput(e.target.value)}
                className={inputCls}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dfCapUnlimited}
                onChange={(e) => setDfCapUnlimited(e.target.checked)}
              />
              ไม่จำกัดเพดาน DF
            </label>

            {dfCapError && <ErrorBox message={dfCapError} />}

            <div className="flex justify-end gap-2">
              <button onClick={closeDfCapModal} className={btnSecondaryCls}>
                ยกเลิก
              </button>
              <button
                onClick={handleSaveDfCap}
                disabled={dfCapSaving}
                className={btnPrimaryCls}
              >
                {dfCapSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
