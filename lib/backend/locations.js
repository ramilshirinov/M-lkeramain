/**
 * MÜLKERA Daşınmaz Əmlak - Ərazi və İyerarxiya Məlumat Bazası
 * Şəhər -> Rayon -> Qəsəbə / Mikrorayon / Kənd / Digər İyerarxiyası
 */

export const HIERARCHICAL_LOCATIONS = {
  cities: [
    {
      id: "baku",
      name_az: "Bakı",
      name_ru: "Баку",
      name_en: "Baku",
      districts: [
        {
          id: 1,
          name_az: "Nəsimi",
          settlements: [
            { id: "nas-1", name: "1-ci mikrorayon", type: "mikrorayon" },
            { id: "nas-2", name: "2-ci mikrorayon", type: "mikrorayon" },
            { id: "nas-3", name: "3-cü mikrorayon", type: "mikrorayon" },
            { id: "nas-4", name: "4-cü mikrorayon", type: "mikrorayon" },
            { id: "nas-5", name: "5-ci mikrorayon", type: "mikrorayon" },
            { id: "nas-kub", name: "Kubinka", type: "ərazi" },
            { id: "nas-pap", name: "Papanin", type: "ərazi" },
            { id: "nas-28m", name: "28 May m/st yaxınlığı", type: "metro" },
            { id: "nas-niz", name: "Nizami m/st yaxınlığı", type: "metro" },
            { id: "nas-acm", name: "Memar Əcəmi m/st", type: "metro" },
            { id: "nas-other", name: "Digər (Nəsimi)", type: "digər" }
          ]
        },
        {
          id: 2,
          name_az: "Nərimanov",
          settlements: [
            { id: "nar-gnc", name: "Gənclik m/st yaxınlığı", type: "metro" },
            { id: "nar-nar", name: "Nərimanov m/st", type: "metro" },
            { id: "nar-mon", name: "Montin qəsəbəsi", type: "qəsəbə" },
            { id: "nar-kor", name: "Koroğlu m/st yaxınlığı", type: "metro" },
            { id: "nar-cer", name: "Çermet", type: "ərazi" },
            { id: "nar-bsr", name: "Böyükşor", type: "ərazi" },
            { id: "nar-other", name: "Digər (Nərimanov)", type: "digər" }
          ]
        },
        {
          id: 3,
          name_az: "Yasamal",
          settlements: [
            { id: "yas-yeni", name: "Yeni Yasamal", type: "mikrorayon" },
            { id: "yas-elm", name: "Elmlər Akademiyası m/st", type: "metro" },
            { id: "yas-ins", name: "İnşaatçılar m/st", type: "metro" },
            { id: "yas-20y", name: "20 Yanvar m/st", type: "metro" },
            { id: "yas-sov", name: "Sovetski", type: "ərazi" },
            { id: "yas-qan", name: "Qanlıgöl", type: "ərazi" },
            { id: "yas-other", name: "Digər (Yasamal)", type: "digər" }
          ]
        },
        {
          id: 4,
          name_az: "Səbail",
          settlements: [
            { id: "sab-icer", name: "İçərişəhər", type: "tarixi" },
            { id: "sab-sah", name: "Sahil m/st & Bulvar", type: "metro" },
            { id: "sab-bad", name: "Badamdar qəsəbəsi", type: "qəsəbə" },
            { id: "sab-bay", name: "Bayıl qəsəbəsi", type: "qəsəbə" },
            { id: "sab-bib", name: "Bibiheybət qəsəbəsi", type: "qəsəbə" },
            { id: "sab-20s", name: "20-ci sahə", type: "ərazi" },
            { id: "sab-other", name: "Digər (Səbail)", type: "digər" }
          ]
        },
        {
          id: 5,
          name_az: "Xətai",
          settlements: [
            { id: "xat-agsh", name: "Ağ Şəhər (White City)", type: "yaşayış kompleksi" },
            { id: "xat-ehm", name: "Əhmədli m/st", type: "metro" },
            { id: "xat-haz", name: "Həzi Aslanov m/st", type: "metro" },
            { id: "xat-xlq", name: "Xalqlar Dostluğu m/st", type: "metro" },
            { id: "xat-kgun", name: "Köhnə Günəşli", type: "qəsəbə" },
            { id: "xat-ehq", name: "Əhmədli kəndi / qəs.", type: "qəsəbə" },
            { id: "xat-other", name: "Digər (Xətai)", type: "digər" }
          ]
        },
        {
          id: 6,
          name_az: "Binəqədi",
          settlements: [
            { id: "bin-qes", name: "Binəqədi qəsəbəsi", type: "qəsəbə" },
            { id: "bin-bil", name: "Biləcəri qəsəbəsi", type: "qəsəbə" },
            { id: "bin-ras", name: "M.Ə.Rəsulzadə (Pasyolka Kirov)", type: "qəsəbə" },
            { id: "bin-6mkr", name: "6-cı mikrorayon", type: "mikrorayon" },
            { id: "bin-7mkr", name: "7-ci mikrorayon", type: "mikrorayon" },
            { id: "bin-8mkr", name: "8-ci mikrorayon", type: "mikrorayon" },
            { id: "bin-9mkr", name: "9-cu mikrorayon", type: "mikrorayon" },
            { id: "bin-sul", name: "Sulutəpə", type: "qəsəbə" },
            { id: "bin-xoc", name: "Xocəsən", type: "qəsəbə" },
            { id: "bin-other", name: "Digər (Binəqədi)", type: "digər" }
          ]
        },
        {
          id: 7,
          name_az: "Sabunçu",
          settlements: [
            { id: "sab-bak", name: "Bakıxanov qəsəbəsi (Razin)", type: "qəsəbə" },
            { id: "sab-zab", name: "Zabrat qəsəbəsi", type: "qəsəbə" },
            { id: "sab-mas", name: "Maştağa qəsəbəsi", type: "qəsəbə" },
            { id: "sab-pir", name: "Pirşağı qəsəbəsi", type: "qəsəbə" },
            { id: "sab-kur", name: "Kürdəxanı qəsəbəsi", type: "qəsəbə" },
            { id: "sab-bil", name: "Bilgəh qəsəbəsi", type: "qəsəbə" },
            { id: "sab-nar", name: "Nardaran qəsəbəsi", type: "qəsəbə" },
            { id: "sab-other", name: "Digər (Sabunçu)", type: "digər" }
          ]
        },
        {
          id: 8,
          name_az: "Suraxanı",
          settlements: [
            { id: "sur-qar", name: "Qaraçuxur qəsəbəsi", type: "qəsəbə" },
            { id: "sur-ygun", name: "Yeni Günəşli", type: "qəsəbə" },
            { id: "sur-hov", name: "Hövsan qəsəbəsi", type: "qəsəbə" },
            { id: "sur-emi", name: "Əmircan qəsəbəsi", type: "qəsəbə" },
            { id: "sur-bul", name: "Bülbülə qəsəbəsi", type: "qəsəbə" },
            { id: "sur-other", name: "Digər (Suraxanı)", type: "digər" }
          ]
        },
        {
          id: 9,
          name_az: "Xəzər",
          settlements: [
            { id: "xez-mar", name: "Mərdəkan qəsəbəsi", type: "qəsəbə" },
            { id: "xez-suv", name: "Şüvəlan qəsəbəsi", type: "qəsəbə" },
            { id: "xez-buz", name: "Buzovna qəsəbəsi", type: "qəsəbə" },
            { id: "xez-qal", name: "Qala qəsəbəsi", type: "qəsəbə" },
            { id: "xez-bin", name: "Binə qəsəbəsi", type: "qəsəbə" },
            { id: "xez-tur", name: "Türkan qəsəbəsi", type: "qəsəbə" },
            { id: "xez-zir", name: "Zirə qəsəbəsi", type: "qəsəbə" },
            { id: "xez-other", name: "Digər (Xəzər)", type: "digər" }
          ]
        },
        {
          id: 10,
          name_az: "Qaradağ",
          settlements: [
            { id: "qar-lok", name: "Lökbatan qəsəbəsi", type: "qəsəbə" },
            { id: "qar-sah", name: "Sahil qəsəbəsi (Puta)", type: "qəsəbə" },
            { id: "qar-qob", name: "Qobustan qəsəbəsi", type: "qəsəbə" },
            { id: "qar-ale", name: "Ələt qəsəbəsi", type: "qəsəbə" },
            { id: "qar-san", name: "Səngəçal qəsəbəsi", type: "qəsəbə" },
            { id: "qar-other", name: "Digər (Qaradağ)", type: "digər" }
          ]
        }
      ]
    },
    {
      id: "absheron",
      name_az: "Abşeron",
      name_ru: "Апшерон",
      name_en: "Absheron",
      districts: [
        {
          id: 12,
          name_az: "Xırdalan",
          settlements: [
            { id: "abs-xir-cen", name: "Xırdalan Mərkəz", type: "şəhər" },
            { id: "abs-xir-aaaf", name: "AAAF Park & Heydər Əliyev pr.", type: "kompleks" },
            { id: "abs-xir-other", name: "Digər (Xırdalan)", type: "digər" }
          ]
        },
        {
          id: 13,
          name_az: "Masazır",
          settlements: [
            { id: "abs-mas-gol", name: "Duz Gölü ətrafı", type: "ərazi" },
            { id: "abs-mas-yen", name: "Yeni Bakı kompleksi", type: "kompleks" },
            { id: "abs-mas-qas", name: "Qurtuluş 93", type: "kompleks" },
            { id: "abs-mas-other", name: "Digər (Masazır)", type: "digər" }
          ]
        },
        {
          id: 16,
          name_az: "Saray & Novxanı",
          settlements: [
            { id: "abs-sar", name: "Saray qəsəbəsi", type: "qəsəbə" },
            { id: "abs-nov", name: "Novxanı bağları & dəniz sahili", type: "qəsəbə" },
            { id: "abs-meh", name: "Mehdiabad qəsəbəsi", type: "qəsəbə" },
            { id: "abs-cey", name: "Ceyranbatan qəsəbəsi", type: "qəsəbə" },
            { id: "abs-other", name: "Digər (Abşeron)", type: "digər" }
          ]
        }
      ]
    },
    {
      id: "sumgayit",
      name_az: "Sumqayıt",
      name_ru: "Сумгаит",
      name_en: "Sumgait",
      districts: [
        {
          id: 11,
          name_az: "Sumqayıt mərkəz",
          settlements: [
            { id: "sum-1mkr", name: "1-ci və 2-ci mikrorayonlar", type: "mikrorayon" },
            { id: "sum-cor", name: "Corat qəsəbəsi", type: "qəsəbə" },
            { id: "sum-yas", name: "Yaşıl Dərə", type: "ərazi" },
            { id: "sum-tag", name: "H.Z.Tağıyev qəsəbəsi", type: "qəsəbə" },
            { id: "sum-other", name: "Digər (Sumqayıt)", type: "digər" }
          ]
        }
      ]
    },
    {
      id: "ganja",
      name_az: "Gəncə",
      name_ru: "Гянджа",
      name_en: "Ganja",
      districts: [
        {
          id: 14,
          name_az: "Gəncə",
          settlements: [
            { id: "gnj-niz", name: "Nizami rayonu", type: "rayon" },
            { id: "gnj-kap", name: "Kəpəz rayonu", type: "rayon" },
            { id: "gnj-other", name: "Digər (Gəncə)", type: "digər" }
          ]
        }
      ]
    },
    {
      id: "shusha",
      name_az: "Şuşa",
      name_ru: "Шуша",
      name_en: "Shusha",
      districts: [
        {
          id: 15,
          name_az: "Şuşa",
          settlements: [
            { id: "shu-cen", name: "Şuşa Mərkəz", type: "şəhər" },
            { id: "shu-cyd", name: "Cıdır düzü ətrafı", type: "ərazi" },
            { id: "shu-other", name: "Digər (Şuşa)", type: "digər" }
          ]
        }
      ]
    }
  ]
};

export function getAllDistrictsWithSettlements() {
  const allDistricts = [];
  for (const city of HIERARCHICAL_LOCATIONS.cities) {
    for (const district of city.districts) {
      allDistricts.push({
        id: district.id,
        name_az: district.name_az,
        city: city.name_az,
        city_id: city.id,
        settlements: district.settlements || []
      });
    }
  }
  return allDistricts;
}

export function findSettlementMatch(districtId, settlementName) {
  if (!districtId || !settlementName) return null;
  const districts = getAllDistrictsWithSettlements();
  const district = districts.find((d) => String(d.id) === String(districtId));
  if (!district) return null;

  const needle = settlementName.toLowerCase().trim();
  return (
    district.settlements.find(
      (s) => s.id === needle || s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase())
    ) || null
  );
}
