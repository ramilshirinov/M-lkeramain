export const metadata = {
  title: "MÜLKERA — Admin İdarəetmə Paneli",
  description: "Mülkera platformasının mərkəzi idarəetmə və fəaliyyət nəzarət paneli.",
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-copper selection:text-white">
      {children}
    </div>
  );
}
