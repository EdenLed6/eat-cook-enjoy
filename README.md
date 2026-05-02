# eat-cook-enjoy

עוזרת אישית לתזונה ופעילות גופנית בוואצאפ + דאשבורד אישי. עברית, RTL, חד-משתמשת.

## מה יש כאן

- **WhatsApp worker** (Baileys) שמחובר לוואצאפ האישי דרך QR.
- **Agent loop** מבוסס Claude Sonnet 4.6 עם כלים: log_meal / log_meal_from_photo / log_weight / log_water / log_workout / log_steps_manual / log_wolt_order / suggest_meal / search_recipes / remember / set_reminder / update_profile / compute_calorie_target / get_today_summary / get_progress.
- **זיהוי אוכל מתמונה** עם Claude Vision.
- **שאלון אונבורדינג** דטרמיניסטי בן 15 שאלות, ובחירת שיטה תזונתית מבוססת מחקר (ים-תיכוני / 16:8 / קליסטניקס / קיטו) עם safety-screen.
- **דאשבורד Next.js 15** ב-RTL עם Recharts: היום / התקדמות / ארוחות / אימונים / הגדרות / ניהול-וואצאפ.
- **Cron jobs**: צ׳ק-אין בוקר, תזכורות מים, סיכום יומי + GIF.
- **API steps** עם HMAC לאפליקציית companion עתידית של Health Connect.

## עלות חודשית משוערת
- Fly.io VM (shared 1vCPU 512MB): ~$3.20
- Supabase (free tier — Postgres + Storage + Auth): $0
- Tavily (1000 חיפושים חינם): $0
- Anthropic API (~50 הודעות/יום): ~$2-4

**סה"כ: ~$5-7/חודש (~₪20-28).**

## דרישות מקדימות
- Node 20+
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- חשבון Fly.io
- חשבון Supabase (Postgres + Storage + Auth — הכל בחבילה אחת)
- מפתח Anthropic
- מפתח Tavily (אופציונלי)

## התקנה מקומית

```bash
pnpm install
cp .env.example .env  # מלאי את כל הערכים מ-Supabase Dashboard → Project Settings → API
pnpm dev:worker        # מריץ את הוואצאפ-worker
# בטרמינל אחר:
pnpm dev:web           # מריץ את הדאשבורד ב-http://localhost:3000
```

הסכמה כבר קיימת ב-Supabase (נוצרה דרך MCP migrations). אם צריך לשנות אותה — `pnpm db:generate` ואז `pnpm db:push`.

בפעם הראשונה ה-worker ידפיס QR ל-`/admin/wa` ול-stdout. סרקי ב-WhatsApp → Linked Devices.

## Deploy ל-Fly

### פעם ראשונה (ידנית)

```bash
fly auth login
fly launch --no-deploy           # ייצור fly app מהקונפיג
fly secrets set \
  DATABASE_URL="postgresql://postgres.{ref}:{password}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres" \
  SUPABASE_URL="https://lgrfaijexfotubdylxky.supabase.co" \
  SUPABASE_ANON_KEY="eyJ..." \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  SUPABASE_STORAGE_BUCKET="eat-cook-enjoy" \
  ANTHROPIC_API_KEY="sk-ant-..." \
  ANTHROPIC_MODEL_DEFAULT="claude-sonnet-4-6" \
  ANTHROPIC_MODEL_HEAVY="claude-opus-4-7" \
  OWNER_PHONE_E164="972501234567" \
  TAVILY_API_KEY="tvly-..." \
  APP_URL="https://eat-cook-enjoy.fly.dev" \
  DASHBOARD_OWNER_EMAIL="eden@example.com" \
  STEPS_HMAC_SECRET="$(openssl rand -hex 32)"
fly deploy
```

### Auto-deploy מ-GitHub
מוגדר ב-`.github/workflows/fly-deploy.yml`. צרי טוקן ב-Fly:
```bash
fly tokens create org personal
```
והוסיפי אותו כ-secret בשם `FLY_API_TOKEN` ב-GitHub Settings → Secrets.

### אחרי deploy
1. ב-Supabase Dashboard → Authentication → URL Configuration → הוסיפי `https://eat-cook-enjoy.fly.dev/auth/callback` ל-Redirect URLs.
2. גשי ל-`https://eat-cook-enjoy.fly.dev/login` → קבלי קישור התחברות במייל (Supabase שולח אותו אוטומטית).
3. אחרי login: `/admin/wa` → סרקי QR ב-WhatsApp → Linked Devices.

## פאזות

- ✅ פאזה 0–6: Scaffold, Baileys, Onboarding, ארוחות, תזכורות, דאשבורד, זיכרון.
- ⏳ פאזה 7: Tavily search מקושר (כלים מוגדרים, צריך מפתח).
- ⏳ פאזה 8: Kotlin companion app להעברת ספירת צעדים מ-Health Connect.
- ⏳ פאזה 9: Whisper להודעות קוליות, סקירה שבועית עם Opus, pgvector לזיכרון ארוך.

## בדיקות

```bash
pnpm -r test       # vitest על packages/nutrition
pnpm typecheck     # tsc על כל ה-workspaces
```

## ארכיטקטורה

```
WhatsApp ↔ Baileys worker ─┐
                            ├─→ Supabase Postgres
Dashboard (Next.js) ───────┘
         ↑                       ↑
         └──── Supabase Auth ────┘  (magic link OTP)

Worker → Anthropic API (Claude Sonnet 4.6 / Vision)
Worker → Tavily (web search)
Worker → Supabase Storage (תמונות + GIFים)
Companion App → /api/steps (HMAC)
```

## שאלות?

הקוד מאורגן כ-monorepo לפי מודולים:
- `packages/shared` – טיפוסים ומחרוזות עברית
- `packages/db` – Drizzle schema + client
- `packages/nutrition` – חישובים (Mifflin, diet-selector, safety, MET)
- `packages/vision` – Claude Vision wrapper לאוכל
- `packages/agent-core` – Agent loop, tools, prompts, memory loader
- `apps/whatsapp-worker` – Baileys + cron jobs
- `apps/web` – Next.js dashboard
