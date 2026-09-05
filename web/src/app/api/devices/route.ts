import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { createDeviceKey } from "@/lib/device-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const deviceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const devices = await prisma.device.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(devices);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  try {
    const { name } = deviceSchema.parse(await req.json());
    const generated = createDeviceKey();
    const device = await prisma.device.create({
      data: {
        name,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
      },
    });

    await prisma.deviceAudit.create({
      data: { deviceId: device.id, userId: session.user.id, event: "created" },
    });

    return NextResponse.json({ device, apiKey: generated.key }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation failed", 422, error.issues);
    }
    console.error("Failed to create device", error);
    return errorResponse("Internal server error", 500);
  }
}
