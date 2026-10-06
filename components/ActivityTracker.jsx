"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function ActivityTracker() {
  const pathname = usePathname();
  const { user } = useApp();
  const lastPath = useRef(null);

  useEffect(() => {
    // Admin səhifələrinin daxili naviqasiyasını ziyarətçi jurnalına qatmaq vacib deyil
    if (!pathname || pathname.startsWith("/admin")) return;

    // Eyni səhifənin ardıcıl olaraq iki dəfə lazımsız qeyd edilməsinin qarşısını alırıq
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    try {
      fetch("/api/admin/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PAGE_VISIT",
          userId: user?.id || null,
          userEmail: user?.email || "qonaq@ziyaretci",
          userName: user?.full_name || user?.name || "Qonaq Ziyarətçi",
          role: user?.role || "guest",
          details: `Səhifə baxışı: ${pathname}`,
        }),
      }).catch(() => null);
    } catch {
      // Səssiz keçir
    }
  }, [pathname, user]);

  return null;
}
