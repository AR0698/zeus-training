/**
 * Les quelques constantes qui identifient cette installation plutôt que le code.
 *
 * Elles sont regroupées ici pour qu'un fork n'ait qu'un fichier à modifier :
 * l'adresse de retour, en particulier, ne doit pas être disséminée dans des
 * composants d'interface.
 */

export const APP_NAME = "Zeus Training";

/** Tenue à jour avec `package.json` ; elle accompagne chaque message de retour. */
export const APP_VERSION = "2.1.0";

/**
 * Adresse à laquelle arrivent les avis et les idées de fonctionnalités.
 *
 * Elle est publique par construction : le lien `mailto:` doit contenir
 * l'adresse en clair pour que l'application mail du téléphone l'ouvre, et
 * l'application est entièrement statique — il n'y a aucun serveur pour la
 * masquer derrière un formulaire.
 */
export const FEEDBACK_EMAIL = "arousseau681@gmail.com";
