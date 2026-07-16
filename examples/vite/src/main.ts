import { createWebApp } from "@holmhq/sdk/web";

const app = createWebApp();
const status = document.querySelector<HTMLElement>("#status");

void app.app.auth.me()
  .then((member) => {
    if (status) status.textContent = JSON.stringify(member, null, 2);
  })
  .catch((error: unknown) => {
    if (status) status.textContent = error instanceof Error ? error.message : "Unknown error";
  });
