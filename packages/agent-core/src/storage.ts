import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

let _r2: S3Client | null = null;

export function getR2(): S3Client {
  if (_r2) return _r2;
  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  _r2 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _r2;
}

const bucket = () => process.env.R2_BUCKET ?? 'eat-cook-enjoy';

export async function putR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const r2 = getR2();
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function fetchR2ToBase64(
  key: string,
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> {
  const r2 = getR2();
  const res = await r2.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const stream = res.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const buf = Buffer.concat(chunks);
  const ct = res.ContentType ?? 'image/jpeg';
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';
  if (ct.includes('png')) mediaType = 'image/png';
  else if (ct.includes('webp')) mediaType = 'image/webp';
  else if (ct.includes('gif')) mediaType = 'image/gif';
  return { base64: buf.toString('base64'), mediaType };
}

export function publicR2Url(key: string): string {
  const base = process.env.R2_PUBLIC_URL ?? '';
  if (!base) return key;
  return `${base.replace(/\/$/, '')}/${key}`;
}
