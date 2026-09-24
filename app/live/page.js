"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  FiRadio,
  FiVideo,
  FiUsers,
  FiAward,
  FiZap,
  FiCheckCircle,
  FiBell,
  FiArrowRight,
  FiPlusCircle,
  FiShield,
  FiMail,
  FiPhone,
} from "react-icons/fi";

export default function LivePage() {
  const { user } = useApp();
  const [contactInput, setContactInput] = useState("");
  const [selectedRole, setSelectedRole] = useState(user?.role === "realtor" ? "realtor" : "buyer");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!contactInput.trim()) {
      setErrorMsg("Zəhmət olmasa email və ya telefon nömrəsi daxil edin.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      const isEmail = contactInput.includes("@");
      const res = await fetch("/api/live/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: isEmail ? contactInput.trim() : "",
          phone: !isEmail ? contactInput.trim() : "",
          role: selectedRole,
          note: user ? `User ID: ${user.id}` : "Qonaq qeydiyyatı",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
      } else {
        setErrorMsg(data.message || "Xəta baş verdi");
      }
    } catch (err) {
      setErrorMsg("Bağlantı xətası. Yenidən cəhd edin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-8 sm:p-14 shadow-2xl border border-gold/20">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-copper/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span>Tezliklə • Coming Soon</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-white leading-tight">
              MÜLKERA Canlı Yayım &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-amber-300">
                Rieltor PK Mübarizə Arenası
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Azərbaycanın daşınmaz əmlak sektorunda ilk interaktiv canlı yayım platforması!
              Lisenziyalı peşəkar rieltorlar mənzilləri birbaşa canlı yayımda təqdim edəcək,
              virtual turlar keçirəcək və iki oxşar mənzili canlı PK arenasinda qarşılaşdıraraq izləyicilərin səsverməsinə çıxaracaq.
            </p>

            {/* Xəbərdar Ol Formu */}
            <div className="pt-4">
              {subscribed ? (
                <div className="p-5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-3">
                  <FiCheckCircle className="text-2xl shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Qeydiyyatınız uğurla qəbul edildi!</p>
                    <p className="text-xs text-emerald-300/80 mt-0.5">
                      Canlı yayım və PK döyüşləri rəsmi olaraq başladıqda ilk sizə SMS və ya Email bildirişi göndəriləcək.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3 max-w-xl">
                  <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold mb-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="buyer"
                        checked={selectedRole === "buyer"}
                        onChange={() => setSelectedRole("buyer")}
                        className="accent-gold"
                      />
                      <span>Alıcı / İzləyiciyəm</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="realtor"
                        checked={selectedRole === "realtor"}
                        onChange={() => setSelectedRole("realtor")}
                        className="accent-gold"
                      />
                      <span>Rieltorm / Yayım etmək istəyirəm</span>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Email və ya mobil nömrəniz (+994...)"
                        value={contactInput}
                        onChange={(e) => setContactInput(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder:text-slate-500 text-sm outline-none focus:border-gold transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold via-amber-500 to-gold text-navy font-bold text-sm hover:brightness-110 active:scale-98 transition shadow-lg shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <FiBell className="text-base" />
                      {submitting ? "Göndərilir..." : "Xəbərdar Ol"}
                    </button>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Nə Gözlənilir? (Feature Grid) */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-navy dark:text-white">
              Canlı Yayımda Hansı İmkanlar Olacaq?
            </h2>
            <p className="text-sm text-navy/60 dark:text-slate-400 font-medium">
              MÜLKERA Live ilə əmlak alışı və kirayəsi tam şəffaf, vizual və real-vaxt rejimində həyata keçiriləcək.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm space-y-4 hover:border-gold/40 transition">
              <div className="w-12 h-12 rounded-xl bg-copper/10 text-copper flex items-center justify-center text-2xl font-bold">
                <FiVideo />
              </div>
              <h3 className="text-lg font-bold text-navy dark:text-white">
                Canlı Mənzil Turları
              </h3>
              <p className="text-xs text-navy/70 dark:text-slate-400 leading-relaxed">
                Rieltorlar mənzilin içərisindən birbaşa canlı yayım açacaq. Təmir keyfiyyətini, otaqların işıqlılığını, panoram mənzərəni montajsız, real görüntüdə izləyin.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm space-y-4 hover:border-gold/40 transition">
              <div className="w-12 h-12 rounded-xl bg-gold/20 text-gold flex items-center justify-center text-2xl font-bold">
                <FiZap />
              </div>
              <h3 className="text-lg font-bold text-navy dark:text-white">
                İnteraktiv PK Arenası
              </h3>
              <p className="text-xs text-navy/70 dark:text-slate-400 leading-relaxed">
                İki fərqli rieltor eyni vaxtda efirə qoşularaq oxşar iki mənzili qarşı-qarşıya qoyacaq. İzləyicilər səs verərək və dəstək göstərərək ən sərfəli mənzili qalib seçəcək.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm space-y-4 hover:border-gold/40 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
                <FiShield />
              </div>
              <h3 className="text-lg font-bold text-navy dark:text-white">
                Rəsmi &amp; Təsdiqli Vasitəçilik
              </h3>
              <p className="text-xs text-navy/70 dark:text-slate-400 leading-relaxed">
                Yalnız MÜLKERA tərəfindən VÖEN və şəxsiyyət təsdiqi keçmiş lisenziyalı rieltorlar canlı yayım apara biləcək. Bütün sənədlər (Kupça/Çıxarış) efirdə təsdiqlənəcək.
              </p>
            </div>
          </div>
        </div>

        {/* Tez Keçidlər & CTA */}
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-navy dark:text-white">
              Əmlakınızı indi yerləşdirmək istəyirsiniz?
            </h4>
            <p className="text-xs text-navy/60 dark:text-slate-400">
              Canlı yayım başlamazdan əvvəl standart elan yerləşdirərək potensial müştərilərinizə çatın.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/listings"
              className="px-5 py-2.5 rounded-xl border border-navy/20 dark:border-slate-700 text-navy dark:text-slate-200 text-xs font-bold hover:border-gold transition"
            >
              Elanlara Bax
            </Link>
            <Link
              href="/listings/add"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm"
            >
              <FiPlusCircle /> Elan Yerləşdir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
