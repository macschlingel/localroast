import { authenticateDevice } from "@/lib/device-auth";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, requestOrigin } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (!consumeRateLimit(`esp32:${requestOrigin(req)}`)) {
    return errorResponse("Too many requests", 429);
  }

  const device = await authenticateDevice(req);

  if (!device) return errorResponse("Invalid API key", 401);

  const recipes = await prisma.recipe.findMany({
    where: { userId: device.userId },
    include: { steps: { orderBy: { step_order: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(recipes, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
