import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: { findUnique: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/recipes/[id]/route";

const privateRecipe = {
  id: "recipe-1",
  title: "Private",
  is_public: false,
  userId: "owner-1",
  steps: [],
};

describe("GET /api/recipes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not disclose a private recipe to another user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "other-user" } });
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue(privateRecipe as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("allows a public recipe without a session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue({
      ...privateRecipe,
      is_public: true,
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(response.status).toBe(200);
  });
});
