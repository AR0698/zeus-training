import { useCallback, useEffect, useState } from "react";

/** Une app laissée ouverte des jours vérifie quand même qu'il n'y a rien de neuf. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Une nouvelle version a été publiée pendant que l'app était ouverte.
 *
 * Le service worker s'installe et prend la main tout seul (`skipWaiting`) ;
 * la page, elle, tourne encore sur l'ancien code. Ce hook le remarque — le
 * contrôleur change alors qu'il y en avait déjà un — pour proposer de
 * recharger, au lieu d'attendre que l'app soit tuée et rouverte.
 *
 * La vérification se refait au retour sur l'app et toutes les heures.
 */
export function useAppUpdate(): { ready: boolean; reload: () => void } {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    const container = navigator.serviceWorker;
    // Première installation : le contrôleur arrive, ce n'est pas une mise à jour.
    const hadController = container.controller !== null;

    const onControllerChange = () => {
      if (hadController) setReady(true);
    };
    const check = () => {
      void container.getRegistration().then((registration) => registration?.update());
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    container.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  const reload = useCallback(() => window.location.reload(), []);
  return { ready, reload };
}
