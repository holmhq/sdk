import { createReadonlyBytes } from "../../../src/core/index.js";

export const jsonTransportFixture = Object.freeze({
  body: Object.freeze({
    ok: true,
    bytes: createReadonlyBytes([0, 255, 1]),
    nested: Object.freeze({ name: "holm" }),
  }),
  encoded: '{"bytes":{"$holm":"bytes","base64":"AP8B"},"nested":{"name":"holm"},"ok":true}',
});

export const rawTransportFixture = Object.freeze({
  body: "plain response body",
});

export const binaryTransportFixture = Object.freeze({
  body: createReadonlyBytes([4, 5, 6]),
  encoded: '{"$holm":"bytes","base64":"BAUG"}',
});
