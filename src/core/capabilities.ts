import { HolmError } from "./errors.js";

export interface CapabilityVersion {
  readonly major: number;
  readonly minor: number;
}

export type CapabilityOrigin = "runtime" | "extension";

export interface CapabilityOffer {
  readonly id: string;
  readonly version: CapabilityVersion;
  readonly origin: CapabilityOrigin;
}

export interface CapabilityRequirement {
  readonly id: string;
  readonly major: number;
  readonly minMinor?: number;
}

export interface UnsupportedCapabilityErrorOptions {
  readonly id: string;
  readonly requirement?: unknown;
  readonly offered?: unknown;
  readonly adapter?: string;
  readonly surface?: string;
  readonly message?: string;
}

export interface CapabilityVersionErrorOptions {
  readonly id: string;
  readonly requirement: unknown;
  readonly offered: unknown;
  readonly adapter?: string;
  readonly surface?: string;
  readonly message?: string;
}

export interface InvalidCapabilityRequirementErrorOptions {
  readonly reason: string;
  readonly requirement?: unknown;
}

export interface DuplicateCapabilityOfferErrorOptions {
  readonly id: string;
  readonly version: unknown;
  readonly existing: unknown;
  readonly duplicate: unknown;
}

export interface CapabilitySnapshot {
  readonly revision: number;
  readonly offers: readonly CapabilityOffer[];
}

export type CapabilitySnapshotListener = (snapshot: CapabilitySnapshot) => void;

export interface CapabilityView {
  getSnapshot(): CapabilitySnapshot;
  match(requirement: CapabilityRequirement): CapabilityOffer | undefined;
  require(requirement: CapabilityRequirement): CapabilityOffer;
  subscribe(listener: CapabilitySnapshotListener): () => void;
}

export interface CapabilityRegistry extends CapabilityView {
  replaceOffers(offers: readonly CapabilityOffer[]): CapabilitySnapshot;
}

/**
 * Runtime-owned mutation seam. Deliberately not re-exported from the package
 * barrels: it is wired internally by createHolm()/the extension registrar so
 * standalone consumers cannot manufacture or forge holm.* capability offers.
 */
export interface CapabilityRuntimeUpdater extends CapabilityRegistry {
  registerExtensionOffer(offer: CapabilityOffer): CapabilityOffer;
}

interface NormalizedRequirement {
  readonly id: string;
  readonly major: number;
  readonly minMinor: number;
}

export class UnsupportedCapabilityError extends HolmError {
  constructor(options: UnsupportedCapabilityErrorOptions) {
    super({
      kind: "capability",
      code: "unsupported_capability",
      message: options.message ?? `Capability "${formatCapabilityId(options.id)}" is not offered.`,
      details: capabilityErrorDetails(options),
    });
    this.name = "UnsupportedCapabilityError";
  }
}

export class CapabilityVersionError extends HolmError {
  constructor(options: CapabilityVersionErrorOptions) {
    super({
      kind: "capability",
      code: "capability_version_mismatch",
      message: options.message ?? `Capability "${formatCapabilityId(options.id)}" does not satisfy the required version.`,
      details: capabilityErrorDetails(options),
    });
    this.name = "CapabilityVersionError";
  }
}

export class InvalidCapabilityRequirementError extends HolmError {
  constructor(options: InvalidCapabilityRequirementErrorOptions) {
    super({
      kind: "capability",
      code: "invalid_capability_requirement",
      message: `Invalid capability requirement: ${options.reason}.`,
      details: freezePlain({
        reason: options.reason,
        requirement: options.requirement,
      }),
    });
    this.name = "InvalidCapabilityRequirementError";
  }
}

export class DuplicateCapabilityOfferError extends HolmError {
  constructor(options: DuplicateCapabilityOfferErrorOptions) {
    super({
      kind: "capability",
      code: "duplicate_capability_offer",
      message: `Duplicate capability offer for "${formatCapabilityId(options.id)}".`,
      details: freezePlain({
        id: options.id,
        version: options.version,
        existing: options.existing,
        duplicate: options.duplicate,
      }),
    });
    this.name = "DuplicateCapabilityOfferError";
  }
}

export function createCapabilityRegistry(offers: readonly CapabilityOffer[] = []): CapabilityRegistry {
  return new InstanceCapabilityRegistry(offers);
}

export function createCapabilityRuntimeUpdater(
  offers: readonly CapabilityOffer[] = [],
): CapabilityRuntimeUpdater {
  return new InstanceCapabilityRegistry(offers);
}

export function createCapabilityView(registry: CapabilityView): CapabilityView {
  return Object.freeze({
    getSnapshot: () => registry.getSnapshot(),
    match: (requirement: CapabilityRequirement) => registry.match(requirement),
    require: (requirement: CapabilityRequirement) => registry.require(requirement),
    subscribe: (listener: CapabilitySnapshotListener) => registry.subscribe(listener),
  });
}

export function negotiateCapability(
  offers: readonly CapabilityOffer[],
  requirement: CapabilityRequirement,
): CapabilityOffer {
  const normalizedOffers = normalizeOffers(offers);
  const normalizedRequirement = normalizeRequirement(requirement);
  return findRequiredOffer(normalizedOffers, normalizedRequirement);
}

class InstanceCapabilityRegistry implements CapabilityRuntimeUpdater {
  #baseOffers: readonly CapabilityOffer[];
  #extensionOffers: readonly CapabilityOffer[] = [];
  #snapshot: CapabilitySnapshot;
  readonly #listeners = new Set<CapabilitySnapshotListener>();

  constructor(offers: readonly CapabilityOffer[]) {
    this.#baseOffers = normalizeOffers(offers);
    this.#snapshot = createSnapshot(0, this.#baseOffers, this.#extensionOffers);
  }

  getSnapshot(): CapabilitySnapshot {
    return this.#snapshot;
  }

  match(requirement: CapabilityRequirement): CapabilityOffer | undefined {
    const normalizedRequirement = normalizeRequirement(requirement);
    return findBestOffer(this.#snapshot.offers, normalizedRequirement);
  }

  require(requirement: CapabilityRequirement): CapabilityOffer {
    const normalizedRequirement = normalizeRequirement(requirement);
    return findRequiredOffer(this.#snapshot.offers, normalizedRequirement);
  }

  replaceOffers(offers: readonly CapabilityOffer[]): CapabilitySnapshot {
    return this.#commitWith(normalizeOffers(offers), this.#extensionOffers);
  }

  registerExtensionOffer(offer: CapabilityOffer): CapabilityOffer {
    const normalized = normalizeExtensionOffer(offer);
    this.#commitWith(this.#baseOffers, [...this.#extensionOffers, normalized]);
    return normalized;
  }

  #commitWith(
    baseOffers: readonly CapabilityOffer[],
    extensionOffers: readonly CapabilityOffer[],
  ): CapabilitySnapshot {
    const next = createSnapshot(this.#snapshot.revision + 1, baseOffers, extensionOffers);
    this.#baseOffers = baseOffers;
    this.#extensionOffers = extensionOffers;
    this.#snapshot = next;
    this.#notify(next);
    return next;
  }

  subscribe(listener: CapabilitySnapshotListener): () => void {
    this.#listeners.add(listener);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      this.#listeners.delete(listener);
    };
  }

  #notify(snapshot: CapabilitySnapshot): void {
    const errors: unknown[] = [];
    for (const listener of [...this.#listeners]) {
      if (!this.#listeners.has(listener)) {
        continue;
      }
      try {
        listener(snapshot);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, "Capability snapshot listeners failed.");
    }
  }
}

function createSnapshot(
  revision: number,
  baseOffers: readonly CapabilityOffer[],
  extensionOffers: readonly CapabilityOffer[],
): CapabilitySnapshot {
  return Object.freeze({
    revision,
    offers: Object.freeze(normalizeOffers([...baseOffers, ...extensionOffers])),
  });
}

function normalizeExtensionOffer(offer: CapabilityOffer): CapabilityOffer {
  const normalized = normalizeOffer({ ...offer, origin: "extension" });
  if (!normalized.id.startsWith("sdk.")) {
    throw new InvalidCapabilityRequirementError({
      reason: "extension-registered capability offers must use the sdk. namespace",
      requirement: normalized,
    });
  }
  return normalized;
}

function normalizeOffers(offers: readonly CapabilityOffer[]): readonly CapabilityOffer[] {
  const normalized: CapabilityOffer[] = [];
  const seen = new Map<string, CapabilityOffer>();
  for (const offer of offers) {
    const next = normalizeOffer(offer);
    const key = capabilityOfferKey(next);
    const existing = seen.get(key);
    if (existing) {
      throw new DuplicateCapabilityOfferError({
        id: next.id,
        version: next.version,
        existing,
        duplicate: next,
      });
    }
    seen.set(key, next);
    normalized.push(next);
  }
  return normalized;
}

function normalizeOffer(offer: CapabilityOffer): CapabilityOffer {
  const id = normalizeId(offer?.id, "offer id");
  const version = Object.freeze({
    major: normalizeVersionNumber(offer?.version?.major, "offer major"),
    minor: normalizeVersionNumber(offer?.version?.minor, "offer minor"),
  });
  const origin = offer?.origin;
  if (origin !== "runtime" && origin !== "extension") {
    throw new InvalidCapabilityRequirementError({
      reason: "offer origin must be runtime or extension",
      requirement: offer,
    });
  }
  return Object.freeze({ id, version, origin });
}

function normalizeRequirement(requirement: CapabilityRequirement): NormalizedRequirement {
  const id = normalizeId(requirement?.id, "requirement id");
  return Object.freeze({
    id,
    major: normalizeVersionNumber(requirement?.major, "requirement major"),
    minMinor: normalizeVersionNumber(requirement?.minMinor ?? 0, "requirement minimum minor"),
  });
}

function normalizeId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCapabilityRequirementError({
      reason: `${label} must be a non-empty namespaced string`,
      requirement: value,
    });
  }
  if (value !== value.trim()) {
    throw new InvalidCapabilityRequirementError({
      reason: `${label} must not contain leading or trailing whitespace`,
      requirement: value,
    });
  }
  const id = value;
  if (!isNamespacedId(id)) {
    throw new InvalidCapabilityRequirementError({
      reason: `${label} must contain at least two non-empty dot-separated parts`,
      requirement: value,
    });
  }
  return id;
}

function isNamespacedId(id: string): boolean {
  return id.split(".").every((part) => part.length > 0) && id.includes(".");
}

function normalizeVersionNumber(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new InvalidCapabilityRequirementError({
      reason: `${label} must be a non-negative integer`,
      requirement: value,
    });
  }
  return value as number;
}

function findRequiredOffer(
  offers: readonly CapabilityOffer[],
  requirement: NormalizedRequirement,
): CapabilityOffer {
  const match = findBestOffer(offers, requirement);
  if (match) {
    return match;
  }
  const sameId = offers.filter((offer) => offer.id === requirement.id);
  if (sameId.length === 0) {
    throw new UnsupportedCapabilityError({
      id: requirement.id,
      requirement,
      offered: summarizeOffers(offers),
    });
  }
  throw new CapabilityVersionError({
    id: requirement.id,
    requirement,
    offered: summarizeOffers(sameId),
  });
}

function findBestOffer(
  offers: readonly CapabilityOffer[],
  requirement: NormalizedRequirement,
): CapabilityOffer | undefined {
  let best: CapabilityOffer | undefined;
  for (const offer of offers) {
    if (
      offer.id !== requirement.id ||
      offer.version.major !== requirement.major ||
      offer.version.minor < requirement.minMinor
    ) {
      continue;
    }
    if (!best || offer.version.minor > best.version.minor) {
      best = offer;
    }
  }
  return best;
}

function summarizeOffers(offers: readonly CapabilityOffer[]): readonly CapabilityOffer[] {
  return Object.freeze(
    offers.map((offer) =>
      Object.freeze({
        id: offer.id,
        origin: offer.origin,
        version: Object.freeze({ major: offer.version.major, minor: offer.version.minor }),
      }),
    ),
  );
}

function capabilityOfferKey(offer: CapabilityOffer): string {
  return `${offer.id}\u0000${offer.version.major}\u0000${offer.version.minor}`;
}

function capabilityErrorDetails(options: {
  readonly id: string;
  readonly requirement?: unknown;
  readonly offered?: unknown;
  readonly adapter?: string;
  readonly surface?: string;
}): Record<string, unknown> {
  const details: Record<string, unknown> = { id: options.id };
  if (options.requirement !== undefined) {
    details.requirement = options.requirement;
  }
  if (options.offered !== undefined) {
    details.offered = options.offered;
  }
  if (options.adapter !== undefined) {
    details.adapter = options.adapter;
  }
  if (options.surface !== undefined) {
    details.surface = options.surface;
  }
  return freezePlain(details);
}

function freezePlain<T extends Record<string, unknown>>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

function formatCapabilityId(id: string): string {
  return id.trim() === "" ? "<missing>" : id;
}
