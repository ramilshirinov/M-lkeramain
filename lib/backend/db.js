import fs from "fs";
import path from "path";

const DB_FILE_PATH = path.join(process.cwd(), "data", "mulkera-db.json");

// İlkin standart məlumatlar
const INITIAL_CATEGORIES = [
  { id: 1, name_az: "Yeni Tikili", name_ru: "Новостройка", name_en: "New Construction", slug: "yeni-tikili" },
  { id: 2, name_az: "Köhnə Tikili", name_ru: "Вторичка", name_en: "Secondary Market", slug: "kohne-tikili" },
  { id: 3, name_az: "Həyət Evi / Villa", name_ru: "Дом / Вилла", name_en: "House / Villa", slug: "heyet-evi" },
  { id: 4, name_az: "Bağ Evi", name_ru: "Дача", name_en: "Country House", slug: "bag-evi" },
  { id: 5, name_az: "Ofis", name_ru: "Офис", name_en: "Office", slug: "ofis" },
  { id: 6, name_az: "Qaraj / Obyekt", name_ru: "Гараж / Объект", name_en: "Commercial / Garage", slug: "obyekt" },
  { id: 7, name_az: "Torpaq Sahəsi", name_ru: "Земельный участок", name_en: "Land Plot", slug: "torpaq" }
];

const INITIAL_DISTRICTS = [
  { id: 1, name_az: "Nəsimi", name_ru: "Насими", name_en: "Nasimi", city: "Bakı" },
  { id: 2, name_az: "Nərimanov", name_ru: "Нариманов", name_en: "Narimanov", city: "Bakı" },
  { id: 3, name_az: "Yasamal", name_ru: "Ясамал", name_en: "Yasamal", city: "Bakı" },
  { id: 4, name_az: "Səbail", name_ru: "Сабаил", name_en: "Sabail", city: "Bakı" },
  { id: 5, name_az: "Xətai", name_ru: "Хатаи", name_en: "Khatai", city: "Bakı" },
  { id: 6, name_az: "Binəqədi", name_ru: "Бинагади", name_en: "Binagadi", city: "Bakı" },
  { id: 7, name_az: "Sabunçu", name_ru: "Сабунчи", name_en: "Sabunchu", city: "Bakı" },
  { id: 8, name_az: "Suraxanı", name_ru: "Сураханы", name_en: "Surakhani", city: "Bakı" },
  { id: 9, name_az: "Xəzər", name_ru: "Хазар", name_en: "Khazar", city: "Bakı" },
  { id: 10, name_az: "Qaradağ", name_ru: "Гарадаг", name_en: "Garadagh", city: "Bakı" },
  { id: 11, name_az: "Sumqayıt mərkəz", name_ru: "Центр Сумгаита", name_en: "Sumgait Center", city: "Sumqayıt" },
  { id: 12, name_az: "Xırdalan", name_ru: "Хырдалан", name_en: "Khirdalan", city: "Abşeron" },
  { id: 13, name_az: "Masazır", name_ru: "Масазыр", name_en: "Masazir", city: "Abşeron" },
  { id: 14, name_az: "Gəncə", name_ru: "Гянджа", name_en: "Ganja", city: "Gəncə" },
  { id: 15, name_az: "Şuşa", name_ru: "Шуша", name_en: "Shusha", city: "Şuşa" }
];

const INITIAL_USERS = [
  {
    id: "admin-001",
    email: "admin@mulkera.az",
    password: "admin",
    full_name: "MÜLKERA Rəhbərlik",
    phone: "+994 12 400 00 00",
    role: "admin",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    agency_name: "MÜLKERA Head Office",
    created_at: "2026-01-01T00:00:00Z"
  },
  {
    id: "r1",
    email: "ramil.realtor@mulkera.az",
    password: "password123",
    full_name: "Ramil Şirinov",
    phone: "+994 50 123 45 67",
    role: "realtor",
    avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
    agency_name: "MÜLKERA Premium Real Estate",
    commission_rate: "1.5%",
    legal_status: "VÖEN: 1403928191",
    is_approved_realtor: true,
    is_approved: true,
    approval_status: "approved",
    rating: 4.9,
    sales_count: 32,
    satisfaction_rate: "99.4%",
    sales_speed_days: 8,
    reviews_count: 28,
    bio: "Bakının mərkəzində və premium yaşayış komplekslərində 8 ildən artıq təcrübəyə malik lisenziyalı daşınmaz əmlak mütəxəssisi.",
    created_at: "2026-01-05T10:00:00Z"
  },
  {
    id: "r2",
    email: "elmir.realtor@mulkera.az",
    password: "password123",
    full_name: "Elmir Məmmədov",
    phone: "+994 55 234 56 78",
    role: "realtor",
    avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
    agency_name: "Bakı Əmlak Mərkəzi",
    commission_rate: "1-2%",
    legal_status: "VÖEN: 2004819201",
    is_approved_realtor: true,
    is_approved: true,
    approval_status: "approved",
    rating: 4.8,
    sales_count: 27,
    satisfaction_rate: "98.8%",
    sales_speed_days: 11,
    reviews_count: 21,
    bio: "Nərimanov və Xətai rayonlarında mənzil alqı-satqısı və kirayəsi üzrə peşəkar vasitəçilik xidməti.",
    created_at: "2026-01-10T11:00:00Z"
  },
  {
    id: "r3",
    email: "aysel.realtor@mulkera.az",
    password: "password123",
    full_name: "Aysel Qasımova",
    phone: "+994 70 345 67 89",
    role: "realtor",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    agency_name: "Golden Key Agency",
    commission_rate: "1%",
    legal_status: "VÖEN: 1803719002",
    is_approved_realtor: true,
    is_approved: true,
    approval_status: "approved",
    rating: 4.8,
    sales_count: 24,
    satisfaction_rate: "98.2%",
    sales_speed_days: 10,
    reviews_count: 19,
    bio: "Bağ evləri, villalar və torpaq sahələri üzrə ixtisaslaşmış operativ rieltor.",
    created_at: "2026-01-12T14:00:00Z"
  },
  {
    id: "client-001",
    email: "client@mulkera.az",
    password: "password123",
    full_name: "Leyla Məmmədova",
    phone: "+994 50 999 88 77",
    role: "customer",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    created_at: "2026-01-15T09:00:00Z"
  }
];

const INITIAL_PENDING_REALTORS = [
  {
    id: "p1",
    user_id: "u-pending-1",
    full_name: "Samir Bağırov",
    email: "samir.bagirov@realestate.az",
    agency_name: "Xəzər Əmlak MMC",
    commission_rate: "1.5%",
    legal_status: "VÖEN: 1002345671",
    phone: "+994 50 888 77 66",
    approval_status: "pending",
    created_at: "2026-03-10T12:00:00Z"
  },
  {
    id: "p2",
    user_id: "u-pending-2",
    full_name: "Fuad Həsənov",
    email: "fuad.hesenov@emlak.az",
    agency_name: "Zirvə Daşınmaz Əmlak",
    commission_rate: "2%",
    legal_status: "VÖEN: 1509988771",
    phone: "+994 77 555 44 33",
    approval_status: "pending",
    created_at: "2026-03-14T15:30:00Z"
  }
];

const INITIAL_LISTINGS = [
  {
    id: 1,
    listing_number: "MLK-10492",
    owner_id: "r1",
    owner_type: "agency",
    title_az: "Nəsimi r., Nizami m. yaxınlığında 3 otaqlı modern mənzil",
    title_ru: "3-комнатная современная квартира возле м. Низами",
    title_en: "3-room modern apartment near Nizami metro",
    description_az: "Şəhərin mərkəzində, Nizami metrosuna 5 dəqiqəlik məsafədə yerləşən yeni tikili kompleksdə yüksək keyfiyyətli təmirli mənzil. Mənzildə qaz, su, işıq fasiləsizdir. Çıxarış (Kupça) var, ipotekaya yararlıdır. Yeraltı qaraj, 24 saat mühafizə və sürətli 'Kone' liftləri mövcuddur.",
    category_id: 1,
    district_id: 1,
    selected_city: "Bakı",
    transaction_type: "sale",
    price: 245000,
    currency: "AZN",
    room_count: 3,
    area_m2: 128,
    yard_sot: null,
    floor_number: 9,
    total_floors: 16,
    address: "Bakı şəhəri, Nəsimi rayonu, Səməd Vurğun küçəsi 88",
    latitude: 40.3855,
    longitude: 49.8398,
    phone_number: "+994 50 123 45 67",
    documents: ["Kupça", "Çıxarış", "Texniki pasport"],
    is_vip: true,
    status: "active",
    view_count: 432,
    favorite_count: 38,
    created_at: "2026-03-01T10:00:00Z",
    listing_photos: [
      { id: 101, url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 0 },
      { id: 102, url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 1 },
      { id: 103, url: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 2 }
    ]
  },
  {
    id: 2,
    listing_number: "MLK-20811",
    owner_id: "r1",
    owner_type: "agency",
    title_az: "Ağ Şəhərdə (White City) lüks 4 otaqlı dəniz mənzərəli mənzil",
    title_ru: "Роскошная 4-комнатная квартира в White City с видом на море",
    title_en: "Luxury 4-room apartment in White City with sea view",
    description_az: "Bakı Ağ Şəhər premium yaşayış binasında fransız layihəli elit mənzil. Vitraj pəncərələr, mərkəzi havalandırma, İtalyan mebelləri və yüksək akustik izolyasiya. Mənzil tam əşyalı satılır.",
    category_id: 1,
    district_id: 5,
    selected_city: "Bakı",
    transaction_type: "sale",
    price: 490000,
    currency: "AZN",
    room_count: 4,
    area_m2: 185,
    yard_sot: null,
    floor_number: 6,
    total_floors: 8,
    address: "Bakı şəhəri, Xətai rayonu, Ağ Şəhər bulvarı 12",
    latitude: 40.3802,
    longitude: 49.8885,
    phone_number: "+994 50 123 45 67",
    documents: ["Kupça", "Çıxarış"],
    is_vip: true,
    status: "active",
    view_count: 812,
    favorite_count: 74,
    created_at: "2026-03-05T12:30:00Z",
    listing_photos: [
      { id: 201, url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 0 },
      { id: 202, url: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 1 }
    ]
  },
  {
    id: 3,
    listing_number: "MLK-30154",
    owner_id: "r2",
    owner_type: "agency",
    title_az: "Nərimanov metrosu yanında 2 otaqlı təmirli kirayə mənzil",
    title_ru: "2-комнатная отремонтированная арендная квартира возле м. Нариманов",
    title_en: "2-room furnished rental apartment near Narimanov metro",
    description_az: "Nərimanov m/st yaxınlığında ailəyə və ya işgüzar şəxslərə uzunmüddətli kirayə verilir. Bütün məişət texnikası (kondisioner, paltaryuyan, soyuducu, smart TV) mövcuddur. İstilik sistemi kombidir.",
    category_id: 1,
    district_id: 2,
    selected_city: "Bakı",
    transaction_type: "rent",
    price: 850,
    currency: "AZN",
    room_count: 2,
    area_m2: 75,
    yard_sot: null,
    floor_number: 4,
    total_floors: 12,
    address: "Bakı şəhəri, Nərimanov rayonu, Təbriz küçəsi 45",
    latitude: 40.4024,
    longitude: 49.8705,
    phone_number: "+994 55 234 56 78",
    documents: ["Notarial müqavilə"],
    is_vip: false,
    status: "active",
    view_count: 520,
    favorite_count: 29,
    created_at: "2026-03-08T09:15:00Z",
    listing_photos: [
      { id: 301, url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 0 },
      { id: 302, url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 1 }
    ]
  },
  {
    id: 4,
    listing_number: "MLK-40891",
    owner_id: "r3",
    owner_type: "agency",
    title_az: "Mərdəkanda 6 sotda lüks modern bağ evi (Villa)",
    title_ru: "Современная дача-вилла на 6 сотках в Мардакянах",
    title_en: "Modern luxury villa on 6 sot land in Mardakan",
    description_az: "Mərdəkanın ən elit məhəlləsində, daimi yaşayış üçün ideal villa. Filterli daşma hovuz, qapalı yay mətbəxi, manqalxana, landşaft dizaynı və dekorativ ağaclar. 4 yataq otağı, hər otağın öz sanitar qovşağı var. Qaz, işıq, içməli su və generator sistemi.",
    category_id: 4,
    district_id: 9,
    selected_city: "Bakı",
    transaction_type: "sale",
    price: 360000,
    currency: "AZN",
    room_count: 5,
    area_m2: 240,
    yard_sot: 6,
    floor_number: 2,
    total_floors: 2,
    address: "Bakı şəhəri, Xəzər rayonu, Mərdəkan qəsəbəsi",
    latitude: 40.4851,
    longitude: 50.1455,
    phone_number: "+994 70 345 67 89",
    documents: ["Kupça", "Çıxarış", "Texniki pasport"],
    is_vip: true,
    status: "active",
    view_count: 940,
    favorite_count: 85,
    created_at: "2026-03-11T16:45:00Z",
    listing_photos: [
      { id: 401, url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 0 },
      { id: 402, url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 1 }
    ]
  },
  {
    id: 5,
    listing_number: "MLK-50119",
    owner_id: "client-001",
    owner_type: "owner",
    title_az: "Yasamal rayonunda, Elmlər Akademiyası m/st yaxınlığında 2 otaqlı mənzil",
    title_ru: "2-комнатная квартира возле м. Эльмляр Академиясы, Ясамал",
    title_en: "2-room apartment near Elmlar Akademiyasi metro, Yasamal",
    description_az: "Birbaşa sahibindən satılır. Daş bina (eksperimental layihə), 3-cü mərtəbə. Sakit, yaşıllıq həyəti, parkinq yeri var. Orta blok, yelçəkən (skvoznoy). İpoteka üçün tam yararlıdır.",
    category_id: 2,
    district_id: 3,
    selected_city: "Bakı",
    transaction_type: "sale",
    price: 158000,
    currency: "AZN",
    room_count: 2,
    area_m2: 65,
    yard_sot: null,
    floor_number: 3,
    total_floors: 5,
    address: "Bakı şəhəri, Yasamal rayonu, Z.Xəlilov küçəsi 23",
    latitude: 40.3752,
    longitude: 49.8142,
    phone_number: "+994 50 999 88 77",
    documents: ["Kupça", "Çıxarış"],
    is_vip: false,
    status: "active",
    view_count: 310,
    favorite_count: 18,
    created_at: "2026-03-12T11:00:00Z",
    listing_photos: [
      { id: 501, url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 0 },
      { id: 502, url: "https://images.unsplash.com/photo-1502005229762-ee1b2da92e06?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 1 }
    ]
  },
  {
    id: 6,
    listing_number: "MLK-60334",
    owner_id: "r2",
    owner_type: "agency",
    title_az: "Xırdalan mərkəzində, Heydər Parkı yanında 1 otaqdan 2 otağa düzəlmə mənzil",
    title_ru: "Переделанная 2-комнатная квартира в центре Хырдалана",
    title_en: "1 converted to 2-room apartment in central Khirdalan",
    description_az: "Tam yaşayışlı kompleksdə təmirlı mənzil. Lift işləkdir, qaz və mərkəzi su təminatı daimidir. Avtobus dayanacağına 2 dəqiqə.",
    category_id: 1,
    district_id: 12,
    selected_city: "Abşeron",
    transaction_type: "sale",
    price: 78000,
    currency: "AZN",
    room_count: 2,
    area_m2: 54,
    yard_sot: null,
    floor_number: 7,
    total_floors: 14,
    address: "Abşeron rayonu, Xırdalan şəhəri, Qalubiyyə küçəsi",
    latitude: 40.4491,
    longitude: 49.7548,
    phone_number: "+994 55 234 56 78",
    documents: ["Notarial müqavilə", "Müqavilə"],
    is_vip: false,
    status: "active",
    view_count: 240,
    favorite_count: 14,
    created_at: "2026-03-13T14:10:00Z",
    listing_photos: [
      { id: 601, url: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1000&auto=format&fit=crop&q=80", media_type: "image", sort_order: 0 }
    ]
  }
];

const INITIAL_REVIEWS = [
  {
    id: 1,
    realtor_id: "r1",
    reviewer_name: "Tural Quliyev",
    rating: 5,
    date: "2 gün əvvəl",
    comment: "Çox peşəkar yanaşma! Nəsimi rayonunda mənzil alışı zamanı bütün sənədləşmə işlərini sürətli və şəffaf şəkildə həyata keçirdi. Hər kəsə tövsiyə edirəm.",
    created_at: "2026-03-18T10:00:00Z"
  },
  {
    id: 2,
    realtor_id: "r1",
    reviewer_name: "Günay Əliyeva",
    rating: 5,
    date: "1 həftə əvvəl",
    comment: "Evimizi cəmi 10 gün ərzində bazar qiymətinə satmağa kömək etdi. Komissiya haqqı çox münasib və əvvəlcədən dəqiq razılaşdırılmışdı.",
    created_at: "2026-03-12T14:00:00Z"
  },
  {
    id: 3,
    realtor_id: "r2",
    reviewer_name: "Kamran Məmmədli",
    rating: 5,
    date: "2 həftə əvvəl",
    comment: "İpoteka ilə mənzil axtarırdıq, bank təsdiqindən açar təhvilinə qədər yanımızda oldu. Təşəkkürlər!",
    created_at: "2026-03-05T09:00:00Z"
  }
];

const INITIAL_REPORTS = [
  {
    id: "rep1",
    listing_id: 1,
    reporter_id: "client-001",
    reason: "Artıq satılıb və ya kirayə verilib",
    details: "Elan sahibi ilə danışdım, dünən açarları təhvil veriblər.",
    created_at: "2026-03-15T18:00:00Z"
  }
];

const INITIAL_LIVE_STREAMS = [
  {
    id: "stream-1",
    title: "Port Baku vs Ağ Şəhər | Canlı PK Ev Qarşılaşması",
    description: "İki top rieltor canlı yayımda Bakının ən prestijli iki lüks mənzilini qarşılaşdırır! İzləyicilər səs verir və qalib əmlakı seçir.",
    is_pk: true,
    viewers_count: 914,
    status: "live",
    time_left_seconds: 380,
    left_realtor: {
      id: "r1",
      name: "Ramil Şirinov",
      agency: "MÜLKERA Premium Real Estate",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
      score: 2150,
      property: {
        listing_id: 2,
        title: "Ağ Şəhər Bulvarı 4 Otaqlı Lüks Mənzil",
        price: "490,000 AZN",
        area: "185 m²",
        rooms: 4,
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&auto=format&fit=crop&q=80",
        address: "Bakı, Xətai r., Ağ Şəhər bulvarı 12"
      }
    },
    right_realtor: {
      id: "r2",
      name: "Elmir Məmmədov",
      agency: "Bakı Əmlak Mərkəzi",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
      score: 1890,
      property: {
        listing_id: 1,
        title: "Nəsimi r., Nizami m. 3 Otaqlı Modern Mənzil",
        price: "245,000 AZN",
        area: "128 m²",
        rooms: 3,
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80",
        address: "Bakı, Nəsimi r., Səməd Vurğun küç. 88"
      }
    },
    comments: [
      { id: 1, user: "Orxan Qasımov", text: "Ağ Şəhərdəki evin dəniz mənzərəsi inanılmazdır! 🔥", time: "1 dəq əvvəl" },
      { id: 2, user: "Nərmin Əhmədova", text: "Nizami metrosundakı mənzilin yerləşməsi çox əlverişlidir!", time: "2 dəq əvvəl" },
      { id: 3, user: "Kamran Vəliyev", text: "Ramil bəyə Qızıl Açar hədiyyəsi göndərdim! 🔑", time: "2 dəq əvvəl" },
      { id: 4, user: "Aynur M.", text: "Mənzillərə yerində canlı baxmaq əla fürsətdir!", time: "3 dəq əvvəl" }
    ],
    gifts_received: [
      { id: "g1", type: "crown", name: "Mülkera Tacı", icon: "👑", value: 100, sender: "Tural B.", side: "left" },
      { id: "g2", type: "villa", name: "Lüks Villa", icon: "🏠", value: 20, sender: "Anar K.", side: "right" },
      { id: "g3", type: "key", name: "Qızıl Açar", icon: "🔑", value: 5, sender: "Kamran V.", side: "left" }
    ]
  },
  {
    id: "stream-2",
    title: "Mərdəkan / Şüvəlanda 6 Sotda Hovuzlu Bağ Evi Turu",
    description: "Lüks bağ evinin həyəti, qapalı və açıq hovuzu, yay mətbəxi və daxili dizaynının canlı video təqdimatı.",
    is_pk: false,
    viewers_count: 428,
    status: "live",
    time_left_seconds: 600,
    realtor: {
      id: "r3",
      name: "Aysel Qasımova",
      agency: "Golden Key Agency",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
      phone: "+994 70 345 67 89",
      property: {
        listing_id: 4,
        title: "Mərdəkan / Şüvəlanda 4 Otaqlı Hovuzlu Bağ Evi",
        price: "275,000 AZN",
        area: "180 m² (6 sot torpaq)",
        rooms: 4,
        image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1000&auto=format&fit=crop&q=80",
        address: "Bakı, Xəzər r., Şüvəlan qəsəbəsi, Mayak yolu"
      }
    },
    comments: [
      { id: 1, user: "Fərid Əliyev", text: "Bağ evinin çıxarışı tam mülkiyyətdir?", time: "1 dəq əvvəl" },
      { id: 2, user: "Gülər S.", text: "Hovuzun isitmə sistemi var?", time: "2 dəq əvvəl" }
    ],
    gifts_received: [
      { id: "g1", type: "coffee", name: "Qəhvə", icon: "☕", value: 2, sender: "Fərid Ə." }
    ]
  }
];

// Global in-memory cache
let memoryDb = null;

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

export function getDb() {
  if (memoryDb) {
    if (!memoryDb.live_streams) memoryDb.live_streams = INITIAL_LIVE_STREAMS;
    if (!memoryDb.vip_promotions) memoryDb.vip_promotions = [];
    return memoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
      memoryDb = JSON.parse(raw);
      if (!memoryDb.live_streams) memoryDb.live_streams = INITIAL_LIVE_STREAMS;
      if (!memoryDb.vip_promotions) memoryDb.vip_promotions = [];
      return memoryDb;
    }
  } catch (err) {
    console.error("DB faylı oxuna bilmədi, standart məlumatlar bərpa edilir:", err);
  }

  // İlk dəfə yaradılır
  memoryDb = {
    categories: INITIAL_CATEGORIES,
    districts: INITIAL_DISTRICTS,
    users: INITIAL_USERS,
    pending_realtors: INITIAL_PENDING_REALTORS,
    listings: INITIAL_LISTINGS,
    favorites: [
      { id: "fav-1", user_id: "client-001", listing_id: 1, created_at: "2026-03-14T10:00:00Z" }
    ],
    reviews: INITIAL_REVIEWS,
    reports: INITIAL_REPORTS,
    live_streams: INITIAL_LIVE_STREAMS,
    vip_promotions: []
  };

  saveDb(memoryDb);
  return memoryDb;
}

export function saveDb(data) {
  try {
    ensureDirectoryExistence(DB_FILE_PATH);
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    memoryDb = data;
  } catch (err) {
    console.error("DB faylı yadda saxlanılmadı:", err);
  }
}

// ---------------- Helper metodlar ----------------

export function enrichListing(listing, db = getDb()) {
  if (!listing) return null;
  const category = db.categories.find((c) => c.id === Number(listing.category_id)) || null;
  const district = db.districts.find((d) => d.id === Number(listing.district_id)) || null;
  const owner = db.users.find((u) => u.id === listing.owner_id || u.id === listing.user_id) || null;

  return {
    ...listing,
    categories: category,
    districts: district,
    profiles: owner,
    users: owner,
    listing_photos: listing.listing_photos || []
  };
}

export function queryListings(filters = {}) {
  const db = getDb();
  let list = [...db.listings];

  // Yalnız aktiv elanlar (admin istisna olmaqla)
  if (filters.status) {
    list = list.filter((l) => l.status === filters.status);
  } else if (!filters.allStatuses) {
    list = list.filter((l) => l.status === "active");
  }

  // Mətn axtarışı
  if (filters.search) {
    const s = filters.search.toLowerCase().trim();
    list = list.filter((l) =>
      (l.title_az || "").toLowerCase().includes(s) ||
      (l.address || "").toLowerCase().includes(s) ||
      (l.description_az || "").toLowerCase().includes(s) ||
      (l.listing_number || "").toLowerCase().includes(s)
    );
  }

  // Əməliyyat növü
  if (filters.type && filters.type !== "all") {
    if (filters.type === "rent") {
      list = list.filter((l) => l.transaction_type === "rent" || l.transaction_type === "daily");
    } else {
      list = list.filter((l) => l.transaction_type === filters.type);
    }
  }

  // Kateqoriya
  if (filters.category && filters.category !== "all") {
    list = list.filter((l) => String(l.category_id) === String(filters.category));
  }

  // Şəhər
  if (filters.city && filters.city !== "all") {
    const c = String(filters.city).toLowerCase();
    list = list.filter(
      (l) =>
        (l.selected_city || "").toLowerCase() === c ||
        (l.address || "").toLowerCase().includes(c)
    );
  }

  // Rayon
  if (filters.district && filters.district !== "all") {
    const d = String(filters.district).toLowerCase();
    list = list.filter((l) =>
      String(l.district_id) === d ||
      (l.address || "").toLowerCase().includes(d) ||
      (l.districts?.name_az || "").toLowerCase().includes(d)
    );
  }

  // Qəsəbə / Mikrorayon / Kənd / Ərazi (İyerarxiya & Digər)
  if (filters.settlement && filters.settlement !== "all") {
    const s = String(filters.settlement).toLowerCase().trim();
    if (s === "other" || s === "digər" || s === "diger") {
      // Digər seçildikdə spesifik qəsəbəsi olmayan və ya əl ilə daxil edilmiş elanlar
      list = list.filter((l) => !l.settlement || l.settlement.toLowerCase().includes("digər"));
    } else {
      list = list.filter(
        (l) =>
          (l.settlement || "").toLowerCase().includes(s) ||
          (l.address || "").toLowerCase().includes(s) ||
          (l.title_az || "").toLowerCase().includes(s)
      );
    }
  }

  // Otaq sayı
  if (filters.rooms && filters.rooms !== "all") {
    if (filters.rooms === "4+" || filters.rooms === "4plus") {
      list = list.filter((l) => Number(l.room_count) >= 4);
    } else {
      list = list.filter((l) => Number(l.room_count) === Number(filters.rooms));
    }
  }
  if (filters.minRooms) {
    list = list.filter((l) => Number(l.room_count) >= Number(filters.minRooms));
  }
  if (filters.maxRooms) {
    list = list.filter((l) => Number(l.room_count) <= Number(filters.maxRooms));
  }

  // Qiymət aralığı
  if (filters.minPrice) {
    list = list.filter((l) => Number(l.price) >= Number(filters.minPrice));
  }
  if (filters.maxPrice) {
    list = list.filter((l) => Number(l.price) <= Number(filters.maxPrice));
  }

  // Sahə aralığı (kv.m)
  if (filters.minArea) {
    list = list.filter((l) => {
      const area = Number(l.area_m2 || (l.yard_sot ? l.yard_sot * 100 : 0));
      return area >= Number(filters.minArea);
    });
  }
  if (filters.maxArea) {
    list = list.filter((l) => {
      const area = Number(l.area_m2 || (l.yard_sot ? l.yard_sot * 100 : 0));
      return area <= Number(filters.maxArea);
    });
  }

  // Torpaq sahəsi aralığı (sot)
  if (filters.minSot) {
    list = list.filter((l) => Number(l.yard_sot || (l.area_m2 ? l.area_m2 / 100 : 0)) >= Number(filters.minSot));
  }
  if (filters.maxSot) {
    list = list.filter((l) => Number(l.yard_sot || (l.area_m2 ? l.area_m2 / 100 : 0)) <= Number(filters.maxSot));
  }

  // İpoteka və Çıxarış (Kupça) filtri
  if (filters.mortgageOnly || filters.hasKupcha || filters.has_kupcha) {
    list = list.filter((l) => (l.documents || []).some((d) => d.includes("Kupça") || d.includes("Çıxarış")));
  }

  // Yalnız VIP elanlar
  if (filters.isVipOnly || filters.vipOnly) {
    list = list.filter((l) => Boolean(l.is_vip));
  }

  // Sahibi filtri (user_id / owner_id)
  if (filters.ownerId) {
    list = list.filter((l) => l.owner_id === filters.ownerId || l.user_id === filters.ownerId);
  }

  // VIP müddətinin bitməsi yoxlanışı (Avtomatik yenilənmə)
  const now = new Date();
  list.forEach((l) => {
    if (l.is_vip && l.vip_expires_at && new Date(l.vip_expires_at) < now) {
      l.is_vip = false;
    }
  });

  // Sıralama (VIP elanlar həmişə prioritet sıralanır)
  if (filters.sort === "price_asc") {
    list.sort((a, b) => {
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      return Number(a.price) - Number(b.price);
    });
  } else if (filters.sort === "price_desc") {
    list.sort((a, b) => {
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      return Number(b.price) - Number(a.price);
    });
  } else if (filters.sort === "area_asc") {
    list.sort((a, b) => {
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      return Number(a.area_m2 || 0) - Number(b.area_m2 || 0);
    });
  } else if (filters.sort === "area_desc") {
    list.sort((a, b) => {
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      return Number(b.area_m2 || 0) - Number(a.area_m2 || 0);
    });
  } else if (filters.sort === "views") {
    list.sort((a, b) => {
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      return Number(b.view_count || 0) - Number(a.view_count || 0);
    });
  } else {
    // Standart: VIP-lər əvvəl, sonra ən yenilər
    list.sort((a, b) => {
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  return list.map((l) => enrichListing(l, db));
}

export function getListingById(id) {
  const db = getDb();
  const found = db.listings.find((l) => String(l.id) === String(id));
  if (!found) return null;
  return enrichListing(found, db);
}

export function insertListing(payload, photoUrls = [], videoUrls = []) {
  const db = getDb();
  const nextId = db.listings.length > 0 ? Math.max(...db.listings.map((l) => Number(l.id) || 0)) + 1 : 1;
  const listingNumber = `MLK-${Math.floor(10000 + Math.random() * 90000)}`;

  const mediaList = [
    ...(photoUrls || []).map((url, i) => ({
      id: Date.now() + i,
      url: typeof url === "string" ? url : url?.url,
      media_type: "image",
      sort_order: i
    })),
    ...(videoUrls || []).map((url, i) => ({
      id: Date.now() + 100 + i,
      url: typeof url === "string" ? url : url?.url,
      media_type: "video",
      sort_order: (photoUrls?.length || 0) + i
    }))
  ];

  const newListing = {
    id: nextId,
    listing_number: listingNumber,
    created_at: new Date().toISOString(),
    view_count: 0,
    favorite_count: 0,
    status: "active",
    is_vip: false,
    listing_photos: mediaList,
    ...payload
  };

  db.listings.unshift(newListing);
  saveDb(db);
  return enrichListing(newListing, db);
}

export function updateListingById(id, payload, photoUrls = null, videoUrls = null) {
  const db = getDb();
  const idx = db.listings.findIndex((l) => String(l.id) === String(id));
  if (idx === -1) return null;

  let currentPhotos = db.listings[idx].listing_photos || [];
  if (photoUrls !== null || videoUrls !== null) {
    currentPhotos = [
      ...(photoUrls || []).map((url, i) => ({
        id: Date.now() + i,
        url: typeof url === "string" ? url : url?.url,
        media_type: "image",
        sort_order: i
      })),
      ...(videoUrls || []).map((url, i) => ({
        id: Date.now() + 100 + i,
        url: typeof url === "string" ? url : url?.url,
        media_type: "video",
        sort_order: (photoUrls?.length || 0) + i
      }))
    ];
  }

  const updated = {
    ...db.listings[idx],
    ...payload,
    listing_photos: currentPhotos,
    updated_at: new Date().toISOString()
  };

  db.listings[idx] = updated;
  saveDb(db);
  return enrichListing(updated, db);
}

export function deleteListingById(id) {
  const db = getDb();
  const idx = db.listings.findIndex((l) => String(l.id) === String(id));
  if (idx === -1) return false;
  db.listings.splice(idx, 1);
  // Sevimlilərdən də sil
  db.favorites = db.favorites.filter((f) => String(f.listing_id) !== String(id));
  saveDb(db);
  return true;
}

export function incrementListingViewCount(id) {
  const db = getDb();
  const listing = db.listings.find((l) => String(l.id) === String(id));
  if (listing) {
    listing.view_count = (listing.view_count || 0) + 1;
    saveDb(db);
  }
}

// ---------------- Favorites ----------------

export function toggleListingFavorite(userId, listingId) {
  const db = getDb();
  const lid = Number(listingId) || listingId;
  const existingIdx = db.favorites.findIndex(
    (f) => String(f.user_id) === String(userId) && String(f.listing_id) === String(lid)
  );

  const listing = db.listings.find((l) => String(l.id) === String(lid));

  if (existingIdx !== -1) {
    db.favorites.splice(existingIdx, 1);
    if (listing && listing.favorite_count > 0) {
      listing.favorite_count -= 1;
    }
    saveDb(db);
    return { favorited: false };
  } else {
    db.favorites.push({
      id: `fav-${Date.now()}`,
      user_id: userId,
      listing_id: lid,
      created_at: new Date().toISOString()
    });
    if (listing) {
      listing.favorite_count = (listing.favorite_count || 0) + 1;
    }
    saveDb(db);
    return { favorited: true };
  }
}

export function getUserFavorites(userId) {
  const db = getDb();
  const favs = db.favorites.filter((f) => String(f.user_id) === String(userId));
  return favs.map((f) => {
    const listing = db.listings.find((l) => String(l.id) === String(f.listing_id));
    return {
      id: f.id,
      listing_id: f.listing_id,
      listings: enrichListing(listing, db)
    };
  }).filter((f) => f.listings);
}

// ---------------- Realtors & Reviews ----------------

export function getApprovedRealtors(sort = "rating") {
  const db = getDb();
  const realtors = db.users.filter((u) => u.role === "realtor" && u.is_approved_realtor);

  if (sort === "sales") {
    realtors.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
  } else {
    realtors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return realtors;
}

export function getRealtorById(id) {
  const db = getDb();
  const realtor = db.users.find((u) => String(u.id) === String(id) && u.role === "realtor");
  if (!realtor) return null;

  const listings = db.listings.filter((l) => l.owner_id === realtor.id && l.status === "active");
  const reviews = db.reviews.filter((r) => String(r.realtor_id) === String(realtor.id));

  return {
    ...realtor,
    listings: listings.map((l) => enrichListing(l, db)),
    reviews
  };
}

export function addRealtorReview(realtorId, { reviewer_name, rating, comment, user_id }) {
  const db = getDb();
  const realtor = db.users.find((u) => String(u.id) === String(realtorId));
  if (!realtor) return null;

  const newReview = {
    id: Date.now(),
    realtor_id: realtorId,
    reviewer_id: user_id || null,
    reviewer_name: reviewer_name || "Müştəri",
    rating: Number(rating) || 5,
    date: "İndicə",
    comment,
    created_at: new Date().toISOString()
  };

  db.reviews.unshift(newReview);

  // Yenidən orta reytinqi hesabla
  const realtorReviews = db.reviews.filter((r) => String(r.realtor_id) === String(realtorId));
  const avg = realtorReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / realtorReviews.length;
  realtor.rating = Number(avg.toFixed(1));
  realtor.reviews_count = realtorReviews.length;

  saveDb(db);
  return newReview;
}

// ---------------- Admin Actions ----------------

export function getAdminDashboardData() {
  const db = getDb();
  return {
    stats: {
      users: db.users.length,
      listings: db.listings.length,
      pendingCount: db.pending_realtors.length,
      reportsCount: db.reports.length
    },
    pendingRealtors: db.pending_realtors,
    approvedRealtors: db.users.filter((u) => u.role === "realtor" && u.is_approved_realtor),
    listings: db.listings.map((l) => enrichListing(l, db)),
    reports: db.reports.map((r) => {
      const listing = db.listings.find((l) => String(l.id) === String(r.listing_id));
      return {
        ...r,
        listings: listing ? { id: listing.id, title: listing.title_az } : null
      };
    })
  };
}

export function approveRealtorApplication(id) {
  const db = getDb();
  const idx = db.pending_realtors.findIndex((p) => String(p.id) === String(id) || String(p.user_id) === String(id));
  if (idx === -1) return false;

  const pending = db.pending_realtors[idx];
  db.pending_realtors.splice(idx, 1);

  // Users cədvəlində mövcud olub-olmadığını yoxla və ya əlavə et
  let user = db.users.find((u) => u.id === pending.user_id || u.email === pending.email);
  if (user) {
    user.role = "realtor";
    user.is_approved_realtor = true;
    user.is_approved = true;
    user.approval_status = "approved";
  } else {
    user = {
      id: pending.user_id || `r-${Date.now()}`,
      email: pending.email,
      password: "password123",
      full_name: pending.full_name,
      phone: pending.phone,
      role: "realtor",
      agency_name: pending.agency_name,
      commission_rate: pending.commission_rate,
      legal_status: pending.legal_status,
      is_approved_realtor: true,
      is_approved: true,
      approval_status: "approved",
      rating: 5.0,
      sales_count: 0,
      satisfaction_rate: "100%",
      sales_speed_days: 10,
      reviews_count: 0,
      created_at: new Date().toISOString()
    };
    db.users.push(user);
  }

  saveDb(db);
  return true;
}

export function rejectRealtorApplication(id, reason) {
  const db = getDb();
  const idx = db.pending_realtors.findIndex((p) => String(p.id) === String(id) || String(p.user_id) === String(id));
  if (idx === -1) return false;
  db.pending_realtors.splice(idx, 1);
  saveDb(db);
  return true;
}

export function toggleListingVipStatus(listingId) {
  const db = getDb();
  const listing = db.listings.find((l) => String(l.id) === String(listingId));
  if (!listing) return null;
  listing.is_vip = !listing.is_vip;
  saveDb(db);
  return listing.is_vip;
}

export function createListingReport({ listingId, reporterId, reason, details }) {
  const db = getDb();
  const newReport = {
    id: `rep-${Date.now()}`,
    listing_id: listingId,
    reporter_id: reporterId || null,
    reason,
    details,
    created_at: new Date().toISOString()
  };
  db.reports.unshift(newReport);
  saveDb(db);
  return newReport;
}

export function dismissReportById(reportId) {
  const db = getDb();
  db.reports = db.reports.filter((r) => String(r.id) !== String(reportId));
  saveDb(db);
  return true;
}

// ---------------- Auth ----------------

export function authenticateUser(email, password) {
  const db = getDb();
  const cleanEmail = (email || "").toLowerCase().trim();
  const user = db.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);

  if (!user) return null;
  // Əgər şifrə uyğun gəlirsə (və ya demo asanlığı üçün password test edilir)
  if (user.password === password || password === "admin" || password === "password123") {
    // Şifrəsiz profil
    const { password: _, ...cleanUser } = user;
    return cleanUser;
  }
  return null;
}

export function registerNewUser({ email, password, fullName, phone, role, agencyName, commissionRate, legalStatus }) {
  const db = getDb();
  const cleanEmail = (email || "").toLowerCase().trim();
  const existing = db.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
  if (existing) {
    throw new Error("Bu email ünvanı ilə artıq istifadəçi qeydiyyatdan keçib.");
  }

  const userId = `u-${Date.now()}`;
  const isRealtor = role === "realtor";

  const newUser = {
    id: userId,
    email: cleanEmail,
    password: password || "password123",
    full_name: fullName || "İstifadəçi",
    phone: phone || "+994 50 000 00 00",
    role: isRealtor ? "realtor" : "customer",
    agency_name: isRealtor ? agencyName : null,
    commission_rate: isRealtor ? (commissionRate ? `${commissionRate}%` : "1.5%") : null,
    legal_status: isRealtor ? legalStatus : null,
    is_approved_realtor: false, // Rieltor admin tərəfindən təsdiqlənməlidir
    is_approved: !isRealtor,
    approval_status: isRealtor ? "pending" : "approved",
    rating: 5.0,
    sales_count: 0,
    satisfaction_rate: "100%",
    sales_speed_days: 12,
    reviews_count: 0,
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);

  if (isRealtor) {
    db.pending_realtors.unshift({
      id: `p-${Date.now()}`,
      user_id: userId,
      full_name: fullName,
      email: cleanEmail,
      agency_name: agencyName,
      commission_rate: `${commissionRate || 1.5}%`,
      legal_status: legalStatus || "VÖEN təsdiqi gözlənilir",
      phone: phone,
      approval_status: "pending",
      created_at: new Date().toISOString()
    });
  }

  saveDb(db);

  const { password: _, ...cleanUser } = newUser;
  return cleanUser;
}

export function getUserProfileById(userId) {
  const db = getDb();
  const user = db.users.find((u) => String(u.id) === String(userId));
  if (!user) return null;
  const { password: _, ...cleanUser } = user;
  return cleanUser;
}

export function updateUserProfileById(userId, payload) {
  const db = getDb();
  const idx = db.users.findIndex((u) => String(u.id) === String(userId));
  if (idx === -1) return null;

  const updated = {
    ...db.users[idx],
    ...payload
  };

  db.users[idx] = updated;
  saveDb(db);

  const { password: _, ...cleanUser } = updated;
  return cleanUser;
}

// ---------------- Oxşar və Əlaqədar Elanlar Alqoritmi (Recommendation Engine) ----------------

/**
 * Elanlar cədvəlində location (şəhər, rayon, qəsəbə), price (qiymət) və area (sahə/kv.m)
 * indeksləməsi və oxşarlıq alqoritmi.
 * Eyni məkanda yerləşən, qiymət fərqi ±20% və sahə fərqi ±15% aralığında olan
 * elanları prioritet olaraq hesablayır.
 */
export function buildListingLocationIndex(listings = []) {
  const byLocation = new Map();
  const byPrice = [...listings].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  const byArea = [...listings].sort(
    (a, b) => Number(a.area_m2 || a.yard_sot * 100 || 0) - Number(b.area_m2 || b.yard_sot * 100 || 0)
  );

  for (const item of listings) {
    const city = (item.selected_city || "Bakı").toLowerCase();
    const district = String(item.district_id || "0");
    const locKey = `${city}:${district}`;
    if (!byLocation.has(locKey)) {
      byLocation.set(locKey, []);
    }
    byLocation.get(locKey).push(item.id);
  }

  return { byLocation, byPrice, byArea };
}

export function getSimilarListings(id, limit = 4, options = {}) {
  const db = getDb();
  const current = db.listings.find((l) => String(l.id) === String(id));
  if (!current) return [];

  const curPrice = Number(current.price || 0);
  const curArea = Number(current.area_m2 || (current.yard_sot ? current.yard_sot * 100 : 0));
  const curCity = (current.selected_city || "Bakı").toLowerCase();
  const curDistrict = String(current.district_id || "");
  const curSettlement = (current.settlement || "").toLowerCase();

  const candidates = db.listings.filter((l) => String(l.id) !== String(id) && l.status === "active");

  const scored = candidates.map((item) => {
    let score = 0;
    const reasons = [];
    const itemPrice = Number(item.price || 0);
    const itemArea = Number(item.area_m2 || (item.yard_sot ? item.yard_sot * 100 : 0));
    const itemCity = (item.selected_city || "Bakı").toLowerCase();
    const itemDistrict = String(item.district_id || "");
    const itemSettlement = (item.settlement || "").toLowerCase();

    // 1. MƏKAN OXŞARLIĞI (Çəki: 40 bal)
    let isLocationMatch = false;
    let locationDetail = "";

    const sameDistrict = curDistrict && itemDistrict && curDistrict === itemDistrict;
    const sameSettlement = curSettlement && itemSettlement && (curSettlement === itemSettlement || itemSettlement.includes(curSettlement));
    const sameCity = curCity === itemCity;

    // Ünvan oxşarlığı yoxlanışı
    const addressWords = (current.address || "").toLowerCase().split(/[\s,.-]+/);
    const hasStreetOverlap = addressWords.some(
      (w) => w.length > 4 && (item.address || "").toLowerCase().includes(w)
    );

    if (sameSettlement) {
      score += 40;
      isLocationMatch = true;
      locationDetail = `Eyni qəsəbə/ərazi (${item.settlement})`;
      reasons.push(locationDetail);
    } else if (sameDistrict) {
      score += 35;
      isLocationMatch = true;
      locationDetail = "Eyni rayonda yerləşir";
      reasons.push(locationDetail);
    } else if (hasStreetOverlap) {
      score += 25;
      isLocationMatch = true;
      locationDetail = "Yaxın küçə və ətrafda yerləşir";
      reasons.push(locationDetail);
    } else if (sameCity) {
      score += 15;
      locationDetail = "Eyni şəhərdə yerləşir";
      reasons.push(locationDetail);
    }

    // 2. QİYMƏT FƏRQİ (Çəki: 35 bal) - Hədəf: ±20% aralığı
    let isPriceMatch = false;
    let priceDiffPct = 0;
    if (curPrice > 0 && itemPrice > 0) {
      priceDiffPct = ((itemPrice - curPrice) / curPrice) * 100;
      const absPriceDiff = Math.abs(priceDiffPct);

      if (absPriceDiff <= 10) {
        score += 35;
        isPriceMatch = true;
        reasons.push(`±10% dəqiq büdcə uyğunluğu (${priceDiffPct >= 0 ? "+" : ""}${priceDiffPct.toFixed(1)}%)`);
      } else if (absPriceDiff <= 20) {
        score += 28;
        isPriceMatch = true;
        reasons.push(`±20% büdcə yaxınlığı (${priceDiffPct >= 0 ? "+" : ""}${priceDiffPct.toFixed(1)}%)`);
      } else if (absPriceDiff <= 35) {
        score += 15;
      }
    }

    // 3. SAHƏ FƏRQİ (Çəki: 25 bal) - Hədəf: ±15% aralığı
    let isAreaMatch = false;
    let areaDiffPct = 0;
    if (curArea > 0 && itemArea > 0) {
      areaDiffPct = ((itemArea - curArea) / curArea) * 100;
      const absAreaDiff = Math.abs(areaDiffPct);

      if (absAreaDiff <= 8) {
        score += 25;
        isAreaMatch = true;
        reasons.push(`±8% ekvivalent sahə (${itemArea} m²)`);
      } else if (absAreaDiff <= 15) {
        score += 20;
        isAreaMatch = true;
        reasons.push(`±15% oxşar sahə aralığı (${itemArea} m²)`);
      } else if (absAreaDiff <= 25) {
        score += 10;
      }
    }

    // 4. Əlavə meyar: Kateqoriya və Əməliyyat növü (Çəki: 15 bal)
    if (current.category_id && String(item.category_id) === String(current.category_id)) {
      score += 10;
      reasons.push("Eyni əmlak növü");
    }
    if (current.transaction_type && item.transaction_type === current.transaction_type) {
      score += 5;
    }

    // 5. Otaq sayı yaxınlığı (Çəki: 10 bal)
    if (current.room_count && item.room_count) {
      if (Number(current.room_count) === Number(item.room_count)) {
        score += 10;
        reasons.push(`${current.room_count} otaqlı`);
      } else if (Math.abs(Number(current.room_count) - Number(item.room_count)) === 1) {
        score += 5;
      }
    }

    // ±20% qiymət və ±15% sahə aralığı tələbi üçün xüsusi indikator
    const meetsAlgorithmTarget = isLocationMatch && isPriceMatch && isAreaMatch;
    if (meetsAlgorithmTarget) {
      score += 20; // Alqoritmin 3 əsas hədəfini tam ödəyənə super bonus
    }

    const matchPercentage = Math.min(99, Math.max(50, Math.round((score / 145) * 100)));

    return {
      listing: enrichListing(item, db),
      similarityScore: score,
      matchPercentage,
      meetsAlgorithmTarget,
      metrics: {
        priceDiffPct: Number(priceDiffPct.toFixed(1)),
        areaDiffPct: Number(areaDiffPct.toFixed(1)),
        isLocationMatch,
        isPriceMatch,
        isAreaMatch
      },
      reasons: reasons.slice(0, 3)
    };
  });

  // Sıralama: hədəf meyarları ödəyənlər əvvəl, sonra ümumi oxşarlıq balı ilə
  scored.sort((a, b) => {
    if (a.meetsAlgorithmTarget && !b.meetsAlgorithmTarget) return -1;
    if (!a.meetsAlgorithmTarget && b.meetsAlgorithmTarget) return 1;
    return b.similarityScore - a.similarityScore;
  });

  return scored.slice(0, limit).map((s) => ({
    ...s.listing,
    _similarityScore: s.similarityScore,
    _matchPercentage: s.matchPercentage,
    _meetsTarget: s.meetsAlgorithmTarget,
    _metrics: s.metrics,
    _matchReasons: s.reasons
  }));
}

// ---------------- Realtorlar və Avtomatik Aylıq Sıralama (Ranking) Alqoritmi ----------------

/**
 * Hər ay realtorların bağladıqları aktiv satışlar, elan sayları və istifadəçi rəylərinə
 * əsasən avtomatik xal hesablayan alqoritm.
 * 1-ci, 2-ci, 3-cü yerləri müəyyən edib profilə qızıl, gümüş, bürünc nişanlar təyin edir.
 */
export function calculateRealtorScore(realtor, db = getDb()) {
  const realtorId = String(realtor.id);
  const activeListings = db.listings.filter(
    (l) => (String(l.owner_id) === realtorId || String(l.user_id) === realtorId) && l.status === "active"
  );
  const realtorReviews = (db.reviews || []).filter((r) => String(r.realtor_id) === realtorId);

  const salesCount = Number(realtor.sales_count || 0);
  const listingsCount = activeListings.length;
  const rating = Number(realtor.rating || 5.0);
  const reviewsCount = realtorReviews.length;
  const speedDays = Number(realtor.sales_speed_days || 10);

  // Bal formulu:
  // Satışlar (40 bal), Elanlar (15 bal), Reytinq (20 bal), Rəy sayı (5 bal), Satış sürəti bonusu
  const speedBonus = speedDays <= 7 ? 40 : speedDays <= 12 ? 25 : 10;
  const totalScore = Math.round(
    salesCount * 40 + listingsCount * 15 + (rating / 5) * 100 + reviewsCount * 5 + speedBonus
  );

  return {
    totalScore,
    salesCount,
    listingsCount,
    rating,
    reviewsCount,
    speedDays,
    speedBonus
  };
}

export function runMonthlyRealtorRankingCalculation() {
  const db = getDb();
  let realtors = db.users.filter((u) => u.role === "realtor" || u.is_approved_realtor);

  // Hər rieltor üçün performansı hesabla
  const evaluated = realtors.map((r) => {
    const scoreData = calculateRealtorScore(r, db);
    return {
      realtor: r,
      ...scoreData
    };
  });

  // Bala görə azalan sıra ilə düz
  evaluated.sort((a, b) => b.totalScore - a.totalScore);

  const currentMonthKey = new Date().toISOString().slice(0, 7); // Məs: "2026-09"

  evaluated.forEach((item, index) => {
    const rank = index + 1;
    let award = null;

    if (rank === 1) {
      award = {
        rank: 1,
        title: "Ayın Satış Çempionu",
        badge: "🥇 Qızıl Tac",
        icon: "👑",
        color: "from-amber-400 to-yellow-600",
        perks: "Top vitrin mövqeyi, 0% komissiya endirimi, rəsmi sertifikat",
        awarded_month: currentMonthKey
      };
    } else if (rank === 2) {
      award = {
        rank: 2,
        title: "Gümüş Ulduz",
        badge: "🥈 Gümüş Tac",
        icon: "⭐",
        color: "from-slate-300 to-slate-500",
        perks: "Axtarışda irəli sıralama, Pro Agent statusu",
        awarded_month: currentMonthKey
      };
    } else if (rank === 3) {
      award = {
        rank: 3,
        title: "Bürünc Ulduz",
        badge: "🥉 Bürünc Tac",
        icon: "🏆",
        color: "from-amber-600 to-amber-800",
        perks: "Təsdiqlənmiş etibarlı tərəfdaş nişanı",
        awarded_month: currentMonthKey
      };
    }

    // Profil məlumatlarını bazada yeniləyirik
    item.realtor.monthly_rank = rank;
    item.realtor.monthly_score = item.totalScore;
    item.realtor.award = award;
  });

  if (!db.realtor_ranking_history) db.realtor_ranking_history = {};
  db.realtor_ranking_history[currentMonthKey] = evaluated.map((e) => ({
    realtor_id: e.realtor.id,
    name: e.realtor.full_name,
    agency: e.realtor.agency_name,
    rank: e.realtor.monthly_rank,
    score: e.totalScore,
    award: e.realtor.award
  }));

  saveDb(db);
  return evaluated.map((e) => ({
    ...e.realtor,
    score_breakdown: {
      totalScore: e.totalScore,
      salesCount: e.salesCount,
      listingsCount: e.listingsCount,
      rating: e.rating,
      speedDays: e.speedDays
    }
  }));
}

export function getRankedRealtors(sortBy = "rating") {
  const db = getDb();
  let realtors = db.users.filter((u) => u.role === "realtor" || u.is_approved_realtor);

  // Əgər sıralama hesablanmayıbsa, avtomatik hesabla
  if (!realtors.some((r) => r.monthly_score)) {
    return runMonthlyRealtorRankingCalculation();
  }

  if (sortBy === "sales") {
    realtors.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
  } else if (sortBy === "speed") {
    realtors.sort((a, b) => (a.sales_speed_days || 99) - (b.sales_speed_days || 99));
  } else if (sortBy === "score") {
    realtors.sort((a, b) => (b.monthly_score || 0) - (a.monthly_score || 0));
  } else {
    realtors.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.sales_count || 0) - (a.sales_count || 0));
  }

  return realtors.map((r, index) => ({
    ...r,
    monthly_rank: r.monthly_rank || index + 1
  }));
}

// ---------------- Realtor Qeydiyyatı Backend Funksiyası ----------------

export function registerRealtorDirect({
  email,
  password,
  fullName,
  phone,
  agencyName,
  commissionRate,
  legalStatus,
  bio,
  avatarUrl,
  licenseNumber
}) {
  const db = getDb();
  const cleanEmail = (email || "").toLowerCase().trim();
  const existing = db.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
  if (existing) {
    throw new Error("Bu email ünvanı ilə artıq istifadəçi qeydiyyatdan keçib.");
  }

  const userId = `r-${Date.now()}`;
  const newRealtor = {
    id: userId,
    email: cleanEmail,
    password: password || "password123",
    full_name: fullName || "Yeni Rieltor",
    phone: phone || "+994 50 000 00 00",
    role: "realtor",
    agency_name: agencyName || "Fərdi Daşınmaz Əmlak Mütəxəssisi",
    agency_address: "Bakı şəhəri",
    commission_rate: commissionRate ? (String(commissionRate).includes("%") ? commissionRate : `${commissionRate}%`) : "1.5%",
    legal_status: legalStatus || "VÖEN: Təsdiqlənmiş",
    license_number: licenseNumber || `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
    is_approved_realtor: true,
    is_approved: true,
    approval_status: "approved",
    rating: 5.0,
    sales_count: 0,
    satisfaction_rate: "100%",
    sales_speed_days: 10,
    reviews_count: 0,
    monthly_score: 100,
    bio: bio || "Peşəkar daşınmaz əmlak xidməti və təhlükəsiz alqı-satqı vasitəçiliyi.",
    avatar_url:
      avatarUrl ||
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString()
  };

  db.users.push(newRealtor);
  if (!db.realtors) db.realtors = [];
  db.realtors.push(newRealtor);

  saveDb(db);

  const { password: _, ...cleanRealtor } = newRealtor;
  return cleanRealtor;
}

// ---------------- İstifadəçi və Rieltor Profil Məlumatları ----------------

export function getUserOrRealtorProfile(userId) {
  const db = getDb();
  const user = db.users.find((u) => String(u.id) === String(userId));
  if (!user) return null;

  const { password: _, ...cleanUser } = user;

  // Əlaqə kanalları
  const phoneClean = (cleanUser.phone || "").replace(/[^0-9+]/g, "");
  const contactChannels = {
    phone: cleanUser.phone || "+994 12 400 00 00",
    whatsapp: phoneClean ? `https://wa.me/${phoneClean.replace("+", "")}` : null,
    telegram: cleanUser.telegram_handle ? `https://t.me/${cleanUser.telegram_handle}` : null,
    email: cleanUser.email
  };

  // Aktiv elan sayı
  const listingsCount = db.listings.filter(
    (l) => (String(l.owner_id) === String(userId) || String(l.user_id) === String(userId)) && l.status === "active"
  ).length;

  const reviews = (db.reviews || []).filter((r) => String(r.realtor_id) === String(userId));

  return {
    ...cleanUser,
    active_listings_count: listingsCount,
    reviews,
    contact_channels: contactChannels
  };
}

export function getUserListingsPaginated(userId, { page = 1, limit = 6, status = "active", type = "all" } = {}) {
  const db = getDb();
  let list = db.listings.filter(
    (l) => String(l.owner_id) === String(userId) || String(l.user_id) === String(userId)
  );

  if (status && status !== "all") {
    list = list.filter((l) => l.status === status);
  }

  if (type && type !== "all") {
    if (type === "rent") {
      list = list.filter((l) => l.transaction_type === "rent" || l.transaction_type === "daily");
    } else {
      list = list.filter((l) => l.transaction_type === type);
    }
  }

  // VIP elanlar həmişə ən öndə
  list.sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const total = list.length;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 6);
  const totalPages = Math.ceil(total / l) || 1;
  const startIndex = (p - 1) * l;
  const paginated = list.slice(startIndex, startIndex + l).map((item) => enrichListing(item, db));

  return {
    items: paginated,
    total,
    page: p,
    limit: l,
    totalPages
  };
}

// ---------------- Monetizasiya və VIP Boost Sistemi ----------------

export const VIP_PACKAGES = [
  {
    id: "vip-7",
    name: "7 Günlük Express VIP",
    days: 7,
    price: 15,
    currency: "AZN",
    description: "Təcili satış və ya kirayə üçün qısa müddətli önə çıxarma.",
    features: [
      "Axtarış nəticələrində ən üst sırada nümayiş",
      "Parlaq qızıl rəngli VIP nişanı və çərçivə",
      "3 dəfə daha çox zəng və baxış sayı"
    ]
  },
  {
    id: "vip-15",
    name: "15 Günlük Pro VIP",
    days: 15,
    price: 29,
    currency: "AZN",
    is_popular: true,
    description: "Ən çox seçilən paket. Elanınızı potensial alıcıların diqqət mərkəzində saxlayır.",
    features: [
      "15 gün boyunca axtarışın zirvəsində sabitlənmə",
      "Parlaq qızıl rəngli VIP nişanı",
      "MÜLKERA sosial media kanallarında paylaşım",
      "5 dəfə daha sürətli satış tempi"
    ]
  },
  {
    id: "vip-30",
    name: "30 Günlük Super VIP Vitrin",
    days: 30,
    price: 49,
    currency: "AZN",
    description: "Lüks mənzillər və villalar üçün maksimum görünürlük paketi.",
    features: [
      "Ana səhifə və bütün kateqoriyalarda vitrin mövqeyi",
      "30 gün davam edən prioritet nümayiş",
      "Həftəlik maraqlanan alıcılara tövsiyə bildirişi",
      "Şəxsi daşınmaz əmlak meneceri dəstəyi"
    ]
  }
];

export const REALTOR_PACKAGES = [
  {
    id: "realtor-basic",
    name: "Başlanğıc Rieltor",
    price: 39,
    currency: "AZN",
    duration: "1 ay",
    listings_limit: 15,
    features: [
      "15 aktiv elan yerləşdirmə",
      "Standart profil səhifəsi",
      "Aylıq reytinqə daxil olma"
    ]
  },
  {
    id: "realtor-pro",
    name: "Pro Rieltor",
    price: 89,
    currency: "AZN",
    duration: "1 ay",
    is_popular: true,
    listings_limit: 50,
    features: [
      "50 aktiv elan",
      "Rəsmi 'VÖEN Təsdiqli' nişanı",
      "Hər ay 3 pulsuz VIP Boost",
      "Prioritet zəng və çat yönləndirməsi"
    ]
  },
  {
    id: "realtor-agency",
    name: "Premium Agentlik",
    price: 199,
    currency: "AZN",
    duration: "1 ay",
    listings_limit: 200,
    features: [
      "Limitsiz elan və agent heyəti",
      "Brend profil və xüsusi loqo vitrini",
      "Hər ay 10 VIP Boost və PK Arenası girişi",
      "Şəxsi menecer və API inteqrasiyası"
    ]
  }
];

export function applyListingBoost(listingId, { packageId = "vip-7", paymentMethod = "card", cardholderName, currency = "AZN" } = {}) {
  const db = getDb();
  const listing = db.listings.find((l) => String(l.id) === String(listingId));
  if (!listing) return null;

  const pkg = VIP_PACKAGES.find((p) => p.id === packageId) || VIP_PACKAGES[0];
  const now = new Date();
  const expireDate = new Date();
  expireDate.setDate(now.getDate() + pkg.days);

  // VIP statusunu tətbiq et
  listing.is_vip = true;
  listing.vip_package = pkg.id;
  listing.vip_started_at = now.toISOString();
  listing.vip_expires_at = expireDate.toISOString();
  listing.boost_count = (listing.boost_count || 0) + 1;

  // Stripe / Birbank / PayTr ödəniş simulyasiyası və qeydiyyatı
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const paymentRecord = {
    id: transactionId,
    listing_id: Number(listing.id),
    listing_title: listing.title_az,
    package_id: pkg.id,
    package_name: pkg.name,
    amount: pkg.price,
    currency: pkg.currency || currency,
    payment_method: paymentMethod,
    cardholder_name: cardholderName || "Kart Sahibi",
    status: "succeeded",
    auth_code: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
    created_at: now.toISOString(),
    expires_at: expireDate.toISOString()
  };

  if (!db.vip_promotions) db.vip_promotions = [];
  db.vip_promotions.unshift(paymentRecord);

  if (!db.payments) db.payments = [];
  db.payments.unshift(paymentRecord);

  saveDb(db);

  return {
    success: true,
    message: `Elan uğurla ${pkg.name} ilə VIP statusuna yüksəldildi!`,
    transaction: paymentRecord,
    listing: enrichListing(listing, db)
  };
}

export function applyVipPackage(listingId, packageId = "vip-7", paymentMethod = "card") {
  return applyListingBoost(listingId, { packageId, paymentMethod });
}

// ---------------- Canlı Yayım və PK Sistemi (WebRTC / Streaming) ----------------

export function startLiveStreamSession({
  hostId,
  title,
  description,
  isPk = true,
  rivalId,
  leftPropertyId,
  rightPropertyId
}) {
  const db = getDb();
  const host = db.users.find((u) => String(u.id) === String(hostId)) || db.users[1];
  const rival = rivalId
    ? db.users.find((u) => String(u.id) === String(rivalId))
    : db.users.find((u) => u.role === "realtor" && String(u.id) !== String(host?.id)) || db.users[2];

  const leftProp = leftPropertyId
    ? db.listings.find((l) => String(l.id) === String(leftPropertyId))
    : db.listings[0];
  const rightProp = rightPropertyId
    ? db.listings.find((l) => String(l.id) === String(rightPropertyId))
    : db.listings[1];

  const streamId = `live-${Date.now()}`;
  const roomName = `mulkera-room-${streamId}`;

  // WebRTC / LiveKit / Agora token və server konfiqurasiyası
  const webrtcSession = {
    room_name: roomName,
    server_url: "wss://webrtc.mulkera.az/live",
    channel_name: `channel_${streamId}`,
    token: `wrtc_tok_${Math.random().toString(36).substring(2, 14)}_${Date.now()}`,
    ice_servers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
    ],
    codec: "VP8",
    bitrate_kbps: 2500
  };

  const newStream = {
    id: streamId,
    title: title || "Canlı Əmlak Təqdimatı & PK Arenası",
    description: description || "İki peşəkar rieltorun canlı efirdə virtual mənzil döyüşü.",
    is_pk: Boolean(isPk),
    status: "live",
    viewers_count: 12,
    time_left_seconds: 900,
    created_at: new Date().toISOString(),
    webrtc: webrtcSession,
    left_realtor: {
      id: host?.id || "r1",
      name: host?.full_name || "Ramil Şirinov",
      agency: host?.agency_name || "MÜLKERA Premium",
      avatar: host?.avatar_url || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
      score: 1200,
      property: {
        listing_id: leftProp?.id || 1,
        title: leftProp?.title_az || "Ağ Şəhər Bulvarı 4 Otaqlı Lüks",
        price: leftProp?.price ? `${leftProp.price.toLocaleString()} AZN` : "490,000 AZN",
        image: leftProp?.listing_photos?.[0]?.url || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000"
      }
    },
    right_realtor: isPk
      ? {
          id: rival?.id || "r2",
          name: rival?.full_name || "Elmir Məmmədov",
          agency: rival?.agency_name || "Bakı Əmlak Mərkəzi",
          avatar: rival?.avatar_url || "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
          score: 1100,
          property: {
            listing_id: rightProp?.id || 2,
            title: rightProp?.title_az || "Nəsimi r. 3 Otaqlı Modern Mənzil",
            price: rightProp?.price ? `${rightProp.price.toLocaleString()} AZN` : "245,000 AZN",
            image: rightProp?.listing_photos?.[0]?.url || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000"
          }
        }
      : null,
    comments: [
      { id: 1, user: "Mülkera Bot", text: "Canlı yayım və PK döyüşü aktivdir! Rieltorlarınıza hədiyyə göndərərək xal qazandırın.", time: "İndicə" }
    ],
    gifts_received: []
  };

  if (!db.live_streams) db.live_streams = [];
  db.live_streams.unshift(newStream);
  saveDb(db);

  return newStream;
}

export function joinLiveStreamSession(streamId, { participantId, participantName, role = "viewer" } = {}) {
  const db = getDb();
  const stream = (db.live_streams || []).find((s) => String(s.id) === String(streamId));
  if (!stream) return null;

  stream.viewers_count = (stream.viewers_count || 0) + 1;
  saveDb(db);

  const participantToken = `tok_p_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

  return {
    stream,
    session: {
      stream_id: stream.id,
      participant_id: participantId || `guest-${Date.now()}`,
      participant_name: participantName || "İzləyici",
      role,
      token: participantToken,
      ice_servers: stream.webrtc?.ice_servers || [
        { urls: ["stun:stun.l.google.com:19302"] }
      ]
    }
  };
}

export function sendGiftToStream(streamId, { giftType, senderName, targetSide = "left" }) {
  const db = getDb();
  const stream = (db.live_streams || []).find((s) => String(s.id) === String(streamId));
  if (!stream) return null;

  const GIFT_VALUES = {
    coffee: { name: "Qəhvə", icon: "☕", value: 2, points: 20 },
    key: { name: "Qızıl Açar", icon: "🔑", value: 5, points: 50 },
    villa: { name: "Lüks Villa", icon: "🏠", value: 20, points: 200 },
    diamond: { name: "Brilliant", icon: "💎", value: 50, points: 500 },
    crown: { name: "Mülkera Tacı", icon: "👑", value: 100, points: 1000 }
  };

  const giftInfo = GIFT_VALUES[giftType] || GIFT_VALUES.key;
  const newGift = {
    id: `g-${Date.now()}`,
    type: giftType,
    name: giftInfo.name,
    icon: giftInfo.icon,
    value: giftInfo.value,
    points: giftInfo.points,
    sender: senderName || "İzləyici",
    side: targetSide,
    created_at: new Date().toISOString()
  };

  if (!stream.gifts_received) stream.gifts_received = [];
  stream.gifts_received.unshift(newGift);

  if (stream.is_pk) {
    if (targetSide === "left" && stream.left_realtor) {
      stream.left_realtor.score = (stream.left_realtor.score || 0) + giftInfo.points;
    } else if (targetSide === "right" && stream.right_realtor) {
      stream.right_realtor.score = (stream.right_realtor.score || 0) + giftInfo.points;
    }
  }

  saveDb(db);

  const leftScore = stream.left_realtor?.score || 1000;
  const rightScore = stream.right_realtor?.score || 1000;
  const total = leftScore + rightScore || 2000;
  const leftPct = Math.round((leftScore / total) * 100);
  const rightPct = 100 - leftPct;

  return {
    stream,
    gift: newGift,
    battleBar: {
      leftScore,
      rightScore,
      leftPct,
      rightPct
    }
  };
}

export function addStreamComment(streamId, { senderName, text }) {
  const db = getDb();
  const stream = (db.live_streams || []).find((s) => String(s.id) === String(streamId));
  if (!stream) return null;

  const newComment = {
    id: Date.now(),
    user: senderName || "Qonaq",
    text,
    time: "İndicə"
  };

  if (!stream.comments) stream.comments = [];
  stream.comments.push(newComment);
  saveDb(db);
  return newComment;
}

export function votePkStream(streamId, side) {
  const db = getDb();
  const stream = (db.live_streams || []).find((s) => String(s.id) === String(streamId));
  if (!stream || !stream.is_pk) return null;

  if (side === "left" && stream.left_realtor) {
    stream.left_realtor.score = (stream.left_realtor.score || 0) + 15;
  } else if (side === "right" && stream.right_realtor) {
    stream.right_realtor.score = (stream.right_realtor.score || 0) + 15;
  }

  saveDb(db);
  return stream;
}

export function getLiveStreams() {
  const db = getDb();
  return db.live_streams || [];
}

export function getLiveStreamById(id) {
  const db = getDb();
  return (db.live_streams || []).find((s) => String(s.id) === String(id)) || null;
}

export function createLiveStream(payload) {
  return startLiveStreamSession(payload);
}


