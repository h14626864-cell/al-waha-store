import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId } from "@/lib/customer-auth";

export async function GET() {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return NextResponse.json({ success: false, customer: null }, { status: 401 });
    }
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!customer) {
      return NextResponse.json({ success: false, customer: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, customer });
  } catch {
    return NextResponse.json({ success: false, customer: null }, { status: 401 });
  }
}
