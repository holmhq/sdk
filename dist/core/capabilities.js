import { HolmError } from "./errors.js";
export class UnsupportedCapabilityError extends HolmError {
    constructor(options) {
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
    constructor(options) {
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
    constructor(options) {
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
    constructor(options) {
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
export function createCapabilityRegistry(offers = []) {
    return createCapabilityView(new InstanceCapabilityRegistry(offers));
}
export function createCapabilityRuntimeUpdater(offers = []) {
    return new InstanceCapabilityRegistry(offers);
}
export function createCapabilityView(registry) {
    return Object.freeze({
        getSnapshot: () => registry.getSnapshot(),
        match: (requirement) => registry.match(requirement),
        require: (requirement) => registry.require(requirement),
        subscribe: (listener) => registry.subscribe(listener),
    });
}
export function negotiateCapability(offers, requirement) {
    const normalizedOffers = normalizeOffers(offers);
    const normalizedRequirement = normalizeRequirement(requirement);
    return findRequiredOffer(normalizedOffers, normalizedRequirement);
}
class InstanceCapabilityRegistry {
    #baseOffers;
    #extensionOffers = [];
    #snapshot;
    #listeners = new Set();
    constructor(offers) {
        this.#baseOffers = normalizeOffers(offers);
        this.#snapshot = createSnapshot(0, this.#baseOffers, this.#extensionOffers);
    }
    getSnapshot() {
        return this.#snapshot;
    }
    match(requirement) {
        const normalizedRequirement = normalizeRequirement(requirement);
        return findBestOffer(this.#snapshot.offers, normalizedRequirement);
    }
    require(requirement) {
        const normalizedRequirement = normalizeRequirement(requirement);
        return findRequiredOffer(this.#snapshot.offers, normalizedRequirement);
    }
    replaceOffers(offers) {
        return this.#commitWith(normalizeOffers(offers), this.#extensionOffers);
    }
    registerExtensionOffer(offer) {
        const normalized = normalizeExtensionOffer(offer);
        this.#commitWith(this.#baseOffers, [...this.#extensionOffers, normalized]);
        return normalized;
    }
    #commitWith(baseOffers, extensionOffers) {
        const next = createSnapshot(this.#snapshot.revision + 1, baseOffers, extensionOffers);
        this.#baseOffers = baseOffers;
        this.#extensionOffers = extensionOffers;
        this.#snapshot = next;
        this.#notify(next);
        return next;
    }
    subscribe(listener) {
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
    #notify(snapshot) {
        const errors = [];
        for (const listener of [...this.#listeners]) {
            if (!this.#listeners.has(listener)) {
                continue;
            }
            try {
                listener(snapshot);
            }
            catch (error) {
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
function createSnapshot(revision, baseOffers, extensionOffers) {
    return Object.freeze({
        revision,
        offers: Object.freeze(normalizeOffers([...baseOffers, ...extensionOffers])),
    });
}
function normalizeExtensionOffer(offer) {
    const normalized = normalizeOffer({ ...offer, origin: "extension" });
    if (!normalized.id.startsWith("sdk.")) {
        throw new InvalidCapabilityRequirementError({
            reason: "extension-registered capability offers must use the sdk. namespace",
            requirement: normalized,
        });
    }
    return normalized;
}
function normalizeOffers(offers) {
    const normalized = [];
    const seen = new Map();
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
function normalizeOffer(offer) {
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
function normalizeRequirement(requirement) {
    const id = normalizeId(requirement?.id, "requirement id");
    return Object.freeze({
        id,
        major: normalizeVersionNumber(requirement?.major, "requirement major"),
        minMinor: normalizeVersionNumber(requirement?.minMinor ?? 0, "requirement minimum minor"),
    });
}
function normalizeId(value, label) {
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
function isNamespacedId(id) {
    return id.split(".").every((part) => part.length > 0) && id.includes(".");
}
function normalizeVersionNumber(value, label) {
    if (!Number.isInteger(value) || value < 0) {
        throw new InvalidCapabilityRequirementError({
            reason: `${label} must be a non-negative integer`,
            requirement: value,
        });
    }
    return value;
}
function findRequiredOffer(offers, requirement) {
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
function findBestOffer(offers, requirement) {
    let best;
    for (const offer of offers) {
        if (offer.id !== requirement.id ||
            offer.version.major !== requirement.major ||
            offer.version.minor < requirement.minMinor) {
            continue;
        }
        if (!best || offer.version.minor > best.version.minor) {
            best = offer;
        }
    }
    return best;
}
function summarizeOffers(offers) {
    return Object.freeze(offers.map((offer) => Object.freeze({
        id: offer.id,
        origin: offer.origin,
        version: Object.freeze({ major: offer.version.major, minor: offer.version.minor }),
    })));
}
function capabilityOfferKey(offer) {
    return `${offer.id}\u0000${offer.version.major}\u0000${offer.version.minor}`;
}
function capabilityErrorDetails(options) {
    const details = { id: options.id };
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
function freezePlain(value) {
    return Object.freeze({ ...value });
}
function formatCapabilityId(id) {
    return id.trim() === "" ? "<missing>" : id;
}
//# sourceMappingURL=capabilities.js.map