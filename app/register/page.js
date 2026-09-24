"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Logo from "@/components/Logo";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiBriefcase,
  FiPercent,
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import az from "@/lib/i18n/az";

export default function RegisterPage() {
  const { dict = az, register } = useApp();
  const router = useRouter();

  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    agencyName: "",
    commissionRate: "",
    legalStatus: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role,
        agencyName: role === "realtor" ? form.agencyName : null,
        commissionRate: role === "realtor" ? form.commissionRate : null,
        legalStatus: role === "realtor" ? form.legalStatus : null,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (err) {
      setError(err.message || "Qeydiyyat zamanı xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-6 flex justify-center">
        <Logo className="h-12 w-auto" />
      </div>
      <div className="card-surface p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 text-navy dark:text-slate-100">
        <h1 className="mb-6 text-center text-2xl font-bold font-heading text-navy dark:text-white">
          {dict.auth?.registerTitle || "Qeydiyyatdan Keç"}
        </h1>

        {/* Rol Seçimi */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 border border-navy/10 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
              role === "customer"
                ? "bg-navy dark:bg-slate-900 text-white shadow-sm"
                : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            {dict.auth?.registerAsCustomer || "Müştəri"}
          </button>
          <button
            type="button"
            onClick={() => setRole("realtor")}
            className={`rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
              role === "realtor"
                ? "bg-navy dark:bg-slate-900 text-white shadow-sm"
                : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            {dict.auth?.registerAsRealtor || "Rieltor"}
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium">
            <FiAlertCircle className="text-base shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
            <FiCheckCircle className="text-base shrink-0" /> Hesabınız yaradıldı! Giriş təmin olunur...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
              {dict.auth?.fullName || "Ad Soyad"} *
            </label>
            <div className="relative">
              <FiUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500" />
              <input
                required
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Adınız Soyadınız"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pl-11 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
              {dict.auth?.email || "Elektron Poçt"} *
            </label>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="ornek@mail.com"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pl-11 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
              />
            </div>
          </div>

          {/* Şifrə Sahəsi + Göz İkonu (Show/Hide Password) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
              {dict.auth?.password || "Şifrə"} (min. 6 simvol) *
            </label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pl-11 pr-12 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-navy/40 dark:text-slate-400 hover:text-copper cursor-pointer"
                title={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
              >
                {showPassword ? <FiEyeOff className="text-base" /> : <FiEye className="text-base" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
              {dict.auth?.phone || "Əlaqə Nömrəsi"}
            </label>
            <div className="relative">
              <FiPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500" />
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+994 50 123 45 67"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pl-11 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
              />
            </div>
          </div>

          {role === "realtor" && (
            <div className="space-y-4 pt-2 border-t border-navy/10 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
                  {dict.auth?.agencyName || "Agentlik Adı"}
                </label>
                <div className="relative">
                  <FiBriefcase className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500" />
                  <input
                    value={form.agencyName}
                    onChange={(e) => update("agencyName", e.target.value)}
                    placeholder="Məs: Zirvə Əmlak"
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pl-11 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
                    {dict.auth?.commissionRate || "Komissiya (%)"}
                  </label>
                  <div className="relative">
                    <FiPercent className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.commissionRate}
                      onChange={(e) => update("commissionRate", e.target.value)}
                      placeholder="1.5"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pl-11 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-1.5">
                    {dict.auth?.legalStatus || "Hüquqi Status / VÖEN"}
                  </label>
                  <input
                    value={form.legalStatus}
                    onChange={(e) => update("legalStatus", e.target.value)}
                    placeholder="VÖEN təsdiqli"
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-navy hover:bg-copper text-white py-3.5 px-4 text-sm font-bold transition shadow-sm disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? "Gözləyin..." : dict.auth?.submitRegister || "Qeydiyyatdan Keç"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-navy/60 dark:text-slate-400 font-medium">
          {dict.auth?.haveAccount || "Artıq hesabınız var?"}{" "}
          <Link href="/login" className="font-bold text-copper hover:underline">
            {dict.nav?.login || "Daxil olun"}
          </Link>
        </p>
      </div>
    </div>
  );
}
