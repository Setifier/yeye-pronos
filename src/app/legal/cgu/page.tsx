import type { Metadata } from "next";
import { ContactEmail, LegalLink, LegalList, LegalSection, LegalTitle, Strong } from "@/components/legal/legal-ui";

export const metadata: Metadata = { title: "Conditions d’utilisation · Yeye Pronos" };

export default function CguPage() {
  return (
    <>
      <LegalTitle intro="En créant un compte, vous acceptez ces conditions.">
        Conditions générales d’utilisation
      </LegalTitle>

      <LegalSection title="1. Objet">
        <p>
          Yeye Pronos est un jeu gratuit de pronostics sur les matchs de NBA, entre amis. Ces conditions encadrent
          l’utilisation du site.
        </p>
      </LegalSection>

      <LegalSection title="2. Un jeu gratuit, sans argent">
        <p>
          L’inscription et le jeu sont <Strong>entièrement gratuits</Strong>. Il n’y a ni mise, ni achat, ni gain :
          les points et les classements n’ont aucune valeur monétaire, ne s’échangent pas et ne donnent droit à aucun
          lot.
        </p>
        <p>
          Yeye Pronos n’est pas un site de paris sportifs : les mots « pari » et « prono » y désignent un pronostic
          gratuit.
        </p>
      </LegalSection>

      <LegalSection title="3. Votre compte">
        <LegalList>
          <li>Les informations fournies doivent être exactes. Un seul compte par personne.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe.</li>
          <li>
            Le pseudo et la photo de profil doivent rester respectueux : pas de contenu injurieux, discriminatoire ou
            illicite, pas d’usurpation d’identité.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Règles du jeu">
        <p>
          Le barème, les heures limites et des exemples sont détaillés dans les{" "}
          <LegalLink href="/pronos/regles">règles du jeu</LegalLink>. Un pronostic peut être enregistré ou modifié
          jusqu’au coup d’envoi du match.
        </p>
        <p>
          Les points sont calculés automatiquement à partir des résultats publiés par les sources citées dans les{" "}
          <LegalLink href="/legal/mentions">mentions légales</LegalLink>. En cas d’erreur de données ou de
          dysfonctionnement, l’éditeur peut corriger les résultats, les points et le classement.
        </p>
      </LegalSection>

      <LegalSection title="5. Version bêta">
        <p>
          Le service est en phase de test. Il est fourni « en l’état » : des bugs, des interruptions et des évolutions
          des fonctionnalités ou des règles sont possibles. Vos retours sont les bienvenus : <ContactEmail />
        </p>
      </LegalSection>

      <LegalSection title="6. Comportement">
        <p>
          En cas de triche (comptes multiples, exploitation d’un bug) ou d’atteinte au service ou aux autres joueurs,
          l’éditeur peut suspendre ou supprimer le compte concerné.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriété intellectuelle">
        <p>
          Yeye Pronos est un projet indépendant, non affilié à la NBA ni à ESPN. Les marques, logos, photos et données
          appartiennent à leurs titulaires (détails dans les <LegalLink href="/legal/mentions">mentions légales</LegalLink>).
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          Les informations sportives sont fournies à titre indicatif. L’éditeur ne garantit ni leur exactitude ni la
          disponibilité continue du service.
        </p>
      </LegalSection>

      <LegalSection title="9. Données personnelles">
        <p>
          Voir la <LegalLink href="/legal/confidentialite">politique de confidentialité</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection title="10. Suppression du compte">
        <p>
          Vous pouvez demander la suppression de votre compte à tout moment : <ContactEmail />. Le compte et les
          données associées (pronostics, amis, ligues) sont alors supprimés définitivement.
        </p>
      </LegalSection>

      <LegalSection title="11. Modifications">
        <p>
          Ces conditions peuvent évoluer, notamment à la fin de la bêta. La version en vigueur est celle publiée sur
          cette page ; en cas de changement important, les joueurs en sont informés sur le site.
        </p>
      </LegalSection>

      <LegalSection title="12. Droit applicable">
        <p>Ces conditions sont soumises au droit français.</p>
      </LegalSection>
    </>
  );
}
