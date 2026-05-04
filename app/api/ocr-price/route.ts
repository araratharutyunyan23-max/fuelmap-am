// Server-side proxy to Google Cloud Vision OCR.
// Takes a public photo URL (already uploaded to Supabase Storage) and returns
// candidate prices found on the image. Client never sees the API key.
//
// Auth: requires a valid Supabase user JWT. Anonymous calls are 401.
// Rate limit: 10 requests / minute per user (in-process, per Vercel
// function instance — good enough at our scale, and a hard ceiling on
// Google Vision spend even if a single user holds onto an instance).
//
// Set GOOGLE_CLOUD_VISION_API_KEY in .env.local.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VISION_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;

const MIN_PRICE = 100;
const MAX_PRICE = 1500;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const userHits = new Map<string, number[]>();

function withinRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = (userHits.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (bucket.length >= RATE_LIMIT_MAX) {
    userHits.set(userId, bucket);
    return false;
  }
  bucket.push(now);
  userHits.set(userId, bucket);
  return true;
}

async function resolveUser(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const c = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await c.auth.getUser();
  return data.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  if (!VISION_KEY) {
    return NextResponse.json(
      { error: 'OCR not configured', candidates: [] },
      { status: 503 }
    );
  }

  const userId = await resolveUser(req);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!withinRateLimit(userId)) {
    return NextResponse.json(
      { error: 'rate_limited', candidates: [] },
      { status: 429 }
    );
  }

  let photoUrl: string;
  try {
    const body = await req.json();
    photoUrl = body?.photoUrl;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (typeof photoUrl !== 'string' || !/^https?:\/\//.test(photoUrl)) {
    return NextResponse.json({ error: 'photoUrl must be an HTTPS URL' }, { status: 400 });
  }

  const visionResp = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: photoUrl } },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          },
        ],
      }),
    }
  );

  if (!visionResp.ok) {
    const txt = await visionResp.text();
    return NextResponse.json(
      { error: `vision ${visionResp.status}: ${txt.slice(0, 200)}`, candidates: [] },
      { status: 502 }
    );
  }

  const json = await visionResp.json();
  const fullText: string =
    json?.responses?.[0]?.fullTextAnnotation?.text ??
    json?.responses?.[0]?.textAnnotations?.[0]?.description ??
    '';

  const seen = new Set<number>();
  for (const m of fullText.matchAll(/\b(\d{3,4})\b/g)) {
    const n = parseInt(m[1], 10);
    if (n >= MIN_PRICE && n <= MAX_PRICE) seen.add(n);
  }
  const candidates = Array.from(seen).sort((a, b) => a - b);

  return NextResponse.json({ candidates });
}
