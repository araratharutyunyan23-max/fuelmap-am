// Server-side proxy to Google Cloud Vision OCR.
// Takes a public photo URL (already uploaded to Supabase Storage) and returns
// candidate prices found on the image. Client never sees the API key.
//
// Set GOOGLE_CLOUD_VISION_API_KEY in .env.local.

import { NextRequest, NextResponse } from 'next/server';

const VISION_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;

// Plausible Armenian fuel-price range in AMD/litre.
// 92 ≈ 470, 95 ≈ 540, 98 ≈ 680, дизель ≈ 590, LPG ≈ 250, CNG ≈ 230.
const MIN_PRICE = 100;
const MAX_PRICE = 1500;

export async function POST(req: NextRequest) {
  if (!VISION_KEY) {
    return NextResponse.json(
      { error: 'OCR not configured', candidates: [] },
      { status: 503 }
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
