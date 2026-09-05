import { describe, expect, it } from "vitest";
import { recipeSchema } from "@/lib/validation/recipe";

const validRecipe = {
  title: "V60 Ethiopia",
  grinder: "Comandante C40",
  grind_size: "24 Klicks",
  coffee_filter: "Hario V60 02",
  filter_paper: "Cafec Abaca 2–4 Cups",
  is_public: false,
  steps: [
    {
      step_order: 1,
      name: "Bloom",
      volume_ml: 60,
      time_seconds: 45,
      flow_rate_ml_per_sec: 2,
    },
  ],
};

describe("recipeSchema", () => {
  it("accepts a complete recipe", () => {
    expect(recipeSchema.parse(validRecipe)).toMatchObject(validRecipe);
  });

  it("requires filter and paper for new recipes", () => {
    const result = recipeSchema.safeParse({ ...validRecipe, coffee_filter: "" });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate step order and invalid measurements", () => {
    const result = recipeSchema.safeParse({
      ...validRecipe,
      steps: [
        validRecipe.steps[0],
        { ...validRecipe.steps[0], name: "Pour", volume_ml: -1 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
