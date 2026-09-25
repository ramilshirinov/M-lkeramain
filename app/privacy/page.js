export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-navy/10 dark:border-slate-800 shadow-card space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-4">
          Məxfilik Siyasəti (Privacy Policy)
        </h1>

        <div className="space-y-4 text-xs sm:text-sm text-navy/80 dark:text-slate-300 leading-relaxed font-medium">
          <p>
            MÜLKERA istifadəçilərin məxfilik hüquqlarına hörmətlə yanaşır və toplanan şəxsi məlumatların təhlükəsizliyini təmin edir.
          </p>

          <h3 className="text-base font-bold text-navy dark:text-white pt-2">1. Toplanan Məlumatlar</h3>
          <p>
            Qeydiyyat zamanı ad, email, əlaqə nömrəsi, sosial linklər və elan verilənləri toplanır.
          </p>

          <h3 className="text-base font-bold text-navy dark:text-white pt-2">2. Məlumatların İstifadəsi</h3>
          <p>
            Toplanan verilənlər xidmət keyfiyyətinin artırılması, alıcı və satıcılar arasında əlaqənin yaradılması məqsədilə istifadə edilir.
          </p>

          <h3 className="text-base font-bold text-navy dark:text-white pt-2">3. Təhlükəsizlik Və Üçüncü Tərəflər</h3>
          <p>
            Şəxsi məlumatlarınız heç bir halda üçüncü tərəflərə satılmır və icazəsiz ötürülmür.
          </p>
        </div>
      </div>
    </div>
  );
}
