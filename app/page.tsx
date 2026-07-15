"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/patients");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-slate-500">กำลังโหลด...</p>
    </div>
  );
}
