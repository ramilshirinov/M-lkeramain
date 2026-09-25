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
  FiCpu,
  FiZap,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";

export default function Navbar() {
  const { user, language, setLanguage, dict: rawDict } = useApp();
  const dict = rawDict || {};
  const [isOpenLang, setIsOpenLang] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [notified, setNotified] = useState(false);

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

          {/* AI Rieltor (Coming Soon) Menyusu */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 font-semibold text-sm hover:bg-orange-100 transition shadow-sm"
            >
              <FiCpu className="text-orange-500 animate-pulse text-sm" />
              <span>AI Rieltor</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-xs">
                Tezliklə
              </span>
            </button>

            {/* Hover Tooltip İzahı */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-72 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 text-left pointer-events-none transition-all">
              <div className="text-xs font-bold text-navy dark:text-white flex items-center gap-1.5 mb-1">
                <FiZap className="text-orange-500" /> Söhbət ilə Axtarış
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Süni intellektlə danışaraq istədiyiniz ölçüdə, qiymətdə və ərazidə mülkü saniyələr içində tapın.
              </p>
              <div className="mt-1.5 text-[10px] text-orange-600 font-bold uppercase tracking-wider">
                Ətraflı məlumat üçün klikləyin ✦
              </div>
            </div>
          </div>

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

      {/* AI Rieltor Coming Soon Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-navy dark:text-slate-100">
            {/* Dekorativ Qradiyent İşıq */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-copper/15 rounded-full blur-3xl pointer-events-none" />

            {/* Bağlamaq Düyməsi */}
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-navy dark:hover:text-white transition"
              title="Bağla"
            >
              <FiX className="text-lg" />
            </button>

            {/* Nişan və Başlıq */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider">
                <FiZap className="text-orange-500" /> Tezliklə · Coming Soon
              </span>
            </div>

            <h3 className="text-2xl font-black font-heading tracking-tight mb-2 text-navy dark:text-white">
              AI Rieltor — Söhbət ilə Axtarış
            </h3>

            {/* Əsas İzah Cümləsi */}
            <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 mb-5">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200 leading-relaxed">
                “Süni intellektlə danışaraq istədiyiniz ölçüdə, qiymətdə və ərazidə mülkü saniyələr içində tapın.”
              </p>
            </div>

            {/* Gələcək İmkanlar Siyahısı */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FiCpu className="text-base" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy dark:text-white">
                    Təbii Dialoq və Səsli Sorğu
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Filtr axtarmadan, sadəcə <em>&quot;Sumqayıt Bulvarı yaxınlığında büdcəmə uyğun dəniz mənzərəli 3 otaqlı mənzil tap&quot;</em> deyin.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-copper/10 text-copper flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheckCircle className="text-base" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy dark:text-white">
                    Canlı Bazar Qiymət Təhlili
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Həqiqi bazar qiymətlərini və investisiya gəlirliliyini (ROI) avtomatik hesablayaraq ən sərfəli elanları seçir.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FiAward className="text-base" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy dark:text-white">
                    TOP Rieltorlarla Dərhal Əlaqə
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Bölgə üzrə lisenziyalı və ən yüksək reytinqli peşəkar rieltorla dərhal WhatsApp və ya birbaşa zəng yaradır.
                  </p>
                </div>
              </div>
            </div>

            {/* Düymələr */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNotified(true)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  notified
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-navy hover:bg-copper text-white shadow-md active:scale-[0.98]"
                }`}
              >
                {notified ? (
                  <>
                    <FiCheckCircle /> Bildiriş qeydə alındı!
                  </>
                ) : (
                  <>
                    <FiZap /> Çıxış barədə mənə bildir
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}