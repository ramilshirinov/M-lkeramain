"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { FiMail, FiLock, FiArrowRight, FiCheckCircle, FiEye, FiEyeOff } from "react-icons/fi";

function LoginForm() {
  const { login } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/profile";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Zəhmət olmasa bütün sahələri doldurun.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      setSuccessMsg("Uğurla daxil olundu! İstiqamətləndirilirsiniz...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 700);
    } catch (err) {
      console.error("Giriş xətası:", err.message);
      setErrorMsg(err.message || "Email və ya şifrə yanlışdır.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-navy/10 dark:border-slate-800 shadow-card text-navy dark:text-slate-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white">Xoş Gəlmisiniz</h1>
        <p className="text-sm text-navy/60 dark:text-slate-400 mt-1">Davam etmək üçün hesabınıza daxil olun</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium text-center">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium text-center flex items-center justify-center gap-2">
          <FiCheckCircle className="text-lg" /> {successMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
            Email Ünvanı
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-navy/40 dark:text-slate-500">
              <FiMail />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 rounded-xl text-sm text-navy dark:text-white outline-none focus:border-copper transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300">
              Şifrə
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-copper hover:underline">
              Şifrəni unutmusunuz?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-navy/40 dark:text-slate-500">
              <FiLock />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 rounded-xl text-sm text-navy dark:text-white outline-none focus:border-copper transition"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 bg-navy hover:bg-copper text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Daxil olunur..." : "Daxil Ol"} <FiArrowRight />
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-navy/60 dark:text-slate-400">
        Hesabınız yoxdur?{" "}
        <Link href="/register" className="font-bold text-copper hover:underline">
          Qeydiyyatdan keçin
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#F8FAFC] dark:bg-slate-950">
      <Suspense fallback={<div className="text-center">Yüklənir...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}