import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getLineageLog } from '@/lib/openmetadata';

export async function GET() {
  return NextResponse.json({ lineage: getLineageLog() });
}
