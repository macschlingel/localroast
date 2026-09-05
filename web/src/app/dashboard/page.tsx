import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      steps: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <Link
          href="/dashboard/new"
          className="button-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Recipe
        </Link>
      </div>

      <div className="mb-8 flex justify-end">
        <Link href="/dashboard/devices" className="button-secondary inline-flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Geräte verwalten
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">You haven&apos;t created any recipes yet.</p>
          <Link
            href="/dashboard/new"
            className="text-orange-700 font-medium hover:underline"
          >
            Create your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/dashboard/recipe/${recipe.id}`}
              className="block p-6 border rounded-lg hover:border-orange-500 transition-colors bg-white shadow-sm"
            >
              <h2 className="text-xl font-bold mb-2">{recipe.title}</h2>
              <div className="text-sm text-gray-600 mb-4">
                <p>{recipe.grinder} • {recipe.grind_size}</p>
                <p>{recipe.coffee_filter || "Filter nicht angegeben"}</p>
                <p>{recipe.steps.length} steps</p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className={`text-xs px-2 py-1 rounded-full ${recipe.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {recipe.is_public ? 'Public' : 'Private'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(recipe.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
