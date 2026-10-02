import { NextResponse } from "next/server";
import { getSettings, publicSettings } from "@/lib/settings";

// الإعدادات العامة للزوار: هوية المتجر (الاسم واللوجو)، التواصل، الشحن، طرق الدفع
export async function GET() {
  try {
    const map = await getSettings();
    return NextResponse.json({ success: true, settings: publicSettings(map) });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ success: false, settings: {} }, { status: 500 });
  }
}
