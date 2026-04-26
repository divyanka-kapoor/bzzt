import { NextRequest, NextResponse } from "next/server";
import { saveEnrollment } from "@/lib/store";
import { reverseGeocode } from "@/lib/geocode";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const { phone, email, pincode, lat, lng } = await req.json();
    if (!phone || !email || !pincode) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    let resolvedPin = pincode;
    if (lat && lng && !pincode) {
      const geo = await reverseGeocode(Number(lat), Number(lng));
      if (geo) resolvedPin = geo;
    }

    saveEnrollment({ phone, email, pincode: resolvedPin, lat: Number(lat) || 0, lng: Number(lng) || 0 });

    const welcomeMsg = `You're enrolled in Bzzt alerts for ${resolvedPin}. We'll warn you when disease risk rises in your area. Reply SYMPTOMS anytime.`;
    await sendSMS(phone, welcomeMsg);

    return NextResponse.json({ success: true, pincode: resolvedPin });
  } catch (err) {
    console.error("Enroll error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
