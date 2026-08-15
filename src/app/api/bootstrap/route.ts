import { NextResponse } from "next/server";
import { getBootstrapData } from "@/lib/server-data";

export async function GET() {
  const data = await getBootstrapData();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
