"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  FiCpu,
  FiZap,
  FiCheckCircle,
  FiAward,
  FiShield,
  FiBell,
  FiArrowRight,
  FiMessageSquare,
} from "react-icons/fi";

export default function AiRealtorPage() {
  const { user } = useApp();
  const [contactInput, setContactInput] = useState("");
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
          role: "buyer",
          note: `AI Rieltor Gözləmə Siyahısı ${user ? `(User: ${user.id})` : ""}`,
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B0F19] via-[#1E1B4B] to-[#0B0F19] text-white p-8 sm:p-14 shadow-2xl border border-orange-500/20">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              <span>Tezliklə • Coming Soon</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-white leading-tight">
              AI Rieltor — Süni İntellektlə Ağıllı Əmlak Köməkçisi
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Süni intellektlə danışaraq və ya səsli mesaj göndərərək istədiyiniz ölçüdə, büdcədə və məkanda ən ideal mülkü saniyələr içində tapın. Dəqiq bazar analitikası və peşəkar təhlil bir toxunuşla əlçatan olacaq.
            </p>

            {/* Waiting List Form */}
            <div className="pt-4 max-w-lg">
              {subscribed ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
                  <FiCheckCircle className="text-2xl shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Gözləmə siyahısına yazıldınız!</div>
                    <div className="text-xs text-emerald-300">
                      AI Rieltor istifadəyə verildiyi an sizə xüsusi dəvət göndəriləcək.
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Email və ya əlaqə nömrəniz"
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm outline-none focus:border-orange-400 transition"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm transition shadow-lg shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <FiBell />
                      <span>{submitting ? "Göndərilir..." : "Xəbərdar ol"}</span>
                    </button>
                  </div>
                  {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Xüsusiyyətlər Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center text-2xl">
              <FiMessageSquare />
            </div>
            <h3 className="text-base font-bold text-navy dark:text-white">Təbii Dialoq və Səs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mürəkkəb filtrlərlə vaxt itirmədən, danışıq dilində istəyinizi bildirin. Süni intellekt bütün meyarları nəzərə alaraq ən uyğun variantları təqdim edəcək.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl">
              <FiZap />
            </div>
            <h3 className="text-base font-bold text-navy dark:text-white">Real Bazar Qiymət Təhlili</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Elanın qiymətinin real bazar ortalamasına uyğunluğunu, gələcək dəyər artımını və icarə gəlirliliyini dərhal hesablayır.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl">
              <FiShield />
            </div>
            <h3 className="text-base font-bold text-navy dark:text-white">Etibarlı və Şəffaf</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Yalnız təsdiqlənmiş lisenziyalı rieltorların və real mülk sahiblərinin çıxarışlı elanlarını təhlil edərək riskləri minimuma endirir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
