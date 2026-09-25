import Link from "next/link";
import { FiGlobe, FiPhone, FiMail, FiMapPin, FiShield } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Бренд */}
          <div className="space-y-3">
            <h3 className="text-xl font-extrabold text-white font-heading tracking-tight flex items-center gap-2">
              <span className="text-copper">MÜLKERA</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Azərbaycanda elit mənzillər, villalar və kommersiya obyektlərinin etibarlı alqı-satqı platforması.
            </p>
          </div>

          {/* Sürətli Keçidlər */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Sürətli Naviqasiya</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/listings" className="hover:text-copper transition">Daşınmaz Əmlak Elanları</Link>
              </li>
              <li>
                <Link href="/realtors" className="hover:text-copper transition">Lisenziyalı Rieltorlar</Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-copper transition">Xəritə Üzrə Axtarış</Link>
              </li>
              <li>
                <Link href="/live" className="hover:text-copper transition">Canlı PK Arenası</Link>
              </li>
            </ul>
          </div>

          {/* Hüquqi & Siyasətlər */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Qaydalar Və Şərtlər</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="hover:text-copper transition flex items-center gap-1">
                  <FiShield className="text-copper" /> İstifadə Şərtləri & Qaydalar
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-copper transition flex items-center gap-1">
                  <FiShield className="text-copper" /> Məxfilik Siyasəti (Privacy Policy)
                </Link>
              </li>
            </ul>
          </div>

          {/* Əlaqə */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Əlaqə & Dəstək</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-2">
                <FiMapPin className="text-copper" /> Bakı şəhəri, Nəsimi rayonu
              </li>
              <li className="flex items-center gap-2">
                <FiPhone className="text-copper" /> +994 12 400 00 00
              </li>
              <li className="flex items-center gap-2">
                <FiMail className="text-copper" /> info@mulkera.az
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>© 2026 MÜLKERA Real Estate. Bütün hüquqlar qorunur.</p>
          <p>Peşəkar Daşınmaz Əmlak Agentliyi Standartları</p>
        </div>
      </div>
    </footer>
  );
}
