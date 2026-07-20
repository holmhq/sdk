import { isReadonlyBytes } from "../core/wire-value.js";
import { adminMethodDescriptors, } from "./generated.js";
const descriptorsByName = new Map(adminMethodDescriptors.map((descriptor) => [descriptor.name, descriptor]));
const methodNames = Object.freeze(adminMethodDescriptors.map((descriptor) => descriptor.name));
export function createAdminApi(http, uploads) {
    const namespaces = {};
    const invoke = (name, input) => {
        const descriptor = requireDescriptor(name);
        return executeDescriptor(descriptor, normalizeInput(input), http, uploads);
    };
    for (const descriptor of adminMethodDescriptors) {
        installMethod(namespaces, descriptor.name, (input) => invoke(descriptor.name, input));
    }
    return deepFreeze({
        ...namespaces,
        methodNames,
        describe: requireDescriptor,
        invoke,
    });
}
function executeDescriptor(descriptor, input, http, uploads) {
    const route = selectRoute(descriptor, input);
    const url = expandRoute(route.path, input.path);
    if (descriptor.kind === "url") {
        return appendParams(url, input.params);
    }
    if (descriptor.kind === "upload") {
        return executeUpload(url, input, http, uploads);
    }
    if (descriptor.kind === "composite-upload") {
        return executeMemberPicture(descriptor, input, http, uploads);
    }
    return executeRequest(descriptor, route, url, input, http);
}
async function executeRequest(descriptor, route, url, input, http) {
    const body = createRequestBody(descriptor, input);
    const request = {
        method: route.method,
        url,
        ...(input.params === undefined ? {} : { params: input.params }),
        ...(input.headers === undefined ? {} : { headers: input.headers }),
        ...(body === undefined ? {} : { body: { mode: "json", value: body } }),
        responseMode: input.responseMode ?? descriptor.responseMode ?? "json",
        ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
        ...(input.sensitive === undefined ? {} : { sensitive: input.sensitive }),
    };
    const invocation = {
        ...(input.control === undefined ? {} : { control: input.control }),
        reason: input.reason ?? `admin.${descriptor.name}`,
    };
    if (descriptor.name !== "email.receiptAttachment") {
        return http.request(request, invocation);
    }
    const response = await http.requestRaw(request, invocation);
    const headers = readResponseHeaders(response.metadata);
    return {
        filename: dispositionFilename(headers["content-disposition"] ?? ""),
        content_type: headers["content-type"] ?? "",
        data: response.payload,
    };
}
async function executeUpload(path, input, http, uploads) {
    if (uploads === undefined) {
        throw new TypeError("Admin upload methods require an explicit upload service.");
    }
    if (input.upload === undefined) {
        throw new TypeError("Admin upload method input.upload is required.");
    }
    await http.preflight("admin.upload.preflight");
    const result = await uploads.upload(Object.freeze({ ...input.upload, path }));
    await http.invalidateCache();
    return result;
}
async function executeMemberPicture(descriptor, input, http, uploads) {
    const uploadRoute = descriptor.routes.find((route) => route.path === "/auth/members/uploads");
    const createRoute = descriptor.routes.find((route) => route.path === "/auth/members/native");
    const upload = await executeUpload(uploadRoute.path, input, http, uploads);
    const uploadRecord = requireWireObject(upload, "member picture upload response");
    const uploadId = requireNonEmptyString(uploadRecord.upload_id, "member picture upload_id");
    const body = input.body === undefined ? {} : requireWireObject(input.body, "member create body");
    const persona = body.persona === undefined ? {} : requireWireObject(body.persona, "member create persona");
    const { upload: _upload, ...requestInput } = input;
    return executeRequest({ ...descriptor, kind: "request", routes: [createRoute] }, createRoute, createRoute.path, {
        ...requestInput,
        body: { ...body, persona: { ...persona, picture: uploadId } },
    }, http);
}
function createRequestBody(descriptor, input) {
    if (descriptor.command === undefined) {
        return input.body;
    }
    if (input.body !== undefined) {
        throw new TypeError(`${descriptor.name} accepts command/args rather than body.`);
    }
    const command = descriptor.command.name === ""
        ? requireNonEmptyString(input.command, "system.cmd command")
        : descriptor.command.name;
    const args = (input.args ?? []).map((value, index) => requireNonEmptyString(value, `${descriptor.name} args[${index}]`));
    return Object.freeze({
        command,
        args: Object.freeze([...descriptor.command.prefix, ...args]),
    });
}
function selectRoute(descriptor, input) {
    if (input.route !== undefined) {
        const selected = descriptor.routes.find((route) => route.sourceKey === input.route);
        if (selected === undefined) {
            throw new TypeError(`${descriptor.name} does not map to authority route ${JSON.stringify(input.route)}.`);
        }
        assertRouteParameters(selected.path, input.path);
        return selected;
    }
    const available = descriptor.routes.filter((route) => hasRouteParameters(route.path, input.path));
    if (available.length === 0) {
        assertRouteParameters(descriptor.routes[0]?.path ?? "", input.path);
        throw new TypeError(`${descriptor.name} has no usable authority route.`);
    }
    return [...available].sort((left, right) => routeParameterNames(right.path).length - routeParameterNames(left.path).length)[0];
}
function expandRoute(template, values) {
    assertRouteParameters(template, values);
    return template.replace(/\{([A-Za-z0-9_]+)(\.\.\.)?\}/g, (_match, name, rest) => {
        const value = requirePathValue(values?.[name], name);
        if (rest === undefined) {
            return encodeURIComponent(value);
        }
        return value.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    });
}
function hasRouteParameters(template, values) {
    return routeParameterNames(template).every((name) => values?.[name] !== undefined);
}
function assertRouteParameters(template, values) {
    const missing = routeParameterNames(template).filter((name) => values?.[name] === undefined);
    if (missing.length > 0) {
        throw new TypeError(`Admin route ${template} requires path value(s): ${missing.join(", ")}.`);
    }
}
function routeParameterNames(template) {
    return [...template.matchAll(/\{([A-Za-z0-9_]+)(?:\.\.\.)?\}/g)].map((match) => match[1]);
}
function requirePathValue(value, name) {
    if (typeof value === "number") {
        if (!Number.isFinite(value))
            throw new TypeError(`Admin path value ${name} must be finite.`);
        return String(value);
    }
    return requireNonEmptyString(value, `Admin path value ${name}`);
}
function appendParams(path, params) {
    if (params === undefined)
        return path;
    const encoded = Object.keys(params).sort().flatMap((key) => {
        const value = params[key];
        return value === null || value === undefined
            ? []
            : [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`];
    });
    return encoded.length === 0 ? path : `${path}${path.includes("?") ? "&" : "?"}${encoded.join("&")}`;
}
function normalizeInput(input) {
    if (input === undefined)
        return Object.freeze({});
    if (!isPlainObject(input))
        throw new TypeError("Admin method input must be a plain object.");
    return input;
}
function requireDescriptor(name) {
    const descriptor = descriptorsByName.get(name);
    if (descriptor === undefined)
        throw new TypeError(`Unknown admin method ${JSON.stringify(name)}.`);
    return descriptor;
}
function installMethod(root, path, method) {
    const parts = path.split(".");
    let target = root;
    for (const part of parts.slice(0, -1)) {
        const current = target[part];
        if (current === undefined) {
            const next = {};
            target[part] = next;
            target = next;
        }
        else {
            target = current;
        }
    }
    target[parts.at(-1)] = method;
}
function readResponseHeaders(metadata) {
    if (!isPlainObject(metadata) || !isPlainObject(metadata.headers))
        return Object.freeze({});
    const headers = {};
    for (const [key, value] of Object.entries(metadata.headers)) {
        if (typeof value === "string")
            headers[key.toLowerCase()] = value;
    }
    return Object.freeze(headers);
}
function dispositionFilename(disposition) {
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    if (encoded !== undefined) {
        try {
            return decodeURIComponent(encoded.trim());
        }
        catch {
            return encoded.trim();
        }
    }
    return /filename="?([^";]+)"?/i.exec(disposition)?.[1]?.trim() ?? "";
}
function requireWireObject(value, label) {
    if (!isPlainObject(value) || isReadonlyBytes(value))
        throw new TypeError(`${label} must be an object.`);
    return value;
}
function isPlainObject(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value) || isReadonlyBytes(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function requireNonEmptyString(value, label) {
    if (typeof value !== "string" || value.trim() === "")
        throw new TypeError(`${label} must be a non-empty string.`);
    return value.trim();
}
function deepFreeze(value, seen = new WeakSet()) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null)
        return value;
    if (seen.has(value))
        return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value))
        deepFreeze(value[key], seen);
    return Object.freeze(value);
}
//# sourceMappingURL=client.js.map