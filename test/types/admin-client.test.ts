import {
  adminMethodDescriptors,
  createAdminExtension,
  type AdminApi,
  type AdminDBRetentionReport,
  type AdminDBRetentionStatus,
  type AdminMethodName,
  type AdminOperationOptions,
} from "../../src/admin/index.js";

const extension = createAdminExtension();
const namespace: "admin" = extension.namespace;
const methodName: AdminMethodName = "agents.admin.threads.annotate";
const genericInput: AdminOperationOptions = { params: { limit: 10 } };
const descriptorName: string = adminMethodDescriptors[0].name;

declare const admin: AdminApi;
const health: Promise<{ readonly status: string }> = admin.system.health<{ readonly status: string }>();
const app: Promise<{ readonly id: string }> = admin.apps.get<{ readonly id: string }>({
  path: { id: "app_1" },
});
const blob = admin.agents.admin.blobs.get({
  path: { id: "app_1", folder: "reviewer", path: "reports/one.txt" },
  responseMode: "binary",
});
const stream: string = admin.logs.streamUrl({ params: { lines: 10, follow: true } });
const upload = admin.deploy.upload({ upload: { files: [] } });
const retentionStatus: Promise<AdminDBRetentionStatus> = admin.system.dbRetentionStatus();
const retentionReport: Promise<AdminDBRetentionReport> = admin.system.dbRetentionRun({ timeoutMs: 10 });
const invokedRetentionReport: Promise<AdminDBRetentionReport> = admin.invoke("system.dbRetentionRun");
declare const retentionReportValue: AdminDBRetentionReport;
const retentionDryRun: true = retentionReportValue.dry_run;
const retentionApplied: false = retentionReportValue.applied;

admin.members.list();
admin.members.list({ path: { id: "app_1" } });
admin.system.cmd({ command: "peer", args: ["list"] });
admin.invoke("webhooks.create", { body: { name: "audit", endpoint: "https://example.test" } });

// @ts-expect-error path-backed methods require their audited route parameters
admin.apps.get();
// @ts-expect-error route parameter spelling is generated from the Holm authority ledger
admin.apps.get({ path: { appId: "app_1" } });
// @ts-expect-error upload methods require an operation input
admin.deploy.upload();
// @ts-expect-error generated method names reject unknown routes
admin.invoke("apps.missing", {});
// @ts-expect-error remote retention is bodyless and cannot expose apply intent
admin.system.dbRetentionRun({ body: { apply: true } });
// @ts-expect-error remote retention is bodyless and cannot expose force intent
admin.system.dbRetentionRun({ body: { force: true } });
// @ts-expect-error low-level invoke must not expose a retention request body either
admin.invoke("system.dbRetentionRun", { body: { apply: true } });

void namespace;
void methodName;
void genericInput;
void descriptorName;
void health;
void app;
void blob;
void stream;
void upload;
void retentionStatus;
void retentionReport;
void invokedRetentionReport;
void retentionDryRun;
void retentionApplied;
