// src/app/api/register/route.ts
// POST /api/register — register the authenticated user.
// GET  /api/register — get the current user's registration status.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in with osu! to register." },
      { status: 401 }
    );
  }

  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";
  if (!registrationOpen) {
    return NextResponse.json(
      { error: "Registration is not currently open." },
      { status: 403 }
    );
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { registrationStatus: true, osuUsername: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.registrationStatus && user.registrationStatus !== "WITHDRAWN") {
    return NextResponse.json({ error: "You are already registered." }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { registrationStatus: "PENDING", registeredAt: new Date() },
    select: { id: true, osuUsername: true, registrationStatus: true, registeredAt: true },
  });

  return NextResponse.json({
    success: true,
    message: `${updated.osuUsername} registered. Your element will be assigned during the live roll stream.`,
    player: updated,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ registered: false, status: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { registrationStatus: true, element: true, registeredAt: true },
  });

  return NextResponse.json({
    registered: !!user?.registrationStatus,
    status: user?.registrationStatus ?? null,
    element: user?.element ?? null,
    registeredAt: user?.registeredAt ?? null,
  });
}
