import { useCallback, useEffect, useState } from "react";
import { detectPlatform, type Platform } from "../domain/install.ts";

/**
 * L'invite d'installation native, quand le navigateur veut bien la prêter.
 *
 * Chromium émet `beforeinstallprompt` et laisse déclencher la boîte de dialogue
 * plus tard ; Safari n'émet rien et n'expose aucune API — sur iPhone, seules
 * les consignes écrites fonctionnent. Le hook rend donc trois choses, et
 * l'interface s'adapte à ce qu'elle reçoit plutôt que de supposer.
 *
 * `isStandalone` sert à ne pas expliquer une installation déjà faite : l'app
 * ouverte depuis son icône n'a plus rien à demander.
 */

type PromptOutcome = "accepted" | "dismissed" | "unavailable";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPrompt = {
  platform: Platform;
  /** L'app tourne depuis son icône : l'étape d'installation est derrière nous. */
  isStandalone: boolean;
  /** Le navigateur accepte d'ouvrir sa propre boîte de dialogue. */
  canPrompt: boolean;
  prompt: () => Promise<PromptOutcome>;
};

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // `navigator.standalone` est le seul signal sur iOS ; il n'est pas standard,
  // d'où l'accès indirect plutôt qu'une déclaration globale.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

export function useInstallPrompt(): InstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(readStandalone);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Sans ça, Chrome affiche sa propre bannière au milieu de l'onboarding.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Installée depuis un autre onglet, ou lancée depuis l'icône après coup.
    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setIsStandalone(readStandalone());
    media.addEventListener("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const prompt = useCallback(async (): Promise<PromptOutcome> => {
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // L'événement n'est utilisable qu'une fois : le navigateur en réémettra
      // un neuf s'il juge que la question peut se reposer.
      setDeferred(null);
      return outcome;
    } catch {
      setDeferred(null);
      return "unavailable";
    }
  }, [deferred]);

  return {
    platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    isStandalone,
    canPrompt: deferred !== null,
    prompt,
  };
}
