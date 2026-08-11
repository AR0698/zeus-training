import { Component, type ErrorInfo, type ReactNode } from "react";
import { loadState } from "../../storage/db.ts";

/**
 * Last line of defence.
 *
 * A crash in a screen must never turn into a white page holding a session
 * hostage — the raw persisted state is offered as a download so nothing is ever
 * trapped inside a broken build.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Zeus Training — erreur d'affichage", error, info.componentStack);
  }

  private async downloadRaw() {
    const raw = await loadState();
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zeus-training-donnees-brutes.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="crash">
        <span className="kicker">Erreur</span>
        <h1>L&apos;écran n&apos;a pas pu s&apos;afficher</h1>
        <p className="lead">
          Tes données sont intactes sur cet appareil. Recharge l&apos;application ; si le problème
          persiste, télécharge la sauvegarde brute avant toute autre manipulation.
        </p>
        <pre className="crash-detail">{this.state.error.message}</pre>
        <div className="crash-actions">
          <button type="button" className="button button-solid" onClick={() => location.reload()}>
            Recharger
          </button>
          <button type="button" className="button button-ghost" onClick={() => void this.downloadRaw()}>
            Télécharger mes données
          </button>
        </div>
      </main>
    );
  }
}
