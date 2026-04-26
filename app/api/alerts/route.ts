import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getAlertLogs } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ alerts: getAlertLogs() });
}
