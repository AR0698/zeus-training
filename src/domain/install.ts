/**
 * Installation sur l'écran d'accueil.
 *
 * Le geste n'existe pas de façon uniforme : sur iPhone il est caché dans la
 * feuille de partage, sur Android le navigateur le propose lui-même, sur
 * ordinateur il vit dans la barre d'adresse. Une consigne générique du type
 * « ajoute l'app à ton écran d'accueil » ne se suit donc pas — d'où des étapes
 * nommées comme les boutons réellement affichés.
 *
 * Ce n'est pas du confort : hors installation, Safari purge le stockage d'un
 * site après quelques jours sans visite. Une app dont toutes les données sont
 * locales perd alors l'historique. La détection est ici, pure et testable ;
 * l'invite native du navigateur est dans `hooks/useInstallPrompt.ts`.
 */

export type Platform = "ios" | "android" | "desktop";

export type InstallStep = {
  /** L'action, nommée comme le bouton du navigateur — pas comme un concept. */
  action: string;
  /** Le repère visuel ou le piège à éviter. Facultatif. */
  detail?: string;
};

/**
 * iPadOS ≥ 13 se présente comme un Mac : c'est `maxTouchPoints` qui le
 * distingue d'un ordinateur, et rien dans la chaîne d'agent utilisateur.
 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "desktop";
}

export function platformLabel(platform: Platform): string {
  switch (platform) {
    case "ios":
      return "iPhone ou iPad";
    case "android":
      return "Android";
    default:
      return "ordinateur";
  }
}

const STEPS: Record<Platform, InstallStep[]> = {
  ios: [
    {
      action: "Touche le bouton Partager, en bas de l'écran",
      detail: "Le carré traversé par une flèche qui monte.",
    },
    {
      action: "Fais défiler la liste, puis choisis « Sur l'écran d'accueil »",
      detail: "Il est plus bas que les applications de partage, après les icônes.",
    },
    {
      action: "Confirme avec « Ajouter »",
      detail: "L'icône Zeus rejoint tes autres applications.",
    },
  ],
  android: [
    { action: "Ouvre le menu ⋮ du navigateur, en haut à droite" },
    {
      action: "Choisis « Installer l'application »",
      detail: "Selon la version, l'entrée s'appelle « Ajouter à l'écran d'accueil ».",
    },
    { action: "Confirme", detail: "L'icône Zeus rejoint tes autres applications." },
  ],
  desktop: [
    {
      action: "Clique sur l'icône d'installation, dans la barre d'adresse",
      detail: "À droite du champ : un écran traversé par une flèche.",
    },
    { action: "Confirme avec « Installer »" },
    {
      action: "Ouvre plutôt l'app sur ton téléphone pour t'en servir en salle",
      detail: "C'est là qu'elle est faite pour être tenue d'une main, entre deux séries.",
    },
  ],
};

export function installSteps(platform: Platform): InstallStep[] {
  return STEPS[platform];
}

/**
 * Pourquoi installer, dit en une phrase et propre à la plateforme.
 *
 * Sur iPhone, la raison est concrète et vérifiable — la purge du stockage —
 * plutôt que le « meilleur confort » qu'on lit partout et que personne ne suit.
 */
export function installReason(platform: Platform): string {
  if (platform === "ios") {
    return "Sur iPhone, une page seulement mise en favori peut voir ses données effacées après quelques jours sans visite. Installée, l'app les garde.";
  }
  return "L'app s'ouvre alors en plein écran, sans barre d'adresse, et fonctionne sans connexion.";
}
