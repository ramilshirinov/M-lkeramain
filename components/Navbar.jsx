"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { languages } from "@/lib/i18n";
import ThemeToggle from "@/components/ThemeToggle";
import {
  FiHeart,
  FiUser,
  FiShield,
  FiPlusCircle,
  FiGlobe,
  FiMapPin,
  FiAward,
  FiMessageSquare,
} from "react-icons/fi";

export default function Navbar() {
  const { user, language, setLanguage, dict: rawDict } = useApp();
  const dict = rawDict || {};
  const [isOpenLang, setIsOpenLang] = useState(false);

  const linkClass = "text-navy dark:text-slate-200 hover:text-copper transition";

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 text-navy dark:text-slate-100 border-b border-navy/10 dark:border-slate-800 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo və mətnlər */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-icon.png"
              alt="MÜLKERA Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-xl font-bold tracking-wider font-heading leading-none flex items-center">
              <span className="text-navy dark:text-white">MÜLK</span>
              <span className="text-copper">ERA</span>
            </div>
            <span className="text-[9px] font-bold tracking-widest text-navy/80 dark:text-slate-300 uppercase mt-0.5">
              ƏMLAK SATIŞI AGENTLİYİ
            </span>
            <span className="text-[10px] text-navy/60 dark:text-slate-400 font-medium tracking-tight">
              Sizin eranız, sizin mülkünüz.
            </span>
          </div>
        </Link>

        {/* Naviqasiya */}
        <nav className="hidden md:flex items-center gap-6 font-medium text-sm">
          <Link href="/listings" className={linkClass}>
            {dict.nav?.listings || "Elanlar"}
          </Link>

          <Link href="/map" className={`flex items-center gap-1.5 ${linkClass}`}>
            <FiMapPin className="text-copper" /> Xəritə Axtarışı
          </Link>

          <Link href="/realtors" className={`flex items-center gap-1.5 ${linkClass}`}>
            <FiAward className="text-copper" /> Rieltorlar
          </Link>

          <Link href="/live" className={`flex items-center gap-1.5 ${linkClass}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-bold text-red-600 dark:text-red-400">Canlı PK</span>
          </Link>

          <Link href="/favorites" className={`flex items-center gap-1.5 ${linkClass}`}>
            <FiHeart className="text-copper" /> {dict.nav?.favorites || "Favoritlər"}
          </Link>

          <Link href="/messages" className={`flex items-center gap-1.5 ${linkClass}`}>
            <FiMessageSquare className="text-copper" /> Mesajlar
          </Link>

          {user && (
            <Link href="/profile" className={`${linkClass} font-semibold`}>
              Profil
            </Link>
          )}

          {(user?.role === "admin" || user?.user_metadata?.role === "admin" || user?.email?.includes("admin")) && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-copper font-semibold hover:text-gold-600 transition"
            >
              <FiShield /> {dict.nav?.admin || "Admin"}
            </Link>
          )}
        </nav>

        {/* Sağ tərəf: tema, dil, elan, giriş */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Gecə / Gündüz düyməsi */}
          <ThemeToggle />

          {/* Dil seçici */}
          <div className="relative">
            <button
              onClick={() => setIsOpenLang(!isOpenLang)}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-navy dark:text-slate-100 text-sm font-semibold transition"
            >
              <FiGlobe className="text-copper" />
              <span>{(language || "az").toUpperCase()}</span>
            </button>

            {isOpenLang && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpenLang(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      language === lang.code
                        ? "bg-navy text-white font-semibold dark:bg-copper"
                        : "text-navy dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/listings/add"
            className="hidden sm:flex items-center gap-2 rounded-xl bg-navy text-white hover:bg-copper py-2.5 px-4 text-sm font-semibold transition shadow-sm"
          >
            <FiPlusCircle /> {dict.nav?.addListing || "Elan Yerləşdir"}
          </Link>

          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-navy dark:text-slate-100 transition"
              title="Profil"
            >
              <FiUser className="text-copper text-lg" />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className={`text-sm font-semibold ${linkClass}`}>
                {dict.nav?.login || "Daxil ol"}
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gold-400 hover:bg-gold-500 text-navy py-2 px-4 text-sm font-semibold transition shadow-sm"
              >
                {dict.nav?.register || "Qeydiyyat"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}