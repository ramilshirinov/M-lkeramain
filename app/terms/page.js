export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-navy/10 dark:border-slate-800 shadow-card space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-4">
          İstifadə Şərtləri Və Qaydalar (Terms & Conditions)
        </h1>

        <div className="space-y-4 text-xs sm:text-sm text-navy/80 dark:text-slate-300 leading-relaxed font-medium">
          <p>
            MÜLKERA platformasından istifadə etməklə aşağıdakı şərtləri və qaydaları tam qəbul etmiş olursunuz.
          </p>

          <h3 className="text-base font-bold text-navy dark:text-white pt-2">1. İstifadəçi Hesabları Və Qeydiyyat</h3>
          <p>
            İstifadəçilər daxil etdikləri şəxsi məlumatların dəqiqliyinə cavabdehdir. Rieltor hesabları qanuni VÖEN və şəxsiyyət təsdiqi tələb edə bilər.
          </p>

          <h3 className="text-base font-bold text-navy dark:text-white pt-2">2. Elan Yerləşdirilməsi Və Moderasiya</h3>
          <p>
            Saxta, təkrar və ya çaşdırıcı elanların yerləşdirilməsi qadağandır. Admin heyəti qaydaları pozan elanları xəbərdarlıq etmədən silmək hüququna malikdir.
          </p>

          <h3 className="text-base font-bold text-navy dark:text-white pt-2">3. Məsuliyyət Məhdudiyyəti</h3>
          <p>
            MÜLKERA istifadəçilər və rieltorlar arasında bağlanan müqavilələrin tərəfi deyil və əmlak alqı-satqısı zamanı birbaşa məsuliyyət daşımır.
          </p>
        </div>
      </div>
    </div>
  );
}
