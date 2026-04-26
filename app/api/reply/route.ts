import { NextRequest, NextResponse } from "next/server";
import { classifySymptoms } from "@/lib/openai";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Twilio webhook usually sends form data; accept both JSON and form-like shape
    const from = body.From || body.from || "unknown";
    const text = (body.Body || body.body || "").toLowerCase();

    const isSymptom = text.includes("symptoms") || text.includes("fever") || text.includes("pain") || text.includes("rash") || text.includes("headache") || text.includes("chills");

    let response: string;
    if (isSymptom) {
      response = await classifySymptoms(text);
    } else {
      response = "Bzzt: Reply SYMPTOMS to report symptoms, or visit bzzt.health for more info.";
    }

    await sendSMS(from, response);

    return NextResponse.json({ replied: true });
  } catch (err) {
    console.error("Reply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
