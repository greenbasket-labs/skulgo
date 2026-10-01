import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Online school-fee payments are temporarily paused. Please pay outside SkulGo and bring the receipt or payment evidence to the school cashier.",
    },
    { status: 503 },
  );
}
