import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { recipeSchema } from "@/lib/validation/recipe";

describe("ESP32 recipe fixture", () => {
  it("matches the recipe API contract including filter metadata", () => {
    const fixturePath = resolve(process.cwd(), "../firmware/test/test_payload/recipes.json");
    const payload = JSON.parse(readFileSync(fixturePath, "utf8"));
    expect(() => recipeSchema.array().parse(payload)).not.toThrow();
  });
});
