"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration uyğunsuzluğunun qarşısını almaq üçün yalnız mount-dan sonra göstəririk
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Gündüz rejiminə keç" : "Gecə rejiminə keç"}
      title={isDark ? "Gündüz rejimi" : "Gecə rejimi"}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-navy dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700"
    >
      {mounted ? (
        isDark ? (
          <FiSun className="text-lg text-amber-400" />
        ) : (
          <FiMoon className="text-lg text-copper" />
        )
      ) : (
        <span className="block h-[18px] w-[18px]" />
      )}
    </button>
  );
}