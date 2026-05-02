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
- Neon Postgres (free tier): $0
- Cloudflare R2 (10GB free): $0
- Tavily (1000 חיפושים חינם): $0
- Resend (3000 מיילים חינם): $0
- Anthropic API (~50 הודעות/יום): ~$2-4

**סה"כ: ~$5-7/חודש (~₪20-28).**

## דרישות מקדימות
- Node 20+
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- חשבון Fly.io
- חשבון Neon (Postgres)
- חשבון Cloudflare (R2 bucket)
- מפתח Anthropic
- מפתח Tavily
- מפתח Resend (אופציונלי, רק אם רוצים מייל magic link)

## התקנה מקומית

```bash
pnpm install
cp .env.example .env  # מלאי את כל הערכים
pnpm db:push           # יוצר את הסכמה ב-Neon
pnpm dev:worker        # מריץ את הוואצאפ-worker
# בטרמינל אחר:
pnpm dev:web           # מריץ את הדאשבורד ב-http://localhost:3000
```

בפעם הראשונה ה-worker ידפיס QR ל-`/admin/wa` ול-stdout. סרקי ב-WhatsApp → Linked Devices.

## Deploy ל-Fly

```bash
fly launch --no-deploy           # ייצור fly app מהקונפיג
fly secrets set DATABASE_URL=... ANTHROPIC_API_KEY=... OWNER_PHONE_E164=... \
                R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
                R2_BUCKET=eat-cook-enjoy R2_PUBLIC_URL=... \
                TAVILY_API_KEY=... RESEND_API_KEY=... RESEND_FROM_EMAIL=... \
                APP_URL=https://eat-cook-enjoy.fly.dev DASHBOARD_OWNER_EMAIL=... \
                STEPS_HMAC_SECRET=...
fly deploy
```

לאחר deploy, גשי ל-`/admin/wa` (אחרי login עם magic link) → סרקי QR.

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
                            ├─→ Postgres (Neon)
Dashboard (Next.js) ───────┘
         ↑                       ↑
         └──── Magic link auth ──┘
                            
Worker → Anthropic API (Claude Sonnet 4.6 / Vision)
Worker → Tavily (web search)
Worker → R2 (תמונות + GIFים)
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
