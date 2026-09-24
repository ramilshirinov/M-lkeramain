"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { FiLock } from "react-icons/fi";

export default function UpdatePasswordPage() {
  const { supabase } = useApp();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      alert("Şifrə yenilənərkən xəta: " + error.message);
    } else {
      alert("Şifrəniz uğurla yeniləndi!");
      router.push("/login");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="card-surface bg-white p-8 rounded-2xl shadow-card border border-navy/10">
        <h1 className="text-2xl font-bold font-heading text-navy mb-2">Yeni Şifrə Təyini</h1>
        <p className="text-xs text-navy/70 mb-6">Zəhmət olmasa hesabınız üçün yeni şifrə daxil edin.</p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Yeni Şifrə</label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-4 text-navy/40" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-navy/15 pl-11 pr-4 py-3 text-sm outline-none text-navy focus:border-copper transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-navy text-white hover:bg-copper py-3 px-4 text-xs font-bold transition shadow-sm"
          >
            {loading ? "Yenilənir..." : "Şifrəni Yadda Saxla"}
          </button>
        </form>
      </div>
    </div>
  );
}