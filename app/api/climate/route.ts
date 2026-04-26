import { NextRequest, NextResponse } from "next/server";
import { fetchClimateData } from "@/lib/open-meteo";

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json();
    if (lat == null || lng == null) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }
    const data = await fetchClimateData(Number(lat), Number(lng));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Climate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
