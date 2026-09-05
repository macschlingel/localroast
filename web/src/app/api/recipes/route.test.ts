import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/recipes/route";

const session = { user: { id: "user-1", name: "Test", email: "test@example.com" } };
const validBody = {
  title: "V60",
  grinder: "C40",
  grind_size: "24",
  coffee_filter: "V60 02",
  filter_paper: "Abaca 2–4 Cups",
  is_public: false,
  steps: [{
    step_order: 1,
    name: "Bloom",
    volume_ml: 60,
    time_seconds: 45,
    flow_rate_ml_per_sec: 2,
  }],
};

describe("POST /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify(validBody),
    }));

    expect(response.status).toBe(401);
  });

  it("rejects missing filter metadata", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const response = await POST(new Request("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify({ ...validBody, filter_paper: "" }),
    }));

    expect(response.status).toBe(422);
    expect(prisma.recipe.create).not.toHaveBeenCalled();
  });

  it("creates a validated recipe for the owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.recipe.create).mockResolvedValue({
      id: "recipe-1",
      ...validBody,
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: validBody.steps,
    } as never);

    const response = await POST(new Request("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify(validBody),
    }));

    expect(response.status).toBe(201);
    expect(prisma.recipe.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-1", coffee_filter: "V60 02" }),
    }));
  });
});
