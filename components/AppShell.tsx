"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearSession, User } from "@/lib/api";

interface NavGroup {
  label: string;
  links: { href: string; label: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "ผู้ป่วย",
    links: [
      { href: "/patients", label: "รายชื่อผู้ป่วย" },
      { href: "/patients/new", label: "ลงทะเบียนผู้ป่วย" },
      { href: "/medical-info", label: "ข้อมูลสุขภาพ / แพ้ยา" },
      { href: "/patient-inventory", label: "คลังของผู้ป่วย" },
    ],
  },
  {
    label: "การรับบริการ",
    links: [
      { href: "/visits", label: "Visit / นัดหมาย" },
      { href: "/encounters", label: "Encounter" },
      { href: "/medications", label: "สั่งยา (Medication)" },
      { href: "/doctor-investigates", label: "ผลตรวจ (Investigate)" },
      { href: "/orders", label: "Order / ใบแจ้งหนี้" },
    ],
  },
  {
    label: "แพทย์และบุคลากร",
    links: [
      { href: "/doctors", label: "แพทย์" },
      { href: "/df", label: "ค่าธรรมเนียมแพทย์ (DF)" },
      { href: "/staff", label: "บุคลากร" },
      { href: "/users", label: "ผู้ใช้งานระบบ" },
    ],
  },
  {
    label: "สินค้าและคลัง",
    links: [
      { href: "/products", label: "สินค้า" },
      { href: "/drugs", label: "ยา / หมวดยา" },
      { href: "/inventory", label: "คลังกลาง" },
      { href: "/unit-inventory", label: "คลังหน่วยงาน" },
    ],
  },
  {
    label: "อื่น ๆ",
    links: [
      { href: "/clinical-tools", label: "เครื่องมือคลินิก" },
      { href: "/tool-usage", label: "ประวัติใช้เครื่องมือ" },
      { href: "/courses", label: "คอร์ส" },
    ],
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const raw = window.localStorage.getItem("his_user");
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
    setChecked(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  if (!checked) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  const displayName = user
    ? `${user.pname ?? ""}${user.firstname ?? ""} ${user.lastname ?? ""}`.trim()
    : "";

  function isActive(href: string): boolean {
    if (href === "/patients") return pathname === "/patients" || pathname.startsWith("/patients/") && pathname !== "/patients/new";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <Link href="/patients" className="text-lg font-semibold text-teal-700">
            SuperHIS
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? "bg-teal-50 text-teal-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-teal-700"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-4 py-3">
          {displayName && (
            <p className="mb-2 truncate text-sm text-slate-600" title={displayName}>
              {displayName}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-slate-50 px-6 py-6">{children}</main>
    </div>
  );
}
