# MÜLKERA — Quraşdırma Təlimatı

Bu layihə Next.js (App Router), Supabase (verilənlər bazası + autentifikasiya) və
LiveKit (canlı yayım / PK Arena üçün real WebRTC video) üzərində qurulub.

## 1. Asılılıqları quraşdırın

```bash
npm install
```

Bu, `livekit-client` və `livekit-server-sdk` paketlərini də əlavə edəcək (canlı video üçün).

## 2. Supabase layihəsi yaradın

1. https://supabase.com saytında yeni layihə yaradın.
2. **SQL Editor**-a keçin, `supabase/schema.sql` faylının tam məzmununu yapışdırıb çalışdırın.
   Bu, aşağıdakıları yaradır:
   - `profiles`, `listings`, `listing_photos`, `categories`, `districts`, `favorites`, `reports`, `realtor_reviews`
   - `realtor_monthly_stats` — aylıq rieltor reytinqi
   - `live_streams`, `pk_matches`, `live_gifts`, `live_comments`, `live_participants` — canlı yayım və PK sistemi
   - Hədiyyə göndəriləndə PK xalını avtomatik artıran trigger
   - Bütün cədvəllər üçün Realtime abunəliyi və RLS siyasətləri
3. **Storage** bölməsində `listings` adlı **public** bucket yaradın (şəkil/video yükləmək üçün).
4. **Project Settings → API** bölməsindən aşağıdakıları kopyalayın:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` açarı → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` açarı → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ yalnız serverdə, heç vaxt client koduna əlavə etməyin)

## 3. LiveKit hesabı yaradın (canlı video üçün)

1. https://cloud.livekit.io saytında pulsuz hesab açın (yaxud öz LiveKit serverinizi qaldırın).
2. Yeni layihə yaradın, **Settings → Keys** bölməsindən API Key/Secret alın.
3. Layihənin WebSocket ünvanını (`wss://...livekit.cloud`) kopyalayın.

> LiveKit konfiqurasiya edilməyibsə sayt yenə də işləyəcək, sadəcə canlı yayım
> panelində real video əvəzinə statik şəkil göstəriləcək (`/api/live/token`
> 503 status qaytarır, frontend bunu səssizcə tutur).

## 4. `.env` faylını doldurun

`.env.example` faylını `.env.local` adı ilə kopyalayın və doldurun:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxx
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

## 5. Yerli işə salın

```bash
npm run dev
```

`http://localhost:3000` ünvanında açılacaq.

## 6. Giriş / Qeydiyyat

- `/register` səhifəsindən real hesab yaradıla bilər — email təsdiqi baypas edilib
  (`email_confirm: true`), yəni qeydiyyatdan dərhal sonra avtomatik daxil olunur.
- `/login` səhifəsindəki **Admin / Rieltor / Müştəri** düymələri 1 kliklə demo
  hesablara daxil olur — bu hesablar Supabase-də ilk çağırışda avtomatik yaradılır
  (`admin@mulkera.az`, `realtor@mulkera.az`, `customer@mulkera.az`, şifrə: `Mulkera2026!`).

## 7. Canlı Yayım və PK Arenası necə işləyir

- `/live` səhifəsində "Canlı Yayım Başlat" düyməsi `live_streams` (+ PK rejimindədirsə
  `pk_matches`) sətri yaradır və unikal LiveKit otağı (`room_name`) açır.
- Yayımı açan istifadəçi avtomatik **host** kimi (sol tərəf), `rival_id`-i uyğun gələn
  istifadəçi isə **rəqib** kimi (sağ tərəf) kameranı/mikrofonu ilə otağa qoşulur və
  real video yayımlayır; digər bütün istifadəçilər izləyici kimi yalnız izləyir.
- İzləyicinin göndərdiyi hər hədiyyə `live_gifts` cədvəlinə yazılır; verilənlər bazası
  trigger-i avtomatik olaraq `live_streams.left_score/right_score` və müvafiq
  `pk_matches` xalını artırır — bütün izləyicilərə Supabase Realtime vasitəsilə
  anında ötürülür.
- `/api/live/pk` (POST) matçı bitirir, qalibi müəyyən edir və qalib rieltorun
  `realtor_monthly_stats.pk_wins` / `pk_points` xalını yeniləyir.

## 8. GitHub-a push

```bash
git init
git add .
git commit -m "MÜLKERA: real Supabase backend + LiveKit canlı yayım/PK sistemi"
git branch -M main
git remote add origin <repo-url>
git push -u origin main
```

⚠️ `.env.local` faylını **heç vaxt** commit etməyin — `.gitignore` artıq onu istisna edir.

## 9. Fayl xəritəsi (yeni/dəyişdirilmiş əsas fayllar)

```
supabase/schema.sql              ← tam SQL sxemi (profiles, listings, live/PK cədvəlləri)
lib/livekit.js                   ← server-side LiveKit token/otaq köməkçisi
lib/liveStreams.js               ← client tərəfdən canlı yayım/PK/hədiyyə/realtime funksiyaları
lib/backend/liveEnrich.js        ← Supabase sətirlərini UI formatına zənginləşdirir
lib/supabaseServer.js            ← + isSupabaseConfigured() köməkçisi
app/api/live/start/route.js      ← real Supabase + LiveKit otağı yaradır
app/api/live/join/route.js       ← real qoşulma / izləyici sayğacı
app/api/live/gift/route.js       ← real hədiyyə → PK xalı (DB trigger)
app/api/live/pk/route.js         ← (yeni) PK matçını bitirir, qalibi qeyd edir
app/api/live/token/route.js      ← (yeni) LiveKit JWT tokeni verir
app/api/auth/register/route.js   ← real Supabase Auth qeydiyyatı, email təsdiqi baypas
app/api/auth/login/route.js      ← real Supabase Auth girişi + demo hesab avtomatik yaradılması
app/api/auth/me/route.js         ← real sessiyanı yoxlayır
app/api/auth/logout/route.js     ← real Supabase sessiyasını bağlayır
app/live/page.js                 ← real LiveKit video inteqrasiyası (sol/sağ panellər)
```

Qalan bütün səhifələr (elanlar, filtr, xəritə, favoritlər, profil, dark mode və s.)
artıq mövcud idi və `lib/listings.js`, `lib/realtors.js` kimi fayllar vasitəsilə
avtomatik olaraq real Supabase-ə qoşulur (əvvəlcə Supabase-i sınayır, uğursuz olarsa
demo backend-ə keçir) — əlavə dəyişiklik tələb olunmadı.
