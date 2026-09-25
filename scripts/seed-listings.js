const { createClient } = require("@supabase/supabase-js");

const url = "https://iiaqxrbnggcsgljqhwqe.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const SAMPLE_LISTINGS = [
  {
    title: "Nizami metrosu yaxınlığında 3 otaqlı modern mənzil",
    description: "Yeni tikili premium binada dizayner təmiri ilə 3 otaqlı geniş mənzil. Bütün mebel və İtaliya istehsalı məişət texnikası qalır. Yeraltı qaraj, 24/7 mühafizə, sakit həyət.",
    transaction_type: "sale",
    category_id: 1, // Yeni tikili
    city: "Bakı",
    address: "Yasamal r., Nizami m/s, Zivərbəy Əhmədbəyov küç. 42",
    latitude: 40.3789,
    longitude: 49.8295,
    price: 245000,
    currency: "AZN",
    area_m2: 125,
    room_count: 3,
    floor: 7,
    floor_total: 16,
    is_vip: true,
    status: "active",
    photos: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    title: "Nərimanovda Gənclik Mall yaxınlığında kirayə 2 otaqlı",
    description: "Gənclik metrosuna 5 dəqiqəlik piyada məsafədə tam əşyalı, mərkəzi istilik sistemi, kondisioner, sürətli internet ilə təmin olunmuş işıqlı mənzil kirayə verilir.",
    transaction_type: "rent",
    category_id: 1,
    city: "Bakı",
    address: "Nərimanov r., Fətəli Xan Xoyski küç. 88",
    latitude: 40.4012,
    longitude: 49.8524,
    price: 850,
    currency: "AZN",
    area_m2: 78,
    room_count: 2,
    floor: 4,
    floor_total: 12,
    is_vip: false,
    status: "active",
    photos: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    title: "Dəniz mənzərəli Port Baku yaxınlığında 4 otaqlı lüks mənzil",
    description: "Xətai rayonu, Ağ Şəhər və Bulvar ətrafında möhtəşəm dəniz panoraması olan lüks yaşayış kompleksində mənzil. Smart Home sistemi, şəxsi qaraj.",
    transaction_type: "sale",
    category_id: 1,
    city: "Bakı",
    address: "Xətai r., Neftçilər prospekti və Ağ Şəhər bulvarı",
    latitude: 40.3804,
    longitude: 49.8732,
    price: 520000,
    currency: "AZN",
    area_m2: 185,
    room_count: 4,
    floor: 14,
    floor_total: 20,
    is_vip: true,
    status: "active",
    photos: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    title: "Tarqovıda turistlər üçün günlük kirayə studio",
    description: "Fəvvarələr meydanının düz yanında tam təmirli, komfortlu günlük studio mənzil. Hər gün təmizlik xidməti, təmiz yataq dəstləri və yüksək sürətli Wi-Fi daxildir.",
    transaction_type: "daily_rent",
    category_id: 2,
    city: "Bakı",
    address: "Səbail r., Nizami (Tarqovı) küç. 18",
    latitude: 40.3701,
    longitude: 49.8378,
    price: 65,
    currency: "AZN",
    area_m2: 45,
    room_count: 1,
    floor: 2,
    floor_total: 4,
    is_vip: true,
    status: "active",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502005229762-ee1b2b8ab00f?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    title: "Badamdarda 3 mərtəbəli hovuzlu müasir villa",
    description: "Səbail rayonu, Badamdar 3-cü massivdə 8 sot torpaq sahəsində inşa edilmiş 6 otaqlı modern villa. Qapalı və açıq hovuz, sauna, manqal guşəsi, generator.",
    transaction_type: "sale",
    category_id: 3,
    city: "Bakı",
    address: "Səbail r., Badamdar qəs., 3-cü massiv",
    latitude: 40.3456,
    longitude: 49.8054,
    price: 780000,
    currency: "AZN",
    area_m2: 420,
    room_count: 6,
    floor: 3,
    floor_total: 3,
    is_vip: true,
    status: "active",
    photos: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    title: "Elmlər Akademiyası m/s yanında ailə üçün kirayə 3 otaqlı",
    description: "Universitetlər şəhərciyində, BDU və Texniki Universitetin yaxınlığında sakit və təmiz ailəvi mənzil. Bütün infrastruktur qapının ağzındadır.",
    transaction_type: "rent",
    category_id: 1,
    city: "Bakı",
    address: "Yasamal r., Zahid Xəlilov küç. 55",
    latitude: 40.3752,
    longitude: 49.8133,
    price: 950,
    currency: "AZN",
    area_m2: 110,
    room_count: 3,
    floor: 6,
    floor_total: 14,
    is_vip: false,
    status: "active",
    photos: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

async function seed() {
  // Ramil's profile id
  const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
  const ownerId = profiles?.[0]?.id || null;

  for (const item of SAMPLE_LISTINGS) {
    const { photos, ...listingData } = item;
    listingData.owner_id = ownerId;
    listingData.views_count = Math.floor(Math.random() * 200) + 25;

    const { data: created, error } = await supabase
      .from("listings")
      .insert([listingData])
      .select()
      .single();

    if (error) {
      console.error("Listing insert error:", error.message);
      continue;
    }

    if (created && photos && photos.length > 0) {
      const photoRows = photos.map((url, idx) => ({
        listing_id: created.id,
        url,
        sort_order: idx
      }));
      await supabase.from("listing_photos").insert(photoRows);
    }
  }

  console.log("Seed complete! Added", SAMPLE_LISTINGS.length, "listings.");
}

seed();
