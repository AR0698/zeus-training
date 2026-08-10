import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { StoreProvider } from "./state/store.tsx";
import { ErrorBoundary } from "./ui/components/ErrorBoundary.tsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/editor.css";
import "./styles/welcome.css";
import "./styles/share.css";

const container = document.getElementById("root");
if (!container) throw new Error("Élément #root introuvable");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Offline support. Registered after load so it never competes with the first
// paint, and skipped in dev where it would only serve stale bundles.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });
}
