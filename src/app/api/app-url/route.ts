
import { NextRequest, NextResponse } from 'next/server';
import { firebase } from '@/lib/firebase'; // Direct import

export async function GET(req: NextRequest) {
  try {
    // In a production environment on Firebase App Hosting, the URL is available
    // in the X-Forwarded-Host header. In local dev, we use the host header.
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (!host) {
        throw new Error('Could not determine host');
    }
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;
    
    return NextResponse.json({ url: appUrl });

  } catch (e: any) {
    console.error("App URL API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
