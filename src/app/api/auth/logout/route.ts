import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}
