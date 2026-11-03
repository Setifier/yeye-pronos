/**
 * Version bêta : bandeau en haut des pages (fermable) + mention dans le footer.
 * À la sortie de la bêta : passer IS_BETA à false, rien d'autre à toucher.
 */
export const IS_BETA = true;

/** Cookie posé quand l'utilisateur ferme le bandeau. Lu côté serveur : le bandeau ne clignote pas au chargement. */
export const BETA_BANNER_COOKIE = "beta-banner-dismissed";
