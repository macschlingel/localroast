import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      apiKey: apiKey,
    },
  });

  if (!user) {
    return new NextResponse("Invalid API Key", { status: 401 });
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      userId: user.id,
    },
    include: {
      steps: {
        orderBy: {
          step_order: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json(recipes);
}
