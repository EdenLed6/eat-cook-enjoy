function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  get OWNER_PHONE_E164() {
    return required('OWNER_PHONE_E164');
  },
  get DATABASE_URL() {
    return required('DATABASE_URL');
  },
  get ANTHROPIC_API_KEY() {
    return required('ANTHROPIC_API_KEY');
  },
  get TZ() {
    return process.env.TZ ?? 'Asia/Jerusalem';
  },
  get LOG_LEVEL() {
    return process.env.LOG_LEVEL ?? 'info';
  },
  get APP_URL() {
    return process.env.APP_URL ?? 'http://localhost:3000';
  },
};

export function ownerJid(): string {
  return `${env.OWNER_PHONE_E164}@s.whatsapp.net`;
}
