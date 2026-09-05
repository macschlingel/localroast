import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const stepSchema = z.object({
  step_order: z.number(),
  name: z.string(),
  volume_ml: z.number(),
  time_seconds: z.number(),
  flow_rate_ml_per_sec: z.number(),
});

const recipeSchema = z.object({
  title: z.string().min(1),
  grinder: z.string(),
  grind_size: z.string(),
  is_public: z.boolean().default(false),
  steps: z.array(stepSchema),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  const recipe = await prisma.recipe.findUnique({
    where: {
      id: params.id,
    },
    include: {
      steps: {
        orderBy: {
          step_order: "asc",
        },
      },
    },
  });

  if (!recipe) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Allow if public or if owner
  if (!recipe.is_public && (!session?.user?.id || recipe.userId !== session.user.id)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json(recipe);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const body = recipeSchema.parse(json);

    // Verify ownership
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: params.id },
    });

    if (!existingRecipe) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (existingRecipe.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update recipe and steps
    // Simplest way is to delete old steps and create new ones
    const recipe = await prisma.$transaction(async (tx) => {
      await tx.step.deleteMany({
        where: { recipeId: params.id },
      });

      return await tx.recipe.update({
        where: { id: params.id },
        data: {
          title: body.title,
          grinder: body.grinder,
          grind_size: body.grind_size,
          is_public: body.is_public,
          steps: {
            create: body.steps,
          },
        },
        include: {
          steps: true,
        },
      });
    });

    return NextResponse.json(recipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }

    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const existingRecipe = await prisma.recipe.findUnique({
    where: { id: params.id },
  });

  if (!existingRecipe) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (existingRecipe.userId !== session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await prisma.recipe.delete({
    where: { id: params.id },
  });

  return new NextResponse(null, { status: 204 });
}
