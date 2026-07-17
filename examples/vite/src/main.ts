import { createWebApp, createWebCaller } from "@holmhq/sdk/web";
import { createSessionModel } from "../../shared/session-contract.js";

const caller = createWebCaller({ origin: window.location.origin });
const holm = createWebApp({ caller });
const model = createSessionModel({ app: holm, caller });

const sessionElement = requiredElement<HTMLPreElement>("session");
const messageElement = requiredElement<HTMLParagraphElement>("message");
const refreshButton = requiredElement<HTMLButtonElement>("refresh");
const signOutButton = requiredElement<HTMLButtonElement>("sign-out");
const signInLink = requiredElement<HTMLAnchorElement>("sign-in");
signInLink.href = holm.app.auth.loginHref({ redirect: window.location.href });

const render = (): void => {
  const session = model.session.getSnapshot();
  const signOut = model.signOut.getSnapshot();
  sessionElement.textContent = session.data === undefined
    ? session.phase
    : JSON.stringify(session.data, null, 2);
  messageElement.textContent = signOut.error?.message ?? session.error?.message ?? "";
  refreshButton.disabled = session.phase === "loading";
  signOutButton.disabled = signOut.phase === "loading";
};

const stopSession = model.session.subscribe(render);
const stopSignOut = model.signOut.subscribe(render);
refreshButton.addEventListener("click", () => {
  void model.session.refresh({ force: true, reason: "vanilla-example" });
});
signOutButton.addEventListener("click", () => {
  void model.signOut.execute({}, { reason: "vanilla-example" });
});
window.addEventListener("pagehide", () => {
  stopSignOut();
  stopSession();
  model.dispose();
  void holm.dispose();
}, { once: true });

render();
void model.session.refresh({ reason: "vanilla-example-initial" });

function requiredElement<ElementType extends HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing example element #${id}`);
  }
  return element as ElementType;
}
