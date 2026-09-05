import { describe, expect, it } from "vitest";
import { createDeviceKey, hashDeviceKey } from "@/lib/device-key";

describe("device keys", () => {
  it("stores only a hash-compatible representation", () => {
    const generated = createDeviceKey();
    expect(generated.key).toMatch(/^lrk_/);
    expect(generated.keyHash).toBe(hashDeviceKey(generated.key));
    expect(generated.keyHash).not.toContain(generated.key);
  });

  it("generates unique keys", () => {
    expect(createDeviceKey().keyHash).not.toBe(createDeviceKey().keyHash);
  });
});
