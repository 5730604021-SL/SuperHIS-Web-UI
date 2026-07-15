"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import { listPatients, ListPatientsParams, Patient } from "@/lib/api/patients";
import {
  PageHeader,
  Card,
  Badge,
  statusTone,
  ErrorBox,
  LoadingBox,
  EmptyBox,
  TableShell,
  Th,
  Td,
  inputCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDate,
  formatDateTime,
  formatGender,
} from "@/components/ui";

type SortBy = "hn" | "firstname" | "birthdate" | "createddate";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hn, setHn] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");

  const [sortBy, setSortBy] = useState<SortBy>("createddate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchPatients = useCallback(async (params: ListPatientsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPatients(params);
      setPatients(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลผู้ป่วยได้"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPatients({ sort_by: sortBy, sort_order: sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    fetchPatients({
      hn: hn || undefined,
      firstname: firstname || undefined,
      lastname: lastname || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
  }

  function handleClear() {
    setHn("");
    setFirstname("");
    setLastname("");
    fetchPatients({ sort_by: sortBy, sort_order: sortOrder });
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(nextOrder);
    fetchPatients({
      hn: hn || undefined,
      firstname: firstname || undefined,
      lastname: lastname || undefined,
      sort_by: column,
      sort_order: nextOrder,
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="รายชื่อผู้ป่วยทั้งหมด"
        actions={
          <Link href="/patients/new" className={btnPrimaryCls}>
            ลงทะเบียนผู้ป่วยใหม่
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="HN"
            value={hn}
            onChange={(e) => setHn(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="ชื่อ"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="นามสกุล"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            className={inputCls}
          />
          <div className="flex gap-2">
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
      {!loading && !error && patients.length === 0 && (
        <EmptyBox text="ไม่พบข้อมูลผู้ป่วย" />
      )}

      {!loading && !error && patients.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th
                onClick={() => handleSort("hn")}
                active={sortBy === "hn"}
                dir={sortOrder}
              >
                HN
              </Th>
              <Th
                onClick={() => handleSort("firstname")}
                active={sortBy === "firstname"}
                dir={sortOrder}
              >
                ชื่อ-สกุล
              </Th>
              <Th>เพศ</Th>
              <Th
                onClick={() => handleSort("birthdate")}
                active={sortBy === "birthdate"}
                dir={sortOrder}
              >
                วันเกิด
              </Th>
              <Th>เบอร์โทร</Th>
              <Th>จังหวัด</Th>
              <Th>สถานะ</Th>
              <Th
                onClick={() => handleSort("createddate")}
                active={sortBy === "createddate"}
                dir={sortOrder}
              >
                วันที่สร้าง
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((p) => (
              <tr key={p.hn} className="hover:bg-slate-50">
                <Td className="font-medium">
                  <Link
                    href={`/patients/${encodeURIComponent(p.hn)}`}
                    className="text-teal-700 hover:underline"
                  >
                    {p.hn}
                  </Link>
                </Td>
                <Td>
                  {p.pname}
                  {p.firstname} {p.lastname}
                </Td>
                <Td>{formatGender(p.gender)}</Td>
                <Td>{formatDate(p.birthdate)}</Td>
                <Td>{p.phone_no ?? "-"}</Td>
                <Td>{p.province ?? "-"}</Td>
                <Td>
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </Td>
                <Td className="text-slate-500">
                  {formatDateTime(p.createddate)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </AppShell>
  );
}
