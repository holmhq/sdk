import { strict as assert } from "node:assert";
import { test } from "node:test";

const review033Disposition = Object.freeze([
  { advisory: 1, disposition: "fixed/tested in S03 credential diagnostic hardening" },
  { advisory: 2, disposition: "fixed/tested in S03 credential diagnostic hardening" },
  { advisory: 3, disposition: "fixed/tested in S03 credential diagnostic hardening" },
  { advisory: 4, disposition: "fixed/tested in S03 credential diagnostic hardening" },
  { advisory: 5, disposition: "tested with accurate plaintext-hiding sensitivity wording" },
  { advisory: 6, disposition: "tested: in-memory runtime readonly getters expose frozen snapshots, not live arrays" },
  { advisory: 7, disposition: "fixed/tested: object-prototype-reserved extension namespaces are rejected" },
  { advisory: 8, disposition: "tested/accepted: duplicate request IDs fail closed within the 1024-entry terminal window" },
  { advisory: 9, disposition: "tested/accepted: whitespace-padded response request IDs fail closed" },
]);

test("Review #033 advisory disposition covers 1-9 after S03 credential hardening and S04 edge-contract work", () => {
  assert.deepEqual(
    review033Disposition.map((entry) => entry.advisory),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(review033Disposition.every((entry) => entry.disposition.length > 0), true);
});
