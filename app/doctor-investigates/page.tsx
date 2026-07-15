"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
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
  btnPrimaryCls,
  btnSecondaryCls,
  formatDateTime,
  inputCls,
} from "@/components/ui";
import {
  ApiError,
  DoctorInvestigate,
  DoctorInvestigatesByHnResponse,
  DoctorInvestigatesByVnResponse,
  ListDoctorInvestigatesParams,
  getDoctorInvestigatesByHn,
  getDoctorInvestigatesByVn,
  listDoctorInvestigates,
} from "@/lib/api/doctors";

type SortBy = "created_date" | "updated_date" | "encounter_id" | "investigate_id";

const emptyFilters: ListDoctorInvestigatesParams = {
  sort_by: "created_date",
  sort_order: "desc",
};

function truncate(value: string | null, length = 60): string {
  if (!value) return "-";
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

export default function DoctorInvestigatesPage() {
  const [rows, setRows] = useState<DoctorInvestigate[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ListDoctorInvestigatesParams>(
    emptyFilters
  );

  const [encounterId, setEncounterId] = useState("");
  const [vn, setVn] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detail, setDetail] = useState<DoctorInvestigate | null>(null);

  // quick lookup by HN
  const [hnQuery, setHnQuery] = useState("");
  const [hnLoading, setHnLoading] = useState(false);
  const [hnError, setHnError] = useState<string | null>(null);
  const [hnResult, setHnResult] = useState<DoctorInvestigatesByHnResponse | null>(
    null
  );

  // quick lookup by VN
  const [vnQuery, setVnQuery] = useState("");
  const [vnLoading, setVnLoading] = useState(false);
  const [vnError, setVnError] = useState<string | null>(null);
  const [vnResult, setVnResult] = useState<DoctorInvestigatesByVnResponse | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDoctorInvestigates(filters);
      setRows(res.data);
      setTotalFound(res.total_found);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถโหลดผลตรวจได้"
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
      encounter_id: encounterId ? Number(encounterId) : undefined,
      vn: vn || undefined,
      created_by: createdBy || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
  }

  function handleClear() {
    setEncounterId("");
    setVn("");
    setCreatedBy("");
    setDateFrom("");
    setDateTo("");
    setFilters(emptyFilters);
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      filters.sort_by === column && filters.sort_order === "asc"
        ? "desc"
        : "asc";
    setFilters({ ...filters, sort_by: column, sort_order: nextOrder });
  }

  async function handleLookupHn() {
    if (!hnQuery) return;
    setHnLoading(true);
    setHnError(null);
    setHnResult(null);
    try {
      const res = await getDoctorInvestigatesByHn(hnQuery);
      setHnResult(res);
    } catch (err) {
      setHnError(
        err instanceof ApiError ? err.message : "ไม่พบข้อมูลผลตรวจของ HN นี้"
      );
    } finally {
      setHnLoading(false);
    }
  }

  async function handleLookupVn() {
    if (!vnQuery) return;
    setVnLoading(true);
    setVnError(null);
    setVnResult(null);
    try {
      const res = await getDoctorInvestigatesByVn(vnQuery);
      setVnResult(res);
    } catch (err) {
      setVnError(
        err instanceof ApiError ? err.message : "ไม่พบข้อมูลผลตรวจของ VN นี้"
      );
    } finally {
      setVnLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="ผลตรวจแพทย์ (SOAP Note)"
        subtitle="ค้นหา SOAP Note ตาม encounter/visit หรือบันทึกผลตรวจใหม่"
        actions={
          <Link href="/doctor-investigates/new" className={btnPrimaryCls}>
            + บันทึกผลตรวจ
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            ค้นหาผลตรวจตาม HN
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="HN"
              value={hnQuery}
              onChange={(e) => setHnQuery(e.target.value)}
              className={inputCls}
            />
            <button onClick={handleLookupHn} className={btnPrimaryCls}>
              ค้นหา
            </button>
          </div>

          {hnLoading && <LoadingBox />}
          {!hnLoading && hnError && <ErrorBox message={hnError} />}
          {!hnLoading && !hnError && hnResult && (
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {hnResult.data.length === 0 && <EmptyBox text="ไม่พบ visit ของผู้ป่วยรายนี้" />}
              {hnResult.data.map((visit, vIdx) => (
                <div key={visit.vn ?? vIdx} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    VN: {String(visit.vn ?? "-")}
                  </p>
                  {visit.encounters.length === 0 && (
                    <p className="text-xs text-slate-400">ไม่มี encounter</p>
                  )}
                  {visit.encounters.map((enc, eIdx) => (
                    <div key={enc.encounter_id ?? eIdx} className="mb-2 ml-3 border-l border-slate-200 pl-3">
                      <p className="text-xs font-medium text-slate-500">
                        Encounter ID: {String(enc.encounter_id ?? "-")}
                      </p>
                      {enc.investigates.length === 0 ? (
                        <p className="text-xs text-slate-400">ยังไม่มี SOAP Note</p>
                      ) : (
                        enc.investigates.map((inv) => (
                          <button
                            key={inv.investigate_id}
                            onClick={() => setDetail(inv)}
                            className="mt-1 block w-full rounded-md px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-50"
                          >
                            #{inv.investigate_id} — {truncate(inv.assessment, 40)}
                          </button>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            ค้นหาผลตรวจตาม VN
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="VN"
              value={vnQuery}
              onChange={(e) => setVnQuery(e.target.value)}
              className={inputCls}
            />
            <button onClick={handleLookupVn} className={btnPrimaryCls}>
              ค้นหา
            </button>
          </div>

          {vnLoading && <LoadingBox />}
          {!vnLoading && vnError && <ErrorBox message={vnError} />}
          {!vnLoading && !vnError && vnResult && (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {vnResult.hn && (
                <p className="text-xs text-slate-500">HN: {vnResult.hn}</p>
              )}
              {vnResult.data.encounters.length === 0 && (
                <EmptyBox text="ไม่มี encounter สำหรับ visit นี้" />
              )}
              {vnResult.data.encounters.map((enc, eIdx) => (
                <div key={enc.encounter_id ?? eIdx} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-1 text-xs font-medium text-slate-500">
                    Encounter ID: {String(enc.encounter_id ?? "-")}
                  </p>
                  {enc.investigates.length === 0 ? (
                    <p className="text-xs text-slate-400">ยังไม่มี SOAP Note</p>
                  ) : (
                    enc.investigates.map((inv) => (
                      <button
                        key={inv.investigate_id}
                        onClick={() => setDetail(inv)}
                        className="mt-1 block w-full rounded-md px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-50"
                      >
                        #{inv.investigate_id} — {truncate(inv.assessment, 40)}
                      </button>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Encounter ID">
            <input
              type="number"
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="VN">
            <input
              type="text"
              value={vn}
              onChange={(e) => setVn(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="บันทึกโดย (doctor_code)">
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="วันที่บันทึกตั้งแต่">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="วันที่บันทึกถึง">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex items-end gap-2 sm:col-span-4">
            <button onClick={handleSearch} className={btnPrimaryCls}>
              ค้นหา
            </button>
            <button onClick={handleClear} className={btnSecondaryCls}>
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
                onClick={() => handleSort("investigate_id")}
                active={filters.sort_by === "investigate_id"}
                dir={filters.sort_order}
              >
                Investigate ID
              </Th>
              <Th
                onClick={() => handleSort("encounter_id")}
                active={filters.sort_by === "encounter_id"}
                dir={filters.sort_order}
              >
                Encounter ID
              </Th>
              <Th>VN</Th>
              <Th>บันทึกโดย</Th>
              <Th>Assessment</Th>
              <Th
                onClick={() => handleSort("created_date")}
                active={filters.sort_by === "created_date"}
                dir={filters.sort_order}
              >
                วันที่บันทึก
              </Th>
              <Th>รายละเอียด</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  ไม่พบข้อมูลผลตรวจ
                </td>
              </tr>
            )}
            {rows.map((inv) => (
              <tr key={inv.investigate_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">
                  {inv.investigate_id}
                </Td>
                <Td>{inv.encounter_id}</Td>
                <Td>{inv.vn ?? "-"}</Td>
                <Td>{inv.created_by ?? inv.doctor_code ?? "-"}</Td>
                <Td className="max-w-xs truncate whitespace-normal">
                  {truncate(inv.assessment)}
                </Td>
                <Td>{formatDateTime(inv.created_date)}</Td>
                <Td>
                  <button
                    onClick={() => setDetail(inv)}
                    className={btnSecondaryCls}
                  >
                    ดู
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={detail !== null}
        title={`SOAP Note #${detail?.investigate_id ?? ""}`}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <p>Encounter ID: {detail.encounter_id}</p>
              <p>VN: {detail.vn ?? "-"}</p>
              <p>บันทึกโดย: {detail.created_by ?? detail.doctor_code ?? "-"}</p>
              <p>วันที่บันทึก: {formatDateTime(detail.created_date)}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-600">S — Subjective</p>
              <p className="whitespace-pre-wrap text-slate-700">{detail.subjective ?? "-"}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-600">O — Objective</p>
              <p className="whitespace-pre-wrap text-slate-700">{detail.objective ?? "-"}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-600">A — Assessment</p>
              <p className="whitespace-pre-wrap text-slate-700">{detail.assessment ?? "-"}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-600">P — Plan</p>
              <p className="whitespace-pre-wrap text-slate-700">{detail.plan ?? "-"}</p>
            </div>
            {detail.note && (
              <div>
                <p className="mb-1 font-semibold text-slate-600">หมายเหตุ</p>
                <p className="whitespace-pre-wrap text-slate-700">{detail.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
