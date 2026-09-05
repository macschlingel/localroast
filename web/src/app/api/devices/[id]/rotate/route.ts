import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { createDeviceKey } from "@/lib/device-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const generated = createDeviceKey();
  const result = await prisma.device.updateMany({
    where: { id, userId: session.user.id, revokedAt: null },
    data: {
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      lastUsedAt: null,
    },
  });

  if (result.count === 0) return errorResponse("Not Found", 404);
  await prisma.deviceAudit.create({
    data: { deviceId: id, userId: session.user.id, event: "rotated" },
  });
  return NextResponse.json({ apiKey: generated.key });
}
