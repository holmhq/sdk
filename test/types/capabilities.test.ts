import {
  createCapabilityRegistry,
  type CapabilityOffer,
  type CapabilityRequirement,
  type CapabilitySnapshot,
} from "../../src/core/index.js";

const offer = {
  id: "com.example.reports",
  origin: "runtime",
  version: { major: 1, minor: 2 },
} satisfies CapabilityOffer;

const requirement: CapabilityRequirement = {
  id: "com.example.reports",
  major: 1,
  minMinor: 1,
};

const registry = createCapabilityRegistry([offer]);
const snapshot: CapabilitySnapshot = registry.getSnapshot();
const match: CapabilityOffer = registry.require(requirement);

// @ts-expect-error capability offers are readonly.
match.id = "com.example.changed";

// @ts-expect-error capability snapshots expose readonly offers.
snapshot.offers.push(offer);

void snapshot;
void match;
