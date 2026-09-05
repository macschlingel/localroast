import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, zodErrorResponse } from "@/lib/api";
import { normalizeRecipeInput, recipeSchema } from "@/lib/validation/recipe";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  const recipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
    include: { steps: { orderBy: { step_order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = normalizeRecipeInput(recipeSchema.parse(await req.json()));
    const recipe = await prisma.recipe.create({
      data: {
        title: body.title,
        grinder: body.grinder,
        grind_size: body.grind_size,
        coffee_filter: body.coffee_filter,
        filter_paper: body.filter_paper,
        is_public: body.is_public,
        userId: session.user.id,
        steps: { create: body.steps },
      },
      include: { steps: { orderBy: { step_order: "asc" } } },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    const validation = zodErrorResponse(error);
    if (validation) return validation;

    console.error("Failed to create recipe", error);
    return errorResponse("Internal server error", 500);
  }
}
