# eat-cook-enjoy

עוזרת אישית לתזונה ופעילות גופנית בוואצאפ + דאשבורד אישי. עברית, RTL, חד-משתמשת. רץ במחשב המקומי שלך.

## מה יש כאן

- **WhatsApp worker** (Baileys) שמחובר לוואצאפ האישי דרך QR.
- **Agent loop** מבוסס Claude Sonnet 4.6 עם כלים: log_meal / log_meal_from_photo / log_weight / log_water / log_workout / log_steps_manual / log_wolt_order / suggest_meal / search_recipes / remember / set_reminder / update_profile / compute_calorie_target / get_today_summary / get_progress.
- **זיהוי אוכל מתמונה** עם Claude Vision.
- **שאלון אונבורדינג** דטרמיניסטי בן 15 שאלות, ובחירת שיטה תזונתית מבוססת מחקר (ים-תיכוני / 16:8 / קליסטניקס / קיטו) עם safety-screen.
- **דאשבורד Next.js 15** ב-RTL עם Recharts: היום / התקדמות / ארוחות / אימונים / הגדרות / ניהול-וואצאפ.
- **Cron jobs**: צ׳ק-אין בוקר, תזכורות מים, סיכום יומי + GIF.
- **API steps** עם HMAC לאפליקציית companion עתידית של Health Connect.

## עלות חודשית
- Supabase (free tier — Postgres + Storage + Auth): $0
- Anthropic API (~50 הודעות/יום): ~$2-4
- Tavily (אופציונלי, 1000 חיפושים חינם): $0

**סה"כ: ~$2-4/חודש (~₪7-15).** הבוט רץ במחשב שלך — אין עלות שרת.

## דרישות מקדימות

- Node 20+ ו-pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- חשבון Supabase (כבר יש לך — project `lgrfaijexfotubdylxky`)
- מפתח Anthropic
- וואצאפ במחשב/בנייד (לסריקת QR)

## הפעלה

### פעם ראשונה

1. **קלון ה-repo והתקיני dependencies:**
   ```bash
   git clone https://github.com/EdenLed6/eat-cook-enjoy.git
   cd eat-cook-enjoy
   pnpm install
   ```

2. **צרי את `.env`:**
   ```bash
   cp .env.example .env
   ```
   פתחי ב-editor ומלאי את הערכים. רוב הערכים תקבלי מ-Supabase Dashboard:
   - `DATABASE_URL` → [Connect](https://supabase.com/dashboard/project/lgrfaijexfotubdylxky/?showConnect=true) → "Transaction pooler" (תצטרכי password מ-Settings → Database)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → [API Keys](https://supabase.com/dashboard/project/lgrfaijexfotubdylxky/settings/api-keys)
   - `ANTHROPIC_API_KEY` → [console.anthropic.com](https://console.anthropic.com/settings/keys)
   - `OWNER_PHONE_E164` → המספר שלך בפורמט `972XXXXXXXXX` (בלי + בלי רווחים)
   - `DASHBOARD_OWNER_EMAIL` → המייל שאיתו תתחברי לדאשבורד

3. **הוסיפי `http://localhost:3000/auth/callback` ל-Supabase Redirect URLs:**
   [Authentication → URL Configuration](https://supabase.com/dashboard/project/lgrfaijexfotubdylxky/auth/url-configuration) → "Redirect URLs" → Add → הדביקי.

4. **הריצי הכל:**
   ```bash
   pnpm dev
   ```
   זה מריץ במקביל את הדאשבורד (port 3000) ואת ה-worker.

5. **התחברות לוואצאפ (פעם אחת):**
   - גשי ל-[http://localhost:3000/login](http://localhost:3000/login) → קבלי קישור במייל מ-Supabase.
   - אחרי login → גשי ל-`/admin/wa` → תוצג תמונת QR.
   - בנייד: WhatsApp → הגדרות → מכשירים מקושרים → קשר מכשיר → סרקי.
   - הבוט מחובר. שלחי לעצמך "היי" כדי להתחיל אונבורדינג.

### בכל הפעלה רגילה

```bash
cd eat-cook-enjoy
pnpm dev
```

הסשן של וואצאפ נשמר ב-Supabase, אז אין צורך לסרוק QR שוב. כל זמן שהמחשב דולק והפקודה רצה — הבוט עובד. כשהמחשב נסגר, ההודעות מחכות ב-WhatsApp ויטופלו ברגע שתפעילי שוב.

## בדיקות

```bash
pnpm -r test       # vitest על packages/nutrition
pnpm typecheck     # tsc על כל ה-workspaces
```

## ארכיטקטורה

```
WhatsApp ↔ Baileys worker (במחשב המקומי) ─┐
                                          ├─→ Supabase Postgres
Dashboard Next.js (במחשב המקומי) ─────────┘
         ↑                                      ↑
         └──── Supabase Auth (magic link) ──────┘

Worker → Anthropic API (Claude Sonnet 4.6 / Vision)
Worker → Tavily (web search, אופציונלי)
Worker → Supabase Storage (תמונות + QR + GIFים)
```

## פאזות

- ✅ פאזה 0–6: Scaffold, Baileys, Onboarding, ארוחות, תזכורות, דאשבורד, זיכרון.
- ⏳ פאזה 7: Tavily search מקושר (כלים מוגדרים, צריך מפתח).
- ⏳ פאזה 8: Kotlin companion app להעברת ספירת צעדים מ-Health Connect.
- ⏳ פאזה 9: Whisper להודעות קוליות, סקירה שבועית עם Opus, pgvector לזיכרון ארוך.

## ארגון ה-monorepo

- `packages/shared` – טיפוסים ומחרוזות עברית
- `packages/db` – Drizzle schema + client
- `packages/nutrition` – חישובים (Mifflin, diet-selector, safety, MET)
- `packages/vision` – Claude Vision wrapper לאוכל
- `packages/agent-core` – Agent loop, tools, prompts, memory loader, Supabase Storage
- `apps/whatsapp-worker` – Baileys + cron jobs
- `apps/web` – Next.js dashboard
