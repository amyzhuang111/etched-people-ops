import { NextResponse } from "next/server";
import { nudgeCandidate } from "@/lib/server-data";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const updated = await nudgeCandidate(id);
    return NextResponse.json({ id: updated.id, nudgedAt: updated.nudgedAt.toISOString() });
  } catch {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
}
