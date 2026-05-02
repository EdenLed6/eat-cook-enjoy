# eat-cook-enjoy

עוזרת אישית לתזונה ופעילות גופנית בוואצאפ + דאשבורד אישי. עברית, RTL.

## ארכיטקטורה

| | איפה רץ | תפקיד |
|---|---|---|
| **Worker** (Baileys) | המחשב המקומי שלך | מקבל הודעות וואצאפ, עונה |
| **Dashboard** (Next.js) | Vercel — auto-deploy מ-GitHub | סטטיסטיקות וניהול |
| **DB + Storage + Auth** | Supabase | נתונים |

## הפעלה יומיומית

במחשב, פעם בכל בוקר/כשמתחילים לעבוד:
```
pnpm worker
```
זהו. הבוט מאזין כל זמן שהפקודה רצה.

הדאשבורד נגיש 24/7 מהנייד דרך Vercel.

## התקנה ראשונית

### 1. במחשב — להתקין Node + pnpm
פתחי **PowerShell** והדביקי:
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```
סגרי וpתחי PowerShell חדש.

### 2. להוריד את הקוד
```powershell
git clone https://github.com/EdenLed6/eat-cook-enjoy.git
cd eat-cook-enjoy
git checkout claude/whatsapp-fitness-agent-9w6vc
pnpm install
```

### 3. לקנפג `.env`
```powershell
copy .env.example .env
notepad .env
```
מלאי את הערכים. רוב הערכים מ-Supabase Dashboard:
- `DATABASE_URL` — [Connect → Transaction pooler](https://supabase.com/dashboard/project/lgrfaijexfotubdylxky/?showConnect=true)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — [API Keys](https://supabase.com/dashboard/project/lgrfaijexfotubdylxky/settings/api-keys)
- `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com/settings/keys)
- `OWNER_PHONE_E164` — המספר שלך, פורמט `972XXXXXXXXX`
- `DASHBOARD_OWNER_EMAIL` — המייל שלך

### 4. להעלות את הדאשבורד ל-Vercel (פעם אחת)
1. [vercel.com/new](https://vercel.com/new) → Import → `EdenLed6/eat-cook-enjoy`
2. Branch: `claude/whatsapp-fitness-agent-9w6vc`
3. Environment Variables → "Paste .env" → הדביקי את כל התוכן של `.env` → Deploy
4. אחרי deploy ראשון — Vercel ייתן URL. עדכני ב-Vercel: `APP_URL=https://your-url.vercel.app`
5. ב-Supabase [Auth → URL Configuration](https://supabase.com/dashboard/project/lgrfaijexfotubdylxky/auth/url-configuration): הוסיפי `https://your-url.vercel.app/auth/callback` ל-Redirect URLs

### 5. הרצה ראשונה
במחשב:
```powershell
pnpm worker
```
ואז:
1. גשי מהנייד ל-`https://your-url.vercel.app/login` → קבלי קישור במייל → לחצי
2. גשי ל-`/admin/wa` → סרקי QR (WhatsApp בנייד → מכשירים מקושרים → קשר מכשיר)
3. שלחי לעצמך "היי" ב-וואצאפ — האונבורדינג יתחיל

מאותו רגע: בכל פעם שאת רוצה להפעיל את הבוט — `pnpm worker` במחשב. כשהמחשב סגור, הודעות מחכות בוואצאפ ומטופלות כשתפעילי שוב.

## עלות
- Vercel (Hobby): $0
- Supabase (Free tier): $0
- Anthropic API (~50 הודעות/יום): ~$2-4
- **סה"כ: $2-4/חודש**

## ארגון ה-monorepo
- `packages/shared` – טיפוסים ומחרוזות עברית
- `packages/db` – Drizzle schema + client
- `packages/nutrition` – חישובים (Mifflin, diet-selector, safety, MET)
- `packages/vision` – Claude Vision wrapper לאוכל
- `packages/agent-core` – Agent loop, tools, prompts, memory, Supabase Storage
- `apps/whatsapp-worker` – Baileys + cron jobs (רץ מקומית)
- `apps/web` – Next.js dashboard (רץ ב-Vercel)
