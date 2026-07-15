"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import AllergyTab from "./AllergyTab";
import UnderlyingTab from "./UnderlyingTab";
import HealthInfoTab from "./HealthInfoTab";
import SummaryTab from "./SummaryTab";

type TabKey = "allergy" | "underlying" | "health" | "summary";

const TABS: { key: TabKey; label: string }[] = [
  { key: "allergy", label: "แพ้ยา/แพ้อาหาร" },
  { key: "underlying", label: "โรคประจำตัว" },
  { key: "health", label: "ข้อมูลสุขภาพ" },
  { key: "summary", label: "สรุปเวชระเบียน" },
];

export default function MedicalInfoPage() {
  const [tab, setTab] = useState<TabKey>("allergy");

  return (
    <AppShell>
      <PageHeader
        title="ข้อมูลสุขภาพ / แพ้ยา / โรคประจำตัว"
        subtitle="ประวัติแพ้ยา แพ้อาหาร โรคประจำตัว และข้อมูลสุขภาพพื้นฐานของผู้ป่วย"
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-teal-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "allergy" && <AllergyTab />}
      {tab === "underlying" && <UnderlyingTab />}
      {tab === "health" && <HealthInfoTab />}
      {tab === "summary" && <SummaryTab />}
    </AppShell>
  );
}
