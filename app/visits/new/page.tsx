"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  ErrorBox,
  Field,
  PageHeader,
  SuccessBox,
  btnPrimaryCls,
  btnSecondaryCls,
  inputCls,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  AppointmentCreate,
  VisitRequestCreate,
  VisitRequestPayload,
  createAppointment,
  createVisitRequest,
} from "@/lib/api/visits";

type Mode = "request" | "appointment";

const EMPTY_REQUEST_ITEM: VisitRequestCreate = {
  cheif_complaint: "",
  doctor_code: "",
  note: "",
  type: "",
};

function RequestItemsEditor({
  items,
  onChange,
}: {
  items: VisitRequestCreate[];
  onChange: (items: VisitRequestCreate[]) => void;
}) {
  function updateItem(index: number, key: keyof VisitRequestCreate, value: string) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange(next);
  }

  function addItem() {
    onChange([...items, { ...EMPTY_REQUEST_ITEM }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="relative grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
        >
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="absolute right-2 top-2 text-xs font-medium text-red-500 hover:text-red-700"
            >
              ลบ
            </button>
          )}
          <Field label="อาการสำคัญ (Chief Complaint)">
            <input
              type="text"
              value={item.cheif_complaint ?? ""}
              onChange={(e) => updateItem(index, "cheif_complaint", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="รหัสแพทย์ (Doctor Code)">
            <input
              type="text"
              value={item.doctor_code ?? ""}
              onChange={(e) => updateItem(index, "doctor_code", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ประเภท (Type)">
            <input
              type="text"
              value={item.type ?? ""}
              onChange={(e) => updateItem(index, "type", e.target.value)}
              className={inputCls}
              placeholder="เช่น walk-in, follow-up"
            />
          </Field>
          <Field label="หมายเหตุ">
            <input
              type="text"
              value={item.note ?? ""}
              onChange={(e) => updateItem(index, "note", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      ))}
      <button type="button" onClick={addItem} className={btnSecondaryCls}>
        + เพิ่มคำร้อง
      </button>
    </div>
  );
}

function cleanItems(items: VisitRequestCreate[]): VisitRequestCreate[] {
  return items
    .map((item) => ({
      cheif_complaint: item.cheif_complaint || undefined,
      doctor_code: item.doctor_code || undefined,
      note: item.note || undefined,
      type: item.type || undefined,
    }))
    .filter(
      (item) =>
        item.cheif_complaint || item.doctor_code || item.note || item.type
    );
}

export default function NewVisitPage() {
  const [mode, setMode] = useState<Mode>("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdVn, setCreatedVn] = useState<string | null>(null);

  // Walk-in / visit request state
  const [requestVn, setRequestVn] = useState("");
  const [requestItems, setRequestItems] = useState<VisitRequestCreate[]>([
    { ...EMPTY_REQUEST_ITEM },
  ]);

  // Appointment state
  const [hn, setHn] = useState("");
  const [visitdate, setVisitdate] = useState("");
  const [appointmentdate, setAppointmentdate] = useState("");
  const [status, setStatus] = useState("pending");
  const [agentId, setAgentId] = useState("");
  const [nurseId, setNurseId] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [heartrate, setHeartrate] = useState("");
  const [bodyTemp, setBodyTemp] = useState("");
  const [note, setNote] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [includeInitialRequest, setIncludeInitialRequest] = useState(false);
  const [appointmentRequestItems, setAppointmentRequestItems] = useState<
    VisitRequestCreate[]
  >([{ ...EMPTY_REQUEST_ITEM }]);

  function resetAll() {
    setRequestVn("");
    setRequestItems([{ ...EMPTY_REQUEST_ITEM }]);
    setHn("");
    setVisitdate("");
    setAppointmentdate("");
    setStatus("pending");
    setAgentId("");
    setNurseId("");
    setHeight("");
    setWeight("");
    setBpSystolic("");
    setBpDiastolic("");
    setRespiratoryRate("");
    setHeartrate("");
    setBodyTemp("");
    setNote("");
    setCheckoutDate("");
    setIncludeInitialRequest(false);
    setAppointmentRequestItems([{ ...EMPTY_REQUEST_ITEM }]);
    setCreatedVn(null);
    setError(null);
  }

  async function handleSubmitRequest() {
    setError(null);
    const items = cleanItems(requestItems);
    if (items.length === 0) {
      setError("กรุณาระบุคำร้องอย่างน้อย 1 รายการ");
      return;
    }
    setLoading(true);
    try {
      const body: VisitRequestPayload = {
        vn: requestVn || undefined,
        request: items,
      };
      const res = await createVisitRequest(body);
      setCreatedVn(res.vn || requestVn || null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถสร้าง visit request ได้"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAppointment() {
    setError(null);
    if (!hn) {
      setError("กรุณาระบุ HN");
      return;
    }
    setLoading(true);
    try {
      const body: AppointmentCreate = {
        hn,
        visitdate: visitdate || undefined,
        status: status || undefined,
        appointmentdate: appointmentdate || undefined,
        agent_id: agentId || undefined,
        nurse_id: nurseId || undefined,
        height: height === "" ? undefined : Number(height),
        weight: weight === "" ? undefined : Number(weight),
        bp_systolic: bpSystolic === "" ? undefined : Number(bpSystolic),
        bp_diastolic: bpDiastolic === "" ? undefined : Number(bpDiastolic),
        respiratory_rate:
          respiratoryRate === "" ? undefined : Number(respiratoryRate),
        heartrate: heartrate === "" ? undefined : Number(heartrate),
        body_temp: bodyTemp === "" ? undefined : Number(bodyTemp),
        note: note || undefined,
        checkout_date: checkoutDate || undefined,
      };
      if (includeInitialRequest) {
        const items = cleanItems(appointmentRequestItems);
        if (items.length > 0) {
          body.request = { request: items };
        }
      }
      const res = await createAppointment(body);
      setCreatedVn(res.vn ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "ไม่สามารถสร้างนัดหมายได้"
      );
    } finally {
      setLoading(false);
    }
  }

  if (createdVn !== null) {
    return (
      <AppShell>
        <PageHeader title="สร้าง Visit / นัดหมาย" />
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <SuccessBox>สร้างรายการสำเร็จ</SuccessBox>
          {createdVn && (
            <p className="mt-4 mb-6 text-2xl font-bold text-teal-700">
              VN: {createdVn}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Link href="/visits" className={btnPrimaryCls}>
              ดูรายการ Visit
            </Link>
            <button onClick={resetAll} className={btnSecondaryCls}>
              สร้างรายการถัดไป
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="สร้าง Visit / นัดหมาย" />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setMode("request")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "request"
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Walk-in / Visit Request
        </button>
        <button
          type="button"
          onClick={() => setMode("appointment")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "appointment"
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          นัดหมายล่วงหน้า
        </button>
      </div>

      {mode === "request" && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              ข้อมูล Visit
            </h2>
            <Field
              label="VN"
              hint="เว้นว่างเพื่อสร้าง visit ใหม่ หรือระบุ VN เดิมเพื่อเพิ่มคำร้อง"
            >
              <input
                type="text"
                value={requestVn}
                onChange={(e) => setRequestVn(e.target.value)}
                className={inputCls}
              />
            </Field>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              รายการคำร้อง (Request)
            </h2>
            <RequestItemsEditor items={requestItems} onChange={setRequestItems} />
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmitRequest}
              disabled={loading}
              className={btnPrimaryCls}
            >
              {loading ? "กำลังบันทึก..." : "สร้าง Visit Request"}
            </button>
          </div>
        </div>
      )}

      {mode === "appointment" && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              ข้อมูลนัดหมาย
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="HN" required>
                <input
                  type="text"
                  value={hn}
                  onChange={(e) => setHn(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="วันนัดหมาย (Appointment Date)">
                <input
                  type="datetime-local"
                  value={appointmentdate}
                  onChange={(e) => setAppointmentdate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="วันที่ Visit (Visit Date)">
                <input
                  type="datetime-local"
                  value={visitdate}
                  onChange={(e) => setVisitdate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="สถานะ">
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Agent ID">
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Nurse ID">
                <input
                  type="text"
                  value={nurseId}
                  onChange={(e) => setNurseId(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              สัญญาณชีพ (Prescreening)
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="ส่วนสูง (ซม.)">
                <input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="น้ำหนัก (กก.)">
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ความดัน Systolic">
                <input
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ความดัน Diastolic">
                <input
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="อัตราการหายใจ">
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="อัตราการเต้นหัวใจ">
                <input
                  type="number"
                  value={heartrate}
                  onChange={(e) => setHeartrate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="อุณหภูมิร่างกาย (°C)">
                <input
                  type="number"
                  step="0.1"
                  value={bodyTemp}
                  onChange={(e) => setBodyTemp(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              อื่นๆ
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="หมายเหตุ">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="วันเช็คเอาท์ (Checkout Date)">
                <input
                  type="datetime-local"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section>
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={includeInitialRequest}
                onChange={(e) => setIncludeInitialRequest(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              เพิ่มคำร้องเบื้องต้น (Request) พร้อมนัดหมาย
            </label>
            {includeInitialRequest && (
              <RequestItemsEditor
                items={appointmentRequestItems}
                onChange={setAppointmentRequestItems}
              />
            )}
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmitAppointment}
              disabled={loading}
              className={btnPrimaryCls}
            >
              {loading ? "กำลังบันทึก..." : "สร้างนัดหมาย"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
