import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 5; // Cache for 5 seconds

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString() 
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
    }
  });
}
