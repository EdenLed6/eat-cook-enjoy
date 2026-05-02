import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  date,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneE164: text('phone_e164').notNull().unique(),
  displayName: text('display_name'),
  email: text('email'),
  locale: text('locale').default('he').notNull(),
  timezone: text('timezone').default('Asia/Jerusalem').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  age: integer('age'),
  sex: text('sex').default('female'),
  heightCm: numeric('height_cm', { precision: 5, scale: 1 }),
  weightStartKg: numeric('weight_start_kg', { precision: 5, scale: 1 }),
  weightGoalKg: numeric('weight_goal_kg', { precision: 5, scale: 1 }),
  goalDate: date('goal_date'),
  activityLevel: text('activity_level'),
  dietMethod: text('diet_method'),
  fastingWindow: jsonb('fasting_window'),
  dailyCalorieTarget: integer('daily_calorie_target'),
  proteinTargetG: integer('protein_target_g'),
  carbsTargetG: integer('carbs_target_g'),
  fatTargetG: integer('fat_target_g'),
  dailyWaterMl: integer('daily_water_ml').default(2500),
  dailyStepsTarget: integer('daily_steps_target').default(8000),
  cuisinePrefs: text('cuisine_prefs').array(),
  dislikes: text('dislikes').array(),
  allergies: text('allergies').array(),
  kosher: boolean('kosher').default(false),
  medicalFlags: jsonb('medical_flags').default(sql`'{}'::jsonb`),
  injuries: text('injuries'),
  dailyActivityMinutes: integer('daily_activity_minutes'),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const meals = pgTable(
  'meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull(),
    source: text('source').notNull(),
    description: text('description'),
    items: jsonb('items').notNull(),
    totalKcal: integer('total_kcal').notNull(),
    proteinG: numeric('protein_g', { precision: 6, scale: 1 }),
    carbsG: numeric('carbs_g', { precision: 6, scale: 1 }),
    fatG: numeric('fat_g', { precision: 6, scale: 1 }),
    photoR2Key: text('photo_r2_key'),
    visionConfidence: numeric('vision_confidence', { precision: 3, scale: 2 }),
    userCorrected: boolean('user_corrected').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    consumedIdx: index('meals_user_consumed_idx').on(t.userId, t.consumedAt.desc()),
  }),
);

export const weights = pgTable(
  'weights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    measuredOn: date('measured_on').notNull(),
    weightKg: numeric('weight_kg', { precision: 5, scale: 1 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userDateUq: uniqueIndex('weights_user_date_uq').on(t.userId, t.measuredOn),
    measuredIdx: index('weights_user_measured_idx').on(t.userId, t.measuredOn.desc()),
  }),
);

export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  type: text('type').notNull(),
  durationMin: integer('duration_min').notNull(),
  intensity: text('intensity'),
  estKcalBurned: integer('est_kcal_burned'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const waterLog = pgTable('water_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  loggedAt: timestamp('logged_at', { withTimezone: true }).notNull(),
  amountMl: integer('amount_ml').notNull(),
});

export const stepsDaily = pgTable(
  'steps_daily',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    onDate: date('on_date').notNull(),
    steps: integer('steps').notNull(),
    source: text('source').default('manual').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.onDate] }),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    direction: text('direction').notNull(),
    channel: text('channel').default('whatsapp').notNull(),
    waMessageId: text('wa_message_id'),
    contentType: text('content_type').notNull(),
    text: text('text'),
    mediaR2Key: text('media_r2_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userCreatedIdx: index('messages_user_created_idx').on(t.userId, t.createdAt.desc()),
  }),
);

export const conversationMemory = pgTable('conversation_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  kind: text('kind').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  kind: text('kind').notNull(),
  cron: text('cron').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  lastFiredAt: timestamp('last_fired_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const baileysAuth = pgTable(
  'baileys_auth',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);

export const onboardingState = pgTable('onboarding_state', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  step: text('step').notNull(),
  answers: jsonb('answers').default(sql`'{}'::jsonb`).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const authMagicLinks = pgTable('auth_magic_links', {
  token: text('token').primaryKey(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type Weight = typeof weights.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WaterLog = typeof waterLog.$inferSelect;
export type StepsDaily = typeof stepsDaily.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ConversationMemory = typeof conversationMemory.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type OnboardingState = typeof onboardingState.$inferSelect;
