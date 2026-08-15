import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reassignRequisition } from "@/lib/server-data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const recruiter = body?.recruiter;

  if (typeof recruiter !== "string") {
    return NextResponse.json({ error: "recruiter must be a string" }, { status: 400 });
  }

  const existing = await db.requisition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Requisition not found" }, { status: 404 });
  }

  try {
    const updated = await reassignRequisition(id, recruiter);
    return NextResponse.json({ id: updated.id, recruiter });
  } catch {
    return NextResponse.json({ error: "recruiter must be a known recruiter name" }, { status: 400 });
  }
}
