import { prisma } from "@/lib/prisma";
import { hashDeviceKey } from "@/lib/device-key";

export { createDeviceKey } from "@/lib/device-key";

export async function authenticateDevice(request: Request) {
  const key = request.headers.get("x-api-key");
  if (!key) return null;

  const device = await prisma.device.findUnique({
    where: { keyHash: hashDeviceKey(key) },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!device || device.revokedAt) return null;

  await prisma.$transaction([
    prisma.device.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    }),
    prisma.deviceAudit.create({
      data: { deviceId: device.id, userId: device.userId, event: "recipe_sync" },
    }),
  ]);

  return device;
}
