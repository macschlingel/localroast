import { z } from "zod";

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);

export const stepSchema = z.object({
  step_order: z.number().int().nonnegative(),
  name: nonEmptyText(80),
  volume_ml: z.number().finite().positive().max(5000),
  time_seconds: z.number().int().nonnegative().max(3600),
  flow_rate_ml_per_sec: z.number().finite().positive().max(100),
});

export const recipeSchema = z
  .object({
    title: nonEmptyText(120),
    grinder: nonEmptyText(120),
    grind_size: nonEmptyText(80),
    coffee_filter: nonEmptyText(120),
    filter_paper: nonEmptyText(120),
    is_public: z.boolean().default(false),
    steps: z.array(stepSchema).min(1).max(30),
  })
  .superRefine((recipe, ctx) => {
    const orders = recipe.steps.map((step) => step.step_order);
    if (new Set(orders).size !== orders.length) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: "step_order must be unique",
      });
    }
  });

export type RecipeInput = z.infer<typeof recipeSchema>;

export function normalizeRecipeInput(input: RecipeInput): RecipeInput {
  return {
    ...input,
    steps: [...input.steps].sort((a, b) => a.step_order - b.step_order),
  };
}

export function validationIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
}
