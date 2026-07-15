"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Badge,
  ErrorBox,
  EmptyBox,
  Field,
  LoadingBox,
  PageHeader,
  Td,
  Th,
  TableShell,
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
  listStaff,
  staffRoleLabel,
} from "@/lib/api/staff";

type SortBy =
  | "staff_code"
  | "firstname"
  | "lastname"
  | "role"
  | "department"
  | "status"
  | "created_date";

const emptyFilters = {
  staff_code: "",
  firstname: "",
  lastname: "",
  role: "" as StaffRole | "",
  department: "",
  phone_no: "",
  includeInactive: false,
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("created_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const load = useCallback(
    async (
      f: typeof emptyFilters,
      sBy: SortBy,
      sOrder: "asc" | "desc"
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listStaff({
          staff_code: f.staff_code || undefined,
          firstname: f.firstname || undefined,
          lastname: f.lastname || undefined,
          role: f.role || undefined,
          department: f.department || undefined,
          phone_no: f.phone_no || undefined,
          include_inactive: f.includeInactive || undefined,
          sort_by: sBy,
          sort_order: sOrder,
        });
        setStaff(res.data);
        setTotalFound(res.total_found);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลบุคลากรได้"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(emptyFilters, "created_date", "desc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    void load(filters, sortBy, sortOrder);
  }

  function handleClear() {
    setFilters(emptyFilters);
    setSortBy("created_date");
    setSortOrder("desc");
    void load(emptyFilters, "created_date", "desc");
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(nextOrder);
    void load(filters, column, nextOrder);
  }

  return (
    <AppShell>
      <PageHeader
        title="บุคลากร"
        subtitle="รายชื่อพนักงาน/บุคลากรของคลินิก"
        actions={
          <Link href="/staff/new" className={btnPrimaryCls}>
            เพิ่มบุคลากร
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="รหัสพนักงาน">
            <input
              type="text"
              value={filters.staff_code}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, staff_code: e.target.value }))
              }
              className={inputCls}
              placeholder="ST-0001"
            />
          </Field>
          <Field label="ชื่อ">
            <input
              type="text"
              value={filters.firstname}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, firstname: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="นามสกุล">
            <input
              type="text"
              value={filters.lastname}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, lastname: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="ตำแหน่ง">
            <select
              value={filters.role}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  role: e.target.value as StaffRole | "",
                }))
              }
              className={selectCls}
            >
              <option value="">- ทั้งหมด -</option>
              {STAFF_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="แผนก">
            <input
              type="text"
              value={filters.department}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, department: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <input
              type="text"
              value={filters.phone_no}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, phone_no: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={filters.includeInactive}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  includeInactive: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            รวมที่ปิดการใช้งาน
          </label>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} className={`flex-1 ${btnPrimaryCls}`}>
              ค้นหา
            </button>
            <button onClick={handleClear} className={`flex-1 ${btnSecondaryCls}`}>
              ล้าง
            </button>
          </div>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <ErrorBox message={error} />
      ) : staff.length === 0 ? (
        <EmptyBox text="ไม่พบข้อมูลบุคลากร" />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th
                onClick={() => handleSort("staff_code")}
                active={sortBy === "staff_code"}
                dir={sortOrder}
              >
                รหัสพนักงาน
              </Th>
              <Th
                onClick={() => handleSort("firstname")}
                active={sortBy === "firstname"}
                dir={sortOrder}
              >
                ชื่อ-สกุล
              </Th>
              <Th
                onClick={() => handleSort("role")}
                active={sortBy === "role"}
                dir={sortOrder}
              >
                ตำแหน่ง
              </Th>
              <Th
                onClick={() => handleSort("department")}
                active={sortBy === "department"}
                dir={sortOrder}
              >
                แผนก
              </Th>
              <Th>เบอร์โทร</Th>
              <Th
                onClick={() => handleSort("status")}
                active={sortBy === "status"}
                dir={sortOrder}
              >
                สถานะ
              </Th>
              <Th
                onClick={() => handleSort("created_date")}
                active={sortBy === "created_date"}
                dir={sortOrder}
              >
                วันที่สร้าง
              </Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.staff_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{s.staff_code}</Td>
                <Td>
                  {s.pname}
                  {s.firstname} {s.lastname}
                </Td>
                <Td>
                  {staffRoleLabel(s.role)}
                  {s.doctor_code ? (
                    <span className="ml-1 text-xs text-slate-400">
                      ({s.doctor_code})
                    </span>
                  ) : null}
                </Td>
                <Td>{s.department ?? "-"}</Td>
                <Td>{s.phone_no ?? "-"}</Td>
                <Td>
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                </Td>
                <Td className="text-slate-500">
                  {formatDateTime(s.created_date)}
                </Td>
                <Td>
                  <Link
                    href={`/staff/${s.staff_id}`}
                    className="font-medium text-teal-600 hover:text-teal-700"
                  >
                    ดู
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </AppShell>
  );
}
