import type { Metadata } from "next";
import { ContactEmail, LegalLink, LegalList, LegalSection, LegalTitle, Strong } from "@/components/legal/legal-ui";

export const metadata: Metadata = { title: "Politique de confidentialité · Yeye Pronos" };

export default function ConfidentialitePage() {
  return (
    <>
      <LegalTitle intro="Ce que Yeye Pronos collecte, pourquoi, et comment exercer vos droits (RGPD).">
        Politique de confidentialité
      </LegalTitle>

      <LegalSection title="Responsable du traitement">
        <p>
          L’éditeur de Yeye Pronos, particulier agissant à titre non professionnel (voir les{" "}
          <LegalLink href="/legal/mentions">mentions légales</LegalLink>). Contact : <ContactEmail />
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <LegalList>
          <li>
            <Strong>Compte</Strong> : nom ou pseudo, adresse e-mail, mot de passe (enregistré sous une forme chiffrée
            irréversible). En cas de connexion avec Google : le nom, l’adresse e-mail et la photo transmis par Google.
          </li>
          <li>
            <Strong>Profil</Strong> : photo de profil (facultative), équipe et joueur favoris, code ami, liste d’amis.
          </li>
          <li>
            <Strong>Jeu</Strong> : pronostics, paris de saison, points et classement.
          </li>
          <li>
            <Strong>Sécurité</Strong> : pour chaque session de connexion, l’adresse IP et le type de navigateur.
          </li>
          <li>
            <Strong>Signalements de bug</Strong> : votre message, la page concernée, le type d’appareil et, si vous
            êtes connecté ou l’indiquez, votre adresse e-mail pour vous répondre. Ils arrivent par e-mail à l’adresse
            de contact.
          </li>
        </LegalList>
        <p>Aucune donnée bancaire n’est collectée : le jeu est entièrement gratuit.</p>
      </LegalSection>

      <LegalSection title="Pourquoi ces données">
        <LegalList>
          <li>
            Faire fonctionner le jeu : compte, pronostics, classement, amis. Base légale : exécution des{" "}
            <LegalLink href="/legal/cgu">conditions d’utilisation</LegalLink>.
          </li>
          <li>Envoyer les e-mails de service (confirmation d’adresse, mot de passe oublié). Même base légale.</li>
          <li>Sécuriser les comptes et prévenir les abus. Base légale : intérêt légitime.</li>
          <li>Traiter vos signalements de bug et y répondre. Base légale : intérêt légitime.</li>
        </LegalList>
        <p>Pas de publicité, pas de newsletter, pas de revente de données, pas de profilage.</p>
      </LegalSection>

      <LegalSection title="Qui voit vos données">
        <LegalList>
          <li>
            Les autres joueurs voient votre pseudo, votre photo, vos équipe et joueur favoris, vos points, votre rang
            et vos pronostics <Strong>terminés</Strong>. Vos pronostics en cours ne sont jamais visibles avant le
            coup d’envoi.
          </li>
          <li>Votre adresse e-mail n’est jamais affichée aux autres joueurs.</li>
          <li>L’administrateur du site peut accéder aux données pour gérer le service.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Prestataires">
        <LegalList>
          <li>Vercel : hébergement du site (serveurs à Londres).</li>
          <li>Neon : base de données (Londres).</li>
          <li>Cloudinary : stockage des photos de profil.</li>
          <li>Google : connexion avec Google (si vous l’utilisez) et envoi des e-mails (Gmail).</li>
        </LegalList>
        <p>
          Certains de ces prestataires sont établis aux États-Unis. Les transferts de données sont encadrés par les
          garanties prévues par le RGPD (cadre de protection des données UE–États-Unis ou clauses contractuelles
          types de la Commission européenne). Le Royaume-Uni bénéficie d’une décision d’adéquation de la Commission
          européenne.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <LegalList>
          <li>Compte, profil et données de jeu : tant que le compte existe, puis supprimés avec lui.</li>
          <li>Sessions de connexion : 30 jours au plus.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Cookies et stockage local">
        <LegalList>
          <li>Cookie de session : vous garde connecté (30 jours).</li>
          <li>Cookie « bandeau bêta fermé » : retient votre choix (1 an).</li>
          <li>Stockage local du navigateur : préférence No Spoil et brouillon du bracket.</li>
        </LegalList>
        <p>
          Aucun cookie publicitaire, de mesure d’audience ou de réseau social. Ces éléments étant strictement
          nécessaires au service ou à vos choix d’affichage, ils ne demandent pas de consentement (recommandations de
          la CNIL).
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de
          portabilité de vos données. Votre profil se modifie directement dans les paramètres ; pour toute autre
          demande, notamment la suppression de votre compte, écrivez à <ContactEmail />. Réponse sous un mois.
        </p>
        <p>
          Vous pouvez aussi adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr" className="text-[#5096ff] hover:underline" target="_blank" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Connexion chiffrée (HTTPS), mots de passe jamais stockés en clair, accès d’administration réservé à
          l’éditeur.
        </p>
      </LegalSection>
    </>
  );
}
