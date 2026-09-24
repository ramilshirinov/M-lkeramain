"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { FiCheckCircle, FiClock, FiAward, FiUserCheck, FiXCircle } from "react-icons/fi";

export default function ApprovedRealtorsTab() {
  const { supabase } = useApp();
  const [realtors, setRealtors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealtors();
  }, [supabase]);

  async function fetchRealtors() {
    setLoading(true);
    // Rieltor profillərini və istifadəçi məlumatlarını çəkirik
    const { data, error } = await supabase
      .from("realtor_profiles")
      .select(`
        *,
        users:user_id (email, full_name, phone)
      `)
      .order("created_at", { ascending: false });

    if (!error) {
      setRealtors(data || []);
    }
    setLoading(false);
  }

  // Təsdiq statusunu dəyişmək (approved / pending)
  const handleToggleApproval = async (id, currentStatus) => {
    const newStatus = currentStatus === "approved" ? "pending" : "approved";
    const { error } = await supabase
      .from("realtor_profiles")
      .update({ approval_status: newStatus })
      .eq("id", id);

    if (!error) {
      setRealtors(realtors.map(r => r.id === id ? { ...r, approval_status: newStatus } : r));
    } else {
      alert("Xəta baş verdi: " + error.message);
    }
  };

  // Top Seller statusunu dəyişmək (true / false)
  const handleToggleTopSeller = async (id, currentTop) => {
    const newTop = !currentTop;
    const { error } = await supabase
      .from("realtor_profiles")
      .update({ is_top_seller: newTop })
      .eq("id", id);

    if (!error) {
      setRealtors(realtors.map(r => r.id === id ? { ...r, is_top_seller: newTop } : r));
    } else {
      alert("Xəta baş verdi: " + error.message);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-navy font-medium">Rieltorlar yüklənir...</div>;
  }

  return (
    <div className="card-surface p-6 bg-white rounded-2xl shadow-card border border-navy/10">
      <h2 className="text-xl font-bold font-heading text-navy mb-6">Rieltorların İdarə Edilməsi</h2>

      {realtors.length === 0 ? (
        <p className="text-center py-6 text-navy/60 text-sm">Hələ qeydiyyatdan keçən rieltor yoxdur.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy/10 text-xs font-semibold text-navy/60 uppercase tracking-wider">
                <th className="py-3 px-4">Rieltor / Agentlik</th>
                <th className="py-3 px-4">Əlaqə</th>
                <th className="py-3 px-4">Komissiya</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Top Seller</th>
                <th className="py-3 px-4 text-right">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5 text-sm text-navy">
              {realtors.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-bold text-navy">{item.agency_name || "Agentlik qeyd yoxdur"}</div>
                    <div className="text-xs text-navy/60">{item.legal_status || "Fiziki şəxs"}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium">{item.users?.full_name || "Ad yoxdur"}</div>
                    <div className="text-xs text-navy/60">{item.users?.email}</div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-copper">
                    %{item.commission_rate || 0}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      item.approval_status === "approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {item.approval_status === "approved" ? <FiCheckCircle /> : <FiClock />}
                      {item.approval_status === "approved" ? "Təsdiqlənib" : "Gözləmədə"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleTopSeller(item.id, item.is_top_seller)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        item.is_top_seller ? "bg-gold/20 text-gold-dark border border-gold/40" : "bg-slate-100 text-navy/50 hover:bg-slate-200"
                      }`}
                    >
                      <FiAward /> {item.is_top_seller ? "Top Seller" : "Adi"}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleToggleApproval(item.id, item.approval_status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        item.approval_status === "approved" 
                          ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white" 
                          : "bg-navy text-white hover:bg-copper"
                      }`}
                    >
                      {item.approval_status === "approved" ? "Statusu Geri Al" : "Təsdiq Et"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}