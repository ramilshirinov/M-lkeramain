"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  FiHome,
  FiSearch,
  FiPlusCircle,
  FiHeart,
  FiMessageSquare,
  FiUser,
} from "react-icons/fi";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, dict: rawDict } = useApp();
  const dict = rawDict || {};

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { href: "/", label: dict.nav?.home || "Əsas", icon: FiHome },
    { href: "/listings", label: dict.nav?.listings || "Elanlar", icon: FiSearch },
    {
      href: "/listings/add",
      label: dict.nav?.addListing || "Əlavə et",
      icon: FiPlusCircle,
      highlight: true,
    },
    { href: "/favorites", label: dict.nav?.favorites || "Sevimlilər", icon: FiHeart },
    {
      href: user ? "/profile" : "/login",
      label: user ? (dict.nav?.profile || "Profil") : (dict.nav?.login || "Giriş"),
      icon: FiUser,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-navy/10 dark:border-slate-800 shadow-lg safe-bottom">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-navy dark:bg-copper text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Icon className="text-xl" />
                </div>
                <span className="text-[10px] font-bold text-navy dark:text-slate-200 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? "text-copper dark:text-copper font-bold"
                  : "text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`text-lg ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[60px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
