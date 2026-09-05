import { createHash, randomBytes } from "node:crypto";

const DEVICE_KEY_PREFIX = "lrk_";

export function hashDeviceKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function createDeviceKey() {
  const secret = randomBytes(32).toString("base64url");
  const key = `${DEVICE_KEY_PREFIX}${secret}`;
  return {
    key,
    keyHash: hashDeviceKey(key),
    keyPrefix: key.slice(0, 12),
  };
}
