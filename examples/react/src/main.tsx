import { useEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

import { createWebApp, createWebCaller } from "@holmhq/sdk/web";
import { createSessionModel } from "../../shared/session-contract.js";

const caller = createWebCaller({ origin: window.location.origin });
const holm = createWebApp({ caller });
const model = createSessionModel({ app: holm, caller });

function SessionExample(): React.JSX.Element {
  const session = useSyncExternalStore(
    model.session.subscribe,
    model.session.getSnapshot,
    model.session.getSnapshot,
  );
  const signOut = useSyncExternalStore(
    model.signOut.subscribe,
    model.signOut.getSnapshot,
    model.signOut.getSnapshot,
  );

  useEffect(() => {
    void model.session.refresh({ reason: "react-example-initial" });
    return () => {
      model.dispose();
      void holm.dispose();
    };
  }, []);

  return (
    <main>
      <p>React</p>
      <h1>Current Holm session</h1>
      <p>React adapts the same framework-neutral snapshots with <code>useSyncExternalStore</code>.</p>
      <nav>
        <button
          type="button"
          disabled={session.phase === "loading"}
          onClick={() => void model.session.refresh({ force: true, reason: "react-example" })}
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={signOut.phase === "loading"}
          onClick={() => void model.signOut.execute({}, { reason: "react-example" })}
        >
          Sign out
        </button>
        <a href={holm.app.auth.loginHref({ redirect: window.location.href })}>Sign in</a>
      </nav>
      <p role="status">{signOut.error?.message ?? session.error?.message ?? ""}</p>
      <pre>{session.data === undefined ? session.phase : JSON.stringify(session.data, null, 2)}</pre>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Missing React example root element");
}
createRoot(rootElement).render(<SessionExample />);
