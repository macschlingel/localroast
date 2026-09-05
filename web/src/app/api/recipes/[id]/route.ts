import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, zodErrorResponse } from "@/lib/api";
import { normalizeRecipeInput, recipeSchema } from "@/lib/validation/recipe";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { steps: { orderBy: { step_order: "asc" } } },
  });

  if (!recipe) return errorResponse("Not Found", 404);

  if (!recipe.is_public && (!session?.user?.id || recipe.userId !== session.user.id)) {
    return errorResponse("Unauthorized", 401);
  }

  return NextResponse.json(recipe);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  try {
    const body = normalizeRecipeInput(recipeSchema.parse(await req.json()));
    const existingRecipe = await prisma.recipe.findUnique({ where: { id } });

    if (!existingRecipe) return errorResponse("Not Found", 404);
    if (existingRecipe.userId !== session.user.id) return errorResponse("Unauthorized", 401);

    const recipe = await prisma.$transaction(async (tx) => {
      await tx.step.deleteMany({ where: { recipeId: id } });
      return tx.recipe.update({
        where: { id },
        data: {
          title: body.title,
          grinder: body.grinder,
          grind_size: body.grind_size,
          coffee_filter: body.coffee_filter,
          filter_paper: body.filter_paper,
          is_public: body.is_public,
          steps: { create: body.steps },
        },
        include: { steps: { orderBy: { step_order: "asc" } } },
      });
    });

    return NextResponse.json(recipe);
  } catch (error) {
    const validation = zodErrorResponse(error);
    if (validation) return validation;

    console.error("Failed to update recipe", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const existingRecipe = await prisma.recipe.findUnique({ where: { id } });
  if (!existingRecipe) return errorResponse("Not Found", 404);
  if (existingRecipe.userId !== session.user.id) return errorResponse("Unauthorized", 401);

  await prisma.recipe.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
