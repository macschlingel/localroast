import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecipeForm } from "@/components/recipe-form";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { steps: { orderBy: { step_order: "asc" } } },
  });

  if (!recipe || recipe.userId !== session.user.id) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Rezept bearbeiten</h1>
      <RecipeForm
        initialRecipe={{
          id: recipe.id,
          title: recipe.title,
          grinder: recipe.grinder,
          grind_size: recipe.grind_size,
          coffee_filter: recipe.coffee_filter || "",
          filter_paper: recipe.filter_paper || "",
          is_public: recipe.is_public,
          steps: recipe.steps.map((step) => ({
            step_order: step.step_order,
            name: step.name,
            volume_ml: step.volume_ml,
            time_seconds: step.time_seconds,
            flow_rate_ml_per_sec: step.flow_rate_ml_per_sec,
          })),
        }}
      />
    </div>
  );
}
