import type { AdminPathValue, AdminRouteMethod, AdminUrlHelper } from "./types.js";
export declare const adminMethodDescriptors: readonly [Readonly<{
    name: "agents.admin.aiArrest";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/agents/ai-arrest";
        sourceKey: "POST /api/agents/ai-arrest";
    }>[];
}>, Readonly<{
    name: "agents.admin.aiRelease";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/agents/ai-arrest/release";
        sourceKey: "POST /api/agents/ai-arrest/release";
    }>[];
}>, Readonly<{
    name: "agents.admin.approvals.cancel";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/approvals/{gateID}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/threads/{threadID}/approvals/{gateID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.approvals.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/approvals";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/approvals";
    }>[];
}>, Readonly<{
    name: "agents.admin.approvals.decide";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/approvals/{gateID}/decide";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/approvals/{gateID}/decide";
    }>[];
}>, Readonly<{
    name: "agents.admin.approvals.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/approvals/{gateID}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/threads/{threadID}/approvals/{gateID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.audit";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/audit";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/audit";
    }>[];
}>, Readonly<{
    name: "agents.admin.blobs.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/blobs/{path...}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/blobs/{path...}";
    }>[];
}>, Readonly<{
    name: "agents.admin.blobs.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/blobs/{path...}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/blobs/{path...}";
    }>[];
}>, Readonly<{
    name: "agents.admin.blobs.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/blobs";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/blobs";
    }>[];
}>, Readonly<{
    name: "agents.admin.blobs.put";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/apps/{id}/agents/{folder}/blobs/{path...}";
        sourceKey: "PUT /api/apps/{id}/agents/{folder}/blobs/{path...}";
    }>[];
}>, Readonly<{
    name: "agents.admin.brain.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/brain";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/brain";
    }>[];
}>, Readonly<{
    name: "agents.admin.brain.overlay.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/brain-overlay";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/brain-overlay";
    }>[];
}>, Readonly<{
    name: "agents.admin.brain.overlay.remove";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/brain-overlay/{name}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/brain-overlay/{name}";
    }>[];
}>, Readonly<{
    name: "agents.admin.brain.overlay.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/apps/{id}/agents/{folder}/brain-overlay/{name}";
        sourceKey: "PUT /api/apps/{id}/agents/{folder}/brain-overlay/{name}";
    }>[];
}>, Readonly<{
    name: "agents.admin.brain.read";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/brain/{path...}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/brain/{path...}";
    }>[];
}>, Readonly<{
    name: "agents.admin.delegate";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/delegate";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/delegate";
    }>[];
}>, Readonly<{
    name: "agents.admin.delegation.cancel";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/delegations/{delegationID}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/delegations/{delegationID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.delegation.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/delegations/{delegationID}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/delegations/{delegationID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.aggregate";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/aggregate";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/ds/{collection}/aggregate";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.count";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/count";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/ds/{collection}/count";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/{docID}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/ds/{collection}/{docID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.find";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/find";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/ds/{collection}/find";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.findOne";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/find-one";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/ds/{collection}/find-one";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.insert";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/ds/{collection}";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.search";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/search";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/ds/{collection}/search";
    }>[];
}>, Readonly<{
    name: "agents.admin.ds.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/apps/{id}/agents/{folder}/ds/{collection}/{docID}";
        sourceKey: "PUT /api/apps/{id}/agents/{folder}/ds/{collection}/{docID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.emit";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/emit";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/emit";
    }>[];
}>, Readonly<{
    name: "agents.admin.inspect";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/inspect";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/inspect";
    }>[];
}>, Readonly<{
    name: "agents.admin.job";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/jobs/{jobID}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/jobs/{jobID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.kv.cas";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/kv/{key}/cas";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/kv/{key}/cas";
    }>[];
}>, Readonly<{
    name: "agents.admin.kv.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/kv/{key}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/kv/{key}";
    }>[];
}>, Readonly<{
    name: "agents.admin.kv.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/kv/{key}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/kv/{key}";
    }>[];
}>, Readonly<{
    name: "agents.admin.kv.increment";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/kv/{key}/increment";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/kv/{key}/increment";
    }>[];
}>, Readonly<{
    name: "agents.admin.kv.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/kv";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/kv";
    }>[];
}>, Readonly<{
    name: "agents.admin.kv.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/apps/{id}/agents/{folder}/kv/{key}";
        sourceKey: "PUT /api/apps/{id}/agents/{folder}/kv/{key}";
    }>[];
}>, Readonly<{
    name: "agents.admin.logs";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/logs";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/logs";
    }>[];
}>, Readonly<{
    name: "agents.admin.members.lookup";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/members/lookup";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/members/lookup";
    }>[];
}>, Readonly<{
    name: "agents.admin.members.presence";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/members/{memberID}/presence";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/members/{memberID}/presence";
    }>[];
}>, Readonly<{
    name: "agents.admin.message";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/message";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/message";
    }>[];
}>, Readonly<{
    name: "agents.admin.pause";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/pause";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/pause";
    }>[];
}>, Readonly<{
    name: "agents.admin.replay";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/replay/{triggerID}";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/replay/{triggerID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.resume";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/resume";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/resume";
    }>[];
}>, Readonly<{
    name: "agents.admin.schedules.cancel";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/schedules/{scheduleID}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/schedules/{scheduleID}";
    }>[];
}>, Readonly<{
    name: "agents.admin.schedules.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/schedules";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/schedules";
    }>[];
}>, Readonly<{
    name: "agents.admin.schedules.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/schedules";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/schedules";
    }>[];
}>, Readonly<{
    name: "agents.admin.send";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/agents/{folder}/send";
        sourceKey: "POST /api/apps/{id}/agents/{folder}/send";
    }>[];
}>, Readonly<{
    name: "agents.admin.threadMessages";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/messages";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/threads/{threadID}/messages";
    }>[];
}>, Readonly<{
    name: "agents.admin.threads.annotate";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/annotations/{key}";
        sourceKey: "PUT /api/apps/{id}/agents/{folder}/threads/{threadID}/annotations/{key}";
    }>[];
}>, Readonly<{
    name: "agents.admin.threads.annotation";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/annotations/{key}";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/threads/{threadID}/annotations/{key}";
    }>[];
}>, Readonly<{
    name: "agents.admin.threads.annotations";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/annotations";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/threads/{threadID}/annotations";
    }>[];
}>, Readonly<{
    name: "agents.admin.threads.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/threads";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/threads";
    }>[];
}>, Readonly<{
    name: "agents.admin.threads.removeAnnotation";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/agents/{folder}/threads/{threadID}/annotations/{key}";
        sourceKey: "DELETE /api/apps/{id}/agents/{folder}/threads/{threadID}/annotations/{key}";
    }>[];
}>, Readonly<{
    name: "agents.admin.usage";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/agents/{folder}/usage";
        sourceKey: "GET /api/apps/{id}/agents/{folder}/usage";
    }>[];
}>, Readonly<{
    name: "agents.errors";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/_holm/errors";
        sourceKey: "GET /_holm/errors";
    }>[];
}>, Readonly<{
    name: "agents.info";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/_holm/info";
        sourceKey: "GET /_holm/info";
    }>[];
}>, Readonly<{
    name: "agents.logs";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/_holm/logs";
        sourceKey: "GET /_holm/logs";
    }>[];
}>, Readonly<{
    name: "agents.snapshot.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/_holm/snapshot";
        sourceKey: "POST /_holm/snapshot";
    }>[];
}>, Readonly<{
    name: "agents.snapshot.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/_holm/snapshots";
        sourceKey: "GET /_holm/snapshots";
    }>[];
}>, Readonly<{
    name: "agents.snapshot.restore";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/_holm/restore/{name}";
        sourceKey: "POST /_holm/restore/{name}";
    }>[];
}>, Readonly<{
    name: "agents.storage.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/_holm/storage/{key}";
        sourceKey: "GET /_holm/storage/{key}";
    }>[];
}>, Readonly<{
    name: "agents.storage.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/_holm/storage";
        sourceKey: "GET /_holm/storage";
    }>[];
}>, Readonly<{
    name: "apps.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps";
        sourceKey: "POST /api/apps";
    }>[];
}>, Readonly<{
    name: "apps.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}";
        sourceKey: "DELETE /api/apps/{id}";
    }>[];
}>, Readonly<{
    name: "apps.deploy";
    kind: "upload";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/deploy";
        sourceKey: "/api/deploy";
    }>[];
}>, Readonly<{
    name: "apps.file";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/files/{path...}";
        sourceKey: "GET /api/apps/{id}/files/{path...}";
    }>[];
}>, Readonly<{
    name: "apps.files";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/files";
        sourceKey: "GET /api/apps/{id}/files";
    }>[];
}>, Readonly<{
    name: "apps.fork";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/fork";
        sourceKey: "POST /api/apps/{id}/fork";
    }>[];
}>, Readonly<{
    name: "apps.forks";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/forks";
        sourceKey: "GET /api/apps/{id}/forks";
    }>[];
}>, Readonly<{
    name: "apps.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}";
        sourceKey: "GET /api/apps/{id}";
    }>[];
}>, Readonly<{
    name: "apps.install";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/install";
        sourceKey: "POST /api/apps/install";
    }>[];
}>, Readonly<{
    name: "apps.lineage";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/lineage";
        sourceKey: "GET /api/apps/{id}/lineage";
    }>[];
}>, Readonly<{
    name: "apps.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps";
        sourceKey: "GET /api/apps";
    }>[];
}>, Readonly<{
    name: "apps.source";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/source";
        sourceKey: "GET /api/apps/{id}/source";
    }>[];
}>, Readonly<{
    name: "apps.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/status";
        sourceKey: "GET /api/apps/{id}/status";
    }>[];
}>, Readonly<{
    name: "apps.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/apps/{id}";
        sourceKey: "PUT /api/apps/{id}";
    }>[];
}>, Readonly<{
    name: "auth.configureProvider";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/auth/providers/{name}";
        sourceKey: "PUT /api/auth/providers/{name}";
    }>[];
}>, Readonly<{
    name: "auth.login";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/login";
        sourceKey: "/api/login";
    }>[];
}>, Readonly<{
    name: "auth.me";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/user/me";
        sourceKey: "/api/user/me";
    }>[];
}>, Readonly<{
    name: "auth.providerDefaultHost.clear";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/auth/provider-default-host";
        sourceKey: "DELETE /api/auth/provider-default-host";
    }>[];
}>, Readonly<{
    name: "auth.providerDefaultHost.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/auth/provider-default-host";
        sourceKey: "GET /api/auth/provider-default-host";
    }>[];
}>, Readonly<{
    name: "auth.providerDefaultHost.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/auth/provider-default-host";
        sourceKey: "PUT /api/auth/provider-default-host";
    }>[];
}>, Readonly<{
    name: "auth.providers";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/auth/providers";
        sourceKey: "GET /api/auth/providers";
    }>[];
}>, Readonly<{
    name: "auth.session";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/session";
        sourceKey: "GET /auth/session";
    }>[];
}>, Readonly<{
    name: "auth.signOut";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/logout";
        sourceKey: "POST /auth/logout";
    }>[];
}>, Readonly<{
    name: "auth.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/auth/status";
        sourceKey: "/api/auth/status";
    }>[];
}>, Readonly<{
    name: "dataset.source";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "dataset";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "dataset.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "dataset";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "dataset.sync";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "dataset";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "delivery.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "delivery";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "delivery.retry";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "delivery";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "deploy.history";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/deployments";
        sourceKey: "/api/deployments";
    }>[];
}>, Readonly<{
    name: "deploy.upload";
    kind: "upload";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/deploy";
        sourceKey: "/api/deploy";
    }>[];
}>, Readonly<{
    name: "email.receiptAttachment";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/email/receipts/{id}/attachment";
        sourceKey: "GET /api/email/receipts/{id}/attachment";
    }>[];
    responseMode: "binary";
}>, Readonly<{
    name: "email.send";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/email/send";
        sourceKey: "POST /api/email/send";
    }>[];
}>, Readonly<{
    name: "envvars.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/envvars";
        sourceKey: "/api/envvars";
    }>[];
}>, Readonly<{
    name: "envvars.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/envvars";
        sourceKey: "/api/envvars";
    }>[];
}>, Readonly<{
    name: "envvars.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/envvars";
        sourceKey: "/api/envvars";
    }>[];
}>, Readonly<{
    name: "hosts.add";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/hosts";
        sourceKey: "POST /api/hosts";
    }>[];
}>, Readonly<{
    name: "hosts.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/hosts";
        sourceKey: "POST /api/hosts";
    }>[];
}>, Readonly<{
    name: "hosts.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/hosts/{host}";
        sourceKey: "DELETE /api/hosts/{host}";
    }>[];
}>, Readonly<{
    name: "hosts.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/hosts/{host}";
        sourceKey: "GET /api/hosts/{host}";
    }>[];
}>, Readonly<{
    name: "hosts.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/hosts";
        sourceKey: "GET /api/hosts";
    }>[];
}>, Readonly<{
    name: "hosts.unknown";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/hosts/unknown";
        sourceKey: "GET /api/hosts/unknown";
    }>[];
}>, Readonly<{
    name: "hosts.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/hosts/{host}";
        sourceKey: "PUT /api/hosts/{host}";
    }>[];
}>, Readonly<{
    name: "invites.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/invite";
        sourceKey: "POST /auth/invite";
    }>[];
}>, Readonly<{
    name: "invites.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/invite/{code}";
        sourceKey: "GET /auth/invite/{code}";
    }>[];
}>, Readonly<{
    name: "invites.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/invites";
        sourceKey: "GET /auth/invites";
    }>[];
}>, Readonly<{
    name: "invites.redeem";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/invite/{code}";
        sourceKey: "POST /auth/invite/{code}";
    }>[];
}>, Readonly<{
    name: "keys.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/keys";
        sourceKey: "/api/keys";
    }>[];
}>, Readonly<{
    name: "keys.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/keys";
        sourceKey: "/api/keys";
    }>[];
}>, Readonly<{
    name: "keys.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/keys";
        sourceKey: "/api/keys";
    }>[];
}>, Readonly<{
    name: "labels.bind";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/labels/{label}/bindings";
        sourceKey: "POST /api/labels/{label}/bindings";
    }>[];
}>, Readonly<{
    name: "labels.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/labels";
        sourceKey: "POST /api/labels";
    }>[];
}>, Readonly<{
    name: "labels.info";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/labels/{label}";
        sourceKey: "GET /api/labels/{label}";
    }>[];
}>, Readonly<{
    name: "labels.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/labels";
        sourceKey: "GET /api/labels";
    }>[];
}>, Readonly<{
    name: "labels.unbind";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/labels/{label}/bindings/{member}";
        sourceKey: "DELETE /api/labels/{label}/bindings/{member}";
    }>[];
}>, Readonly<{
    name: "labels.unwatch";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/labels/{label}/watches/{member}";
        sourceKey: "DELETE /api/labels/{label}/watches/{member}";
    }>[];
}>, Readonly<{
    name: "labels.watch";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/labels/{label}/watches";
        sourceKey: "POST /api/labels/{label}/watches";
    }>[];
}>, Readonly<{
    name: "lifecycle.restart";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/restart";
        sourceKey: "POST /api/restart";
    }>[];
}>, Readonly<{
    name: "lifecycle.stop";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/stop";
        sourceKey: "POST /api/stop";
    }>[];
}>, Readonly<{
    name: "lifecycle.upgrade";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/upgrade";
        sourceKey: "POST /api/upgrade";
    }>[];
}>, Readonly<{
    name: "links.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/links";
        sourceKey: "/api/apps/{id}/links";
    }>[];
}>, Readonly<{
    name: "links.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/links/{idOrSlug}";
        sourceKey: "/api/apps/{id}/links/{idOrSlug}";
    }>[];
}>, Readonly<{
    name: "links.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/links/{idOrSlug}";
        sourceKey: "/api/apps/{id}/links/{idOrSlug}";
    }>[];
}>, Readonly<{
    name: "links.import";
    kind: "upload";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/links/import";
        sourceKey: "POST /api/apps/{id}/links/import";
    }>[];
}>, Readonly<{
    name: "links.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/apps/{id}/links";
        sourceKey: "/api/apps/{id}/links";
    }>[];
}>, Readonly<{
    name: "links.revokeExpired";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/links";
        sourceKey: "/api/apps/{id}/links";
    }>[];
}>, Readonly<{
    name: "links.suspend";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/links/{idOrSlug}/suspend";
        sourceKey: "POST /api/apps/{id}/links/{idOrSlug}/suspend";
    }>[];
}>, Readonly<{
    name: "links.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PATCH";
        path: "/api/apps/{id}/links/{idOrSlug}";
        sourceKey: "/api/apps/{id}/links/{idOrSlug}";
    }>[];
}>, Readonly<{
    name: "logs.app";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/logs";
        sourceKey: "GET /api/system/logs";
    }>[];
}>, Readonly<{
    name: "logs.cleanup";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/system/logs/cleanup";
        sourceKey: "POST /api/system/logs/cleanup";
    }>[];
}>, Readonly<{
    name: "logs.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/logs";
        sourceKey: "GET /api/system/logs";
    }>[];
}>, Readonly<{
    name: "logs.runtime";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/logs";
        sourceKey: "/api/logs";
    }>[];
}>, Readonly<{
    name: "logs.runtimeStreamUrl";
    kind: "url";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/logs/stream";
        sourceKey: "/api/logs/stream";
    }>[];
}>, Readonly<{
    name: "logs.stats";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/logs/stats";
        sourceKey: "GET /api/system/logs/stats";
    }>[];
}>, Readonly<{
    name: "logs.streamUrl";
    kind: "url";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/logs/stream";
        sourceKey: "GET /api/system/logs/stream";
    }>[];
}>, Readonly<{
    name: "members.add";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/apps/{id}/members";
        sourceKey: "/api/apps/{id}/members";
    }>[];
}>, Readonly<{
    name: "members.approve";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/members/{identifier}/approve";
        sourceKey: "POST /auth/members/{identifier}/approve";
    }>[];
}>, Readonly<{
    name: "members.createNative";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/members/native";
        sourceKey: "POST /auth/members/native";
    }>[];
}>, Readonly<{
    name: "members.createNativeGeneratedAvatar";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/members/native";
        sourceKey: "POST /auth/members/native";
    }>[];
}>, Readonly<{
    name: "members.createNativeWithPicture";
    kind: "composite-upload";
    routes: readonly (Readonly<{
        method: "POST";
        path: "/auth/members/native";
        sourceKey: "POST /auth/members/native";
    }> | Readonly<{
        method: "POST";
        path: "/auth/members/uploads";
        sourceKey: "POST /auth/members/uploads";
    }>)[];
}>, Readonly<{
    name: "members.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/members/{identifier}";
        sourceKey: "GET /auth/members/{identifier}";
    }>[];
}>, Readonly<{
    name: "members.getProfile";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/members/{identifier}/profile";
        sourceKey: "GET /auth/members/{identifier}/profile";
    }>[];
}>, Readonly<{
    name: "members.issueToken";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/members/{identifier}/tokens";
        sourceKey: "POST /auth/members/{identifier}/tokens";
    }>[];
}>, Readonly<{
    name: "members.list";
    kind: "request";
    routes: readonly (Readonly<{
        method: "GET";
        path: "/auth/members";
        sourceKey: "GET /auth/members";
    }> | Readonly<{
        method: "GET";
        path: "/api/apps/{id}/members";
        sourceKey: "/api/apps/{id}/members";
    }>)[];
}>, Readonly<{
    name: "members.remove";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/apps/{id}/members/{memberID}";
        sourceKey: "DELETE /api/apps/{id}/members/{memberID}";
    }>[];
}>, Readonly<{
    name: "members.updateProfile";
    kind: "request";
    routes: readonly Readonly<{
        method: "PATCH";
        path: "/auth/members/{identifier}/profile";
        sourceKey: "PATCH /auth/members/{identifier}/profile";
    }>[];
}>, Readonly<{
    name: "members.updateStatus";
    kind: "request";
    routes: readonly Readonly<{
        method: "PATCH";
        path: "/auth/members/{identifier}/status";
        sourceKey: "PATCH /auth/members/{identifier}/status";
    }>[];
}>, Readonly<{
    name: "members.uploadPicture";
    kind: "upload";
    routes: readonly Readonly<{
        method: "POST";
        path: "/auth/members/uploads";
        sourceKey: "POST /auth/members/uploads";
    }>[];
}>, Readonly<{
    name: "net.allow";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "net";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "net.allowAny";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "net";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "net.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "net";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "net.remove";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "net";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "net.removeAny";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "net";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "notifications.ack";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/notifications/{id}/ack";
        sourceKey: "POST /api/notifications/{id}/ack";
    }>[];
}>, Readonly<{
    name: "notifications.attempts";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/notifications/{id}/attempts";
        sourceKey: "GET /api/notifications/{id}/attempts";
    }>[];
}>, Readonly<{
    name: "notifications.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/notifications";
        sourceKey: "/api/notifications";
    }>[];
}>, Readonly<{
    name: "notifications.send";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/notifications";
        sourceKey: "/api/notifications";
    }>[];
}>, Readonly<{
    name: "peer.add";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "peer";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "peer.check";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "peer";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "peer.default";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "peer";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "peer.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "peer";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "peer.remove";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "peer";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "peer.updateToken";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "peer";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "presentation.inspect";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "presentation";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "provider.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "provider";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "provider.remove";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "provider";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "provider.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "provider";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "redirects.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/redirects";
        sourceKey: "/api/redirects";
    }>[];
}>, Readonly<{
    name: "redirects.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/redirects/{id}";
        sourceKey: "DELETE /api/redirects/{id}";
    }>[];
}>, Readonly<{
    name: "redirects.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/redirects";
        sourceKey: "/api/redirects";
    }>[];
}>, Readonly<{
    name: "secrets.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "secret";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "secrets.remove";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "secret";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "secrets.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "secret";
        prefix: readonly string[];
    }>;
}>, Readonly<{
    name: "securityTxt.disable";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/security-txt";
        sourceKey: "/api/security-txt";
    }>[];
}>, Readonly<{
    name: "securityTxt.set";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/security-txt";
        sourceKey: "/api/security-txt";
    }>[];
}>, Readonly<{
    name: "securityTxt.show";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/security-txt";
        sourceKey: "/api/security-txt";
    }>[];
}>, Readonly<{
    name: "spaces.invites.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/spaces/{space}/invites";
        sourceKey: "POST /api/spaces/{space}/invites";
    }>[];
}>, Readonly<{
    name: "spaces.invites.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/spaces/{space}/invites";
        sourceKey: "GET /api/spaces/{space}/invites";
    }>[];
}>, Readonly<{
    name: "spaces.invites.revoke";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/spaces/{space}/invites/{invite}/revoke";
        sourceKey: "POST /api/spaces/{space}/invites/{invite}/revoke";
    }>[];
}>, Readonly<{
    name: "spaces.keys.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/spaces/{space}/keys";
        sourceKey: "POST /api/spaces/{space}/keys";
    }>[];
}>, Readonly<{
    name: "spaces.keys.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/spaces/{space}/keys";
        sourceKey: "GET /api/spaces/{space}/keys";
    }>[];
}>, Readonly<{
    name: "spaces.keys.revoke";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/spaces/{space}/keys/{key}/revoke";
        sourceKey: "POST /api/spaces/{space}/keys/{key}/revoke";
    }>[];
}>, Readonly<{
    name: "spaces.member.acceptInvite";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/invites/{token}/accept";
        sourceKey: "POST /api/invites/{token}/accept";
    }>[];
}>, Readonly<{
    name: "spaces.member.dashboard";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/dashboard";
        sourceKey: "GET /api/dashboard";
    }>[];
}>, Readonly<{
    name: "spaces.member.lookupInvite";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/invites/{token}";
        sourceKey: "GET /api/invites/{token}";
    }>[];
}>, Readonly<{
    name: "spaces.resume";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/spaces/{space}/resume";
        sourceKey: "POST /api/spaces/{space}/resume";
    }>[];
}>, Readonly<{
    name: "spaces.suspend";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/spaces/{space}/suspend";
        sourceKey: "POST /api/spaces/{space}/suspend";
    }>[];
}>, Readonly<{
    name: "stats.analytics";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/stats";
        sourceKey: "/api/stats";
    }>[];
}>, Readonly<{
    name: "system.benchmark";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/benchmark";
        sourceKey: "GET /api/system/benchmark";
    }>[];
}>, Readonly<{
    name: "system.cache";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/cache";
        sourceKey: "GET /api/system/cache";
    }>[];
}>, Readonly<{
    name: "system.cmd";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/cmd";
        sourceKey: "POST /api/cmd";
    }>[];
    command: Readonly<{
        name: "";
        prefix: readonly never[];
    }>;
}>, Readonly<{
    name: "system.config";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/config";
        sourceKey: "GET /api/system/config";
    }>[];
}>, Readonly<{
    name: "system.db";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/db";
        sourceKey: "GET /api/system/db";
    }>[];
}>, Readonly<{
    name: "system.dbInspect";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/db/inspect";
        sourceKey: "GET /api/system/db/inspect";
    }>[];
}>, Readonly<{
    name: "system.health";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/health";
        sourceKey: "GET /api/system/health";
    }>[];
}>, Readonly<{
    name: "system.policy";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/policy";
        sourceKey: "GET /api/system/policy";
    }>[];
}>, Readonly<{
    name: "system.policySchema";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/policy/schema";
        sourceKey: "GET /api/system/policy/schema";
    }>[];
}>, Readonly<{
    name: "system.sql";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/sql";
        sourceKey: "POST /api/sql";
    }>[];
}>, Readonly<{
    name: "system.stats";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/system/stats";
        sourceKey: "GET /api/system/stats";
    }>[];
}>, Readonly<{
    name: "system.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/.holm/status";
        sourceKey: "GET /.holm/status";
    }>[];
}>, Readonly<{
    name: "templates.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/templates";
        sourceKey: "GET /api/templates";
    }>[];
}>, Readonly<{
    name: "users.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/auth/users/{id}";
        sourceKey: "DELETE /auth/users/{id}";
    }>[];
}>, Readonly<{
    name: "users.get";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/users/{id}";
        sourceKey: "GET /auth/users/{id}";
    }>[];
}>, Readonly<{
    name: "users.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/auth/users";
        sourceKey: "GET /auth/users";
    }>[];
}>, Readonly<{
    name: "users.status";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/users/{id}/status";
        sourceKey: "GET /api/users/{id}/status";
    }>[];
}>, Readonly<{
    name: "users.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PATCH";
        path: "/auth/users/{id}";
        sourceKey: "PATCH /auth/users/{id}";
    }>[];
}>, Readonly<{
    name: "webhooks.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/webhooks";
        sourceKey: "/api/webhooks";
    }>[];
}>, Readonly<{
    name: "webhooks.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/webhooks/{id}";
        sourceKey: "DELETE /api/webhooks/{id}";
    }>[];
}>, Readonly<{
    name: "webhooks.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/webhooks";
        sourceKey: "/api/webhooks";
    }>[];
}>, Readonly<{
    name: "webhooks.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/webhooks/{id}";
        sourceKey: "PUT /api/webhooks/{id}";
    }>[];
}>, Readonly<{
    name: "webhookSubscriptions.create";
    kind: "request";
    routes: readonly Readonly<{
        method: "POST";
        path: "/api/webhook-subscriptions";
        sourceKey: "/api/webhook-subscriptions";
    }>[];
}>, Readonly<{
    name: "webhookSubscriptions.delete";
    kind: "request";
    routes: readonly Readonly<{
        method: "DELETE";
        path: "/api/webhook-subscriptions/{id}";
        sourceKey: "DELETE /api/webhook-subscriptions/{id}";
    }>[];
}>, Readonly<{
    name: "webhookSubscriptions.list";
    kind: "request";
    routes: readonly Readonly<{
        method: "GET";
        path: "/api/webhook-subscriptions";
        sourceKey: "/api/webhook-subscriptions";
    }>[];
}>, Readonly<{
    name: "webhookSubscriptions.update";
    kind: "request";
    routes: readonly Readonly<{
        method: "PUT";
        path: "/api/webhook-subscriptions/{id}";
        sourceKey: "PUT /api/webhook-subscriptions/{id}";
    }>[];
}>];
export type AdminMethodName = (typeof adminMethodDescriptors)[number]["name"];
export interface AdminGeneratedApi {
    readonly agents: {
        readonly admin: {
            readonly aiArrest: AdminRouteMethod<"agents.admin.aiArrest", Record<never, AdminPathValue>, false, false>;
            readonly aiRelease: AdminRouteMethod<"agents.admin.aiRelease", Record<never, AdminPathValue>, false, false>;
            readonly approvals: {
                readonly cancel: AdminRouteMethod<"agents.admin.approvals.cancel", {
                    readonly folder: AdminPathValue;
                    readonly gateID: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly threadID: AdminPathValue;
                }, true, true>;
                readonly create: AdminRouteMethod<"agents.admin.approvals.create", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly decide: AdminRouteMethod<"agents.admin.approvals.decide", {
                    readonly folder: AdminPathValue;
                    readonly gateID: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly status: AdminRouteMethod<"agents.admin.approvals.status", {
                    readonly folder: AdminPathValue;
                    readonly gateID: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly threadID: AdminPathValue;
                }, true, true>;
            };
            readonly audit: AdminRouteMethod<"agents.admin.audit", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly blobs: {
                readonly delete: AdminRouteMethod<"agents.admin.blobs.delete", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly path: AdminPathValue;
                }, true, true>;
                readonly get: AdminRouteMethod<"agents.admin.blobs.get", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly path: AdminPathValue;
                }, true, true>;
                readonly list: AdminRouteMethod<"agents.admin.blobs.list", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly put: AdminRouteMethod<"agents.admin.blobs.put", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly path: AdminPathValue;
                }, true, true>;
            };
            readonly brain: {
                readonly list: AdminRouteMethod<"agents.admin.brain.list", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly overlay: {
                    readonly list: AdminRouteMethod<"agents.admin.brain.overlay.list", {
                        readonly folder: AdminPathValue;
                        readonly id: AdminPathValue;
                    }, true, true>;
                    readonly remove: AdminRouteMethod<"agents.admin.brain.overlay.remove", {
                        readonly folder: AdminPathValue;
                        readonly id: AdminPathValue;
                        readonly name: AdminPathValue;
                    }, true, true>;
                    readonly set: AdminRouteMethod<"agents.admin.brain.overlay.set", {
                        readonly folder: AdminPathValue;
                        readonly id: AdminPathValue;
                        readonly name: AdminPathValue;
                    }, true, true>;
                };
                readonly read: AdminRouteMethod<"agents.admin.brain.read", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly path: AdminPathValue;
                }, true, true>;
            };
            readonly delegate: AdminRouteMethod<"agents.admin.delegate", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly delegation: {
                readonly cancel: AdminRouteMethod<"agents.admin.delegation.cancel", {
                    readonly delegationID: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly status: AdminRouteMethod<"agents.admin.delegation.status", {
                    readonly delegationID: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
            };
            readonly ds: {
                readonly aggregate: AdminRouteMethod<"agents.admin.ds.aggregate", {
                    readonly collection: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly count: AdminRouteMethod<"agents.admin.ds.count", {
                    readonly collection: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly delete: AdminRouteMethod<"agents.admin.ds.delete", {
                    readonly collection: AdminPathValue;
                    readonly docID: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly find: AdminRouteMethod<"agents.admin.ds.find", {
                    readonly collection: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly findOne: AdminRouteMethod<"agents.admin.ds.findOne", {
                    readonly collection: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly insert: AdminRouteMethod<"agents.admin.ds.insert", {
                    readonly collection: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly search: AdminRouteMethod<"agents.admin.ds.search", {
                    readonly collection: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly update: AdminRouteMethod<"agents.admin.ds.update", {
                    readonly collection: AdminPathValue;
                    readonly docID: AdminPathValue;
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
            };
            readonly emit: AdminRouteMethod<"agents.admin.emit", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly inspect: AdminRouteMethod<"agents.admin.inspect", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly job: AdminRouteMethod<"agents.admin.job", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
                readonly jobID: AdminPathValue;
            }, true, true>;
            readonly kv: {
                readonly cas: AdminRouteMethod<"agents.admin.kv.cas", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                }, true, true>;
                readonly delete: AdminRouteMethod<"agents.admin.kv.delete", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                }, true, true>;
                readonly get: AdminRouteMethod<"agents.admin.kv.get", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                }, true, true>;
                readonly increment: AdminRouteMethod<"agents.admin.kv.increment", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                }, true, true>;
                readonly list: AdminRouteMethod<"agents.admin.kv.list", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly set: AdminRouteMethod<"agents.admin.kv.set", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                }, true, true>;
            };
            readonly logs: AdminRouteMethod<"agents.admin.logs", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly members: {
                readonly lookup: AdminRouteMethod<"agents.admin.members.lookup", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly presence: AdminRouteMethod<"agents.admin.members.presence", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly memberID: AdminPathValue;
                }, true, true>;
            };
            readonly message: AdminRouteMethod<"agents.admin.message", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly pause: AdminRouteMethod<"agents.admin.pause", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly replay: AdminRouteMethod<"agents.admin.replay", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
                readonly triggerID: AdminPathValue;
            }, true, true>;
            readonly resume: AdminRouteMethod<"agents.admin.resume", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly schedules: {
                readonly cancel: AdminRouteMethod<"agents.admin.schedules.cancel", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly scheduleID: AdminPathValue;
                }, true, true>;
                readonly create: AdminRouteMethod<"agents.admin.schedules.create", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly list: AdminRouteMethod<"agents.admin.schedules.list", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
            };
            readonly send: AdminRouteMethod<"agents.admin.send", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
            readonly threadMessages: AdminRouteMethod<"agents.admin.threadMessages", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
                readonly threadID: AdminPathValue;
            }, true, true>;
            readonly threads: {
                readonly annotate: AdminRouteMethod<"agents.admin.threads.annotate", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                    readonly threadID: AdminPathValue;
                }, true, true>;
                readonly annotation: AdminRouteMethod<"agents.admin.threads.annotation", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                    readonly threadID: AdminPathValue;
                }, true, true>;
                readonly annotations: AdminRouteMethod<"agents.admin.threads.annotations", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly threadID: AdminPathValue;
                }, true, true>;
                readonly list: AdminRouteMethod<"agents.admin.threads.list", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                }, true, true>;
                readonly removeAnnotation: AdminRouteMethod<"agents.admin.threads.removeAnnotation", {
                    readonly folder: AdminPathValue;
                    readonly id: AdminPathValue;
                    readonly key: AdminPathValue;
                    readonly threadID: AdminPathValue;
                }, true, true>;
            };
            readonly usage: AdminRouteMethod<"agents.admin.usage", {
                readonly folder: AdminPathValue;
                readonly id: AdminPathValue;
            }, true, true>;
        };
        readonly errors: AdminRouteMethod<"agents.errors", Record<never, AdminPathValue>, false, false>;
        readonly info: AdminRouteMethod<"agents.info", Record<never, AdminPathValue>, false, false>;
        readonly logs: AdminRouteMethod<"agents.logs", Record<never, AdminPathValue>, false, false>;
        readonly snapshot: {
            readonly create: AdminRouteMethod<"agents.snapshot.create", Record<never, AdminPathValue>, false, false>;
            readonly list: AdminRouteMethod<"agents.snapshot.list", Record<never, AdminPathValue>, false, false>;
            readonly restore: AdminRouteMethod<"agents.snapshot.restore", {
                readonly name: AdminPathValue;
            }, true, true>;
        };
        readonly storage: {
            readonly get: AdminRouteMethod<"agents.storage.get", {
                readonly key: AdminPathValue;
            }, true, true>;
            readonly list: AdminRouteMethod<"agents.storage.list", Record<never, AdminPathValue>, false, false>;
        };
    };
    readonly apps: {
        readonly create: AdminRouteMethod<"apps.create", Record<never, AdminPathValue>, false, false>;
        readonly delete: AdminRouteMethod<"apps.delete", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly deploy: AdminRouteMethod<"apps.deploy", Record<never, AdminPathValue>, false, true>;
        readonly file: AdminRouteMethod<"apps.file", {
            readonly id: AdminPathValue;
            readonly path: AdminPathValue;
        }, true, true>;
        readonly files: AdminRouteMethod<"apps.files", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly fork: AdminRouteMethod<"apps.fork", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly forks: AdminRouteMethod<"apps.forks", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly get: AdminRouteMethod<"apps.get", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly install: AdminRouteMethod<"apps.install", Record<never, AdminPathValue>, false, false>;
        readonly lineage: AdminRouteMethod<"apps.lineage", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"apps.list", Record<never, AdminPathValue>, false, false>;
        readonly source: AdminRouteMethod<"apps.source", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly status: AdminRouteMethod<"apps.status", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly update: AdminRouteMethod<"apps.update", {
            readonly id: AdminPathValue;
        }, true, true>;
    };
    readonly auth: {
        readonly configureProvider: AdminRouteMethod<"auth.configureProvider", {
            readonly name: AdminPathValue;
        }, true, true>;
        readonly login: AdminRouteMethod<"auth.login", Record<never, AdminPathValue>, false, false>;
        readonly me: AdminRouteMethod<"auth.me", Record<never, AdminPathValue>, false, false>;
        readonly providerDefaultHost: {
            readonly clear: AdminRouteMethod<"auth.providerDefaultHost.clear", Record<never, AdminPathValue>, false, false>;
            readonly get: AdminRouteMethod<"auth.providerDefaultHost.get", Record<never, AdminPathValue>, false, false>;
            readonly set: AdminRouteMethod<"auth.providerDefaultHost.set", Record<never, AdminPathValue>, false, false>;
        };
        readonly providers: AdminRouteMethod<"auth.providers", Record<never, AdminPathValue>, false, false>;
        readonly session: AdminRouteMethod<"auth.session", Record<never, AdminPathValue>, false, false>;
        readonly signOut: AdminRouteMethod<"auth.signOut", Record<never, AdminPathValue>, false, false>;
        readonly status: AdminRouteMethod<"auth.status", Record<never, AdminPathValue>, false, false>;
    };
    readonly dataset: {
        readonly source: AdminRouteMethod<"dataset.source", Record<never, AdminPathValue>, false, false>;
        readonly status: AdminRouteMethod<"dataset.status", Record<never, AdminPathValue>, false, false>;
        readonly sync: AdminRouteMethod<"dataset.sync", Record<never, AdminPathValue>, false, false>;
    };
    readonly delivery: {
        readonly list: AdminRouteMethod<"delivery.list", Record<never, AdminPathValue>, false, false>;
        readonly retry: AdminRouteMethod<"delivery.retry", Record<never, AdminPathValue>, false, false>;
    };
    readonly deploy: {
        readonly history: AdminRouteMethod<"deploy.history", Record<never, AdminPathValue>, false, false>;
        readonly upload: AdminRouteMethod<"deploy.upload", Record<never, AdminPathValue>, false, true>;
    };
    readonly email: {
        readonly receiptAttachment: AdminRouteMethod<"email.receiptAttachment", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly send: AdminRouteMethod<"email.send", Record<never, AdminPathValue>, false, false>;
    };
    readonly envvars: {
        readonly delete: AdminRouteMethod<"envvars.delete", Record<never, AdminPathValue>, false, false>;
        readonly list: AdminRouteMethod<"envvars.list", Record<never, AdminPathValue>, false, false>;
        readonly set: AdminRouteMethod<"envvars.set", Record<never, AdminPathValue>, false, false>;
    };
    readonly hosts: {
        readonly add: AdminRouteMethod<"hosts.add", Record<never, AdminPathValue>, false, false>;
        readonly create: AdminRouteMethod<"hosts.create", Record<never, AdminPathValue>, false, false>;
        readonly delete: AdminRouteMethod<"hosts.delete", {
            readonly host: AdminPathValue;
        }, true, true>;
        readonly get: AdminRouteMethod<"hosts.get", {
            readonly host: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"hosts.list", Record<never, AdminPathValue>, false, false>;
        readonly unknown: AdminRouteMethod<"hosts.unknown", Record<never, AdminPathValue>, false, false>;
        readonly update: AdminRouteMethod<"hosts.update", {
            readonly host: AdminPathValue;
        }, true, true>;
    };
    readonly invites: {
        readonly create: AdminRouteMethod<"invites.create", Record<never, AdminPathValue>, false, false>;
        readonly get: AdminRouteMethod<"invites.get", {
            readonly code: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"invites.list", Record<never, AdminPathValue>, false, false>;
        readonly redeem: AdminRouteMethod<"invites.redeem", {
            readonly code: AdminPathValue;
        }, true, true>;
    };
    readonly keys: {
        readonly create: AdminRouteMethod<"keys.create", Record<never, AdminPathValue>, false, false>;
        readonly delete: AdminRouteMethod<"keys.delete", Record<never, AdminPathValue>, false, false>;
        readonly list: AdminRouteMethod<"keys.list", Record<never, AdminPathValue>, false, false>;
    };
    readonly labels: {
        readonly bind: AdminRouteMethod<"labels.bind", {
            readonly label: AdminPathValue;
        }, true, true>;
        readonly create: AdminRouteMethod<"labels.create", Record<never, AdminPathValue>, false, false>;
        readonly info: AdminRouteMethod<"labels.info", {
            readonly label: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"labels.list", Record<never, AdminPathValue>, false, false>;
        readonly unbind: AdminRouteMethod<"labels.unbind", {
            readonly label: AdminPathValue;
            readonly member: AdminPathValue;
        }, true, true>;
        readonly unwatch: AdminRouteMethod<"labels.unwatch", {
            readonly label: AdminPathValue;
            readonly member: AdminPathValue;
        }, true, true>;
        readonly watch: AdminRouteMethod<"labels.watch", {
            readonly label: AdminPathValue;
        }, true, true>;
    };
    readonly lifecycle: {
        readonly restart: AdminRouteMethod<"lifecycle.restart", Record<never, AdminPathValue>, false, false>;
        readonly stop: AdminRouteMethod<"lifecycle.stop", Record<never, AdminPathValue>, false, false>;
        readonly upgrade: AdminRouteMethod<"lifecycle.upgrade", Record<never, AdminPathValue>, false, false>;
    };
    readonly links: {
        readonly create: AdminRouteMethod<"links.create", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly delete: AdminRouteMethod<"links.delete", {
            readonly id: AdminPathValue;
            readonly idOrSlug: AdminPathValue;
        }, true, true>;
        readonly get: AdminRouteMethod<"links.get", {
            readonly id: AdminPathValue;
            readonly idOrSlug: AdminPathValue;
        }, true, true>;
        readonly import: AdminRouteMethod<"links.import", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"links.list", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly revokeExpired: AdminRouteMethod<"links.revokeExpired", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly suspend: AdminRouteMethod<"links.suspend", {
            readonly id: AdminPathValue;
            readonly idOrSlug: AdminPathValue;
        }, true, true>;
        readonly update: AdminRouteMethod<"links.update", {
            readonly id: AdminPathValue;
            readonly idOrSlug: AdminPathValue;
        }, true, true>;
    };
    readonly logs: {
        readonly app: AdminRouteMethod<"logs.app", Record<never, AdminPathValue>, false, false>;
        readonly cleanup: AdminRouteMethod<"logs.cleanup", Record<never, AdminPathValue>, false, false>;
        readonly list: AdminRouteMethod<"logs.list", Record<never, AdminPathValue>, false, false>;
        readonly runtime: AdminRouteMethod<"logs.runtime", Record<never, AdminPathValue>, false, false>;
        readonly runtimeStreamUrl: AdminUrlHelper<"logs.runtimeStreamUrl", Record<never, AdminPathValue>, false, false>;
        readonly stats: AdminRouteMethod<"logs.stats", Record<never, AdminPathValue>, false, false>;
        readonly streamUrl: AdminUrlHelper<"logs.streamUrl", Record<never, AdminPathValue>, false, false>;
    };
    readonly members: {
        readonly add: AdminRouteMethod<"members.add", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly approve: AdminRouteMethod<"members.approve", {
            readonly identifier: AdminPathValue;
        }, true, true>;
        readonly createNative: AdminRouteMethod<"members.createNative", Record<never, AdminPathValue>, false, false>;
        readonly createNativeGeneratedAvatar: AdminRouteMethod<"members.createNativeGeneratedAvatar", Record<never, AdminPathValue>, false, false>;
        readonly createNativeWithPicture: AdminRouteMethod<"members.createNativeWithPicture", Record<never, AdminPathValue>, false, true>;
        readonly get: AdminRouteMethod<"members.get", {
            readonly identifier: AdminPathValue;
        }, true, true>;
        readonly getProfile: AdminRouteMethod<"members.getProfile", {
            readonly identifier: AdminPathValue;
        }, true, true>;
        readonly issueToken: AdminRouteMethod<"members.issueToken", {
            readonly identifier: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"members.list", {
            readonly id?: AdminPathValue;
        }, false, false>;
        readonly remove: AdminRouteMethod<"members.remove", {
            readonly id: AdminPathValue;
            readonly memberID: AdminPathValue;
        }, true, true>;
        readonly updateProfile: AdminRouteMethod<"members.updateProfile", {
            readonly identifier: AdminPathValue;
        }, true, true>;
        readonly updateStatus: AdminRouteMethod<"members.updateStatus", {
            readonly identifier: AdminPathValue;
        }, true, true>;
        readonly uploadPicture: AdminRouteMethod<"members.uploadPicture", Record<never, AdminPathValue>, false, true>;
    };
    readonly net: {
        readonly allow: AdminRouteMethod<"net.allow", Record<never, AdminPathValue>, false, false>;
        readonly allowAny: AdminRouteMethod<"net.allowAny", Record<never, AdminPathValue>, false, false>;
        readonly list: AdminRouteMethod<"net.list", Record<never, AdminPathValue>, false, false>;
        readonly remove: AdminRouteMethod<"net.remove", Record<never, AdminPathValue>, false, false>;
        readonly removeAny: AdminRouteMethod<"net.removeAny", Record<never, AdminPathValue>, false, false>;
    };
    readonly notifications: {
        readonly ack: AdminRouteMethod<"notifications.ack", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly attempts: AdminRouteMethod<"notifications.attempts", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"notifications.list", Record<never, AdminPathValue>, false, false>;
        readonly send: AdminRouteMethod<"notifications.send", Record<never, AdminPathValue>, false, false>;
    };
    readonly peer: {
        readonly add: AdminRouteMethod<"peer.add", Record<never, AdminPathValue>, false, false>;
        readonly check: AdminRouteMethod<"peer.check", Record<never, AdminPathValue>, false, false>;
        readonly default: AdminRouteMethod<"peer.default", Record<never, AdminPathValue>, false, false>;
        readonly list: AdminRouteMethod<"peer.list", Record<never, AdminPathValue>, false, false>;
        readonly remove: AdminRouteMethod<"peer.remove", Record<never, AdminPathValue>, false, false>;
        readonly updateToken: AdminRouteMethod<"peer.updateToken", Record<never, AdminPathValue>, false, false>;
    };
    readonly presentation: {
        readonly inspect: AdminRouteMethod<"presentation.inspect", Record<never, AdminPathValue>, false, false>;
    };
    readonly provider: {
        readonly list: AdminRouteMethod<"provider.list", Record<never, AdminPathValue>, false, false>;
        readonly remove: AdminRouteMethod<"provider.remove", Record<never, AdminPathValue>, false, false>;
        readonly set: AdminRouteMethod<"provider.set", Record<never, AdminPathValue>, false, false>;
    };
    readonly redirects: {
        readonly create: AdminRouteMethod<"redirects.create", Record<never, AdminPathValue>, false, false>;
        readonly delete: AdminRouteMethod<"redirects.delete", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"redirects.list", Record<never, AdminPathValue>, false, false>;
    };
    readonly secrets: {
        readonly list: AdminRouteMethod<"secrets.list", Record<never, AdminPathValue>, false, false>;
        readonly remove: AdminRouteMethod<"secrets.remove", Record<never, AdminPathValue>, false, false>;
        readonly set: AdminRouteMethod<"secrets.set", Record<never, AdminPathValue>, false, false>;
    };
    readonly securityTxt: {
        readonly disable: AdminRouteMethod<"securityTxt.disable", Record<never, AdminPathValue>, false, false>;
        readonly set: AdminRouteMethod<"securityTxt.set", Record<never, AdminPathValue>, false, false>;
        readonly show: AdminRouteMethod<"securityTxt.show", Record<never, AdminPathValue>, false, false>;
    };
    readonly spaces: {
        readonly invites: {
            readonly create: AdminRouteMethod<"spaces.invites.create", {
                readonly space: AdminPathValue;
            }, true, true>;
            readonly list: AdminRouteMethod<"spaces.invites.list", {
                readonly space: AdminPathValue;
            }, true, true>;
            readonly revoke: AdminRouteMethod<"spaces.invites.revoke", {
                readonly invite: AdminPathValue;
                readonly space: AdminPathValue;
            }, true, true>;
        };
        readonly keys: {
            readonly create: AdminRouteMethod<"spaces.keys.create", {
                readonly space: AdminPathValue;
            }, true, true>;
            readonly list: AdminRouteMethod<"spaces.keys.list", {
                readonly space: AdminPathValue;
            }, true, true>;
            readonly revoke: AdminRouteMethod<"spaces.keys.revoke", {
                readonly key: AdminPathValue;
                readonly space: AdminPathValue;
            }, true, true>;
        };
        readonly member: {
            readonly acceptInvite: AdminRouteMethod<"spaces.member.acceptInvite", {
                readonly token: AdminPathValue;
            }, true, true>;
            readonly dashboard: AdminRouteMethod<"spaces.member.dashboard", Record<never, AdminPathValue>, false, false>;
            readonly lookupInvite: AdminRouteMethod<"spaces.member.lookupInvite", {
                readonly token: AdminPathValue;
            }, true, true>;
        };
        readonly resume: AdminRouteMethod<"spaces.resume", {
            readonly space: AdminPathValue;
        }, true, true>;
        readonly suspend: AdminRouteMethod<"spaces.suspend", {
            readonly space: AdminPathValue;
        }, true, true>;
    };
    readonly stats: {
        readonly analytics: AdminRouteMethod<"stats.analytics", Record<never, AdminPathValue>, false, false>;
    };
    readonly system: {
        readonly benchmark: AdminRouteMethod<"system.benchmark", Record<never, AdminPathValue>, false, false>;
        readonly cache: AdminRouteMethod<"system.cache", Record<never, AdminPathValue>, false, false>;
        readonly cmd: AdminRouteMethod<"system.cmd", Record<never, AdminPathValue>, false, false>;
        readonly config: AdminRouteMethod<"system.config", Record<never, AdminPathValue>, false, false>;
        readonly db: AdminRouteMethod<"system.db", Record<never, AdminPathValue>, false, false>;
        readonly dbInspect: AdminRouteMethod<"system.dbInspect", Record<never, AdminPathValue>, false, false>;
        readonly health: AdminRouteMethod<"system.health", Record<never, AdminPathValue>, false, false>;
        readonly policy: AdminRouteMethod<"system.policy", Record<never, AdminPathValue>, false, false>;
        readonly policySchema: AdminRouteMethod<"system.policySchema", Record<never, AdminPathValue>, false, false>;
        readonly sql: AdminRouteMethod<"system.sql", Record<never, AdminPathValue>, false, false>;
        readonly stats: AdminRouteMethod<"system.stats", Record<never, AdminPathValue>, false, false>;
        readonly status: AdminRouteMethod<"system.status", Record<never, AdminPathValue>, false, false>;
    };
    readonly templates: {
        readonly list: AdminRouteMethod<"templates.list", Record<never, AdminPathValue>, false, false>;
    };
    readonly users: {
        readonly delete: AdminRouteMethod<"users.delete", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly get: AdminRouteMethod<"users.get", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"users.list", Record<never, AdminPathValue>, false, false>;
        readonly status: AdminRouteMethod<"users.status", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly update: AdminRouteMethod<"users.update", {
            readonly id: AdminPathValue;
        }, true, true>;
    };
    readonly webhookSubscriptions: {
        readonly create: AdminRouteMethod<"webhookSubscriptions.create", Record<never, AdminPathValue>, false, false>;
        readonly delete: AdminRouteMethod<"webhookSubscriptions.delete", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"webhookSubscriptions.list", Record<never, AdminPathValue>, false, false>;
        readonly update: AdminRouteMethod<"webhookSubscriptions.update", {
            readonly id: AdminPathValue;
        }, true, true>;
    };
    readonly webhooks: {
        readonly create: AdminRouteMethod<"webhooks.create", Record<never, AdminPathValue>, false, false>;
        readonly delete: AdminRouteMethod<"webhooks.delete", {
            readonly id: AdminPathValue;
        }, true, true>;
        readonly list: AdminRouteMethod<"webhooks.list", Record<never, AdminPathValue>, false, false>;
        readonly update: AdminRouteMethod<"webhooks.update", {
            readonly id: AdminPathValue;
        }, true, true>;
    };
}
//# sourceMappingURL=generated.d.ts.map