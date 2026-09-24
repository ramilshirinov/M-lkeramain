"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { FiMail, FiArrowLeft } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const { supabase } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (error) {
      alert("Xəta baş verdi: " + error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="card-surface bg-white p-8 rounded-2xl shadow-card border border-navy/10">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/60 hover:text-navy mb-6 transition">
          <FiArrowLeft /> Giriş səhifəsinə qayıt
        </Link>

        <h1 className="text-2xl font-bold font-heading text-navy mb-2">Şifrənin Bərpası</h1>
        <p className="text-xs text-navy/70 mb-6">Hesabınıza bağlı e-poçt ünvanını daxil edin, sizə şifrə sıfırlama linki göndərək.</p>

        {sent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
            Şifrəni sıfırlamaq üçün təlimat e-poçt ünvanınıza göndərildi. Zəhmət olmasa poçtunuzu yoxlayın.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">E-poçt ünvanı</label>
              <div className="relative flex items-center">
                <FiMail className="absolute left-4 text-navy/40" />
                <input
                  type="email"
                  required
                  placeholder="ornek@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-navy/15 pl-11 pr-4 py-3 text-sm outline-none text-navy focus:border-copper transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-navy text-white hover:bg-copper py-3 px-4 text-xs font-bold transition shadow-sm"
            >
              {loading} Göndərilir... : "Sıfırlama Linki Göndər"
            </button>
          </form>
        )}
      </div>
    </div>
  );
}