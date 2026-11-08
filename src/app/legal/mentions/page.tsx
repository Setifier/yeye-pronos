import type { Metadata } from "next";
import { ContactEmail, LegalLink, LegalList, LegalSection, LegalTitle, Strong } from "@/components/legal/legal-ui";
import { CREATOR, HOST } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales · Yeye Pronos" };

export default function MentionsLegalesPage() {
  return (
    <>
      <LegalTitle>Mentions légales</LegalTitle>

      <LegalSection title="Éditeur">
        <p>
          Yeye Pronos est un site personnel, gratuit et sans publicité, édité par un particulier à titre non
          professionnel, conformément à l’article 6-III-2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance
          dans l’économie numérique (LCEN). Ses coordonnées ont été communiquées à l’hébergeur.
        </p>
        <p>
          Conception et développement : <Strong>{CREATOR}</Strong>.
        </p>
        <p>
          Contact : <ContactEmail />
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          <Strong>{HOST.name}</Strong>
          <br />
          {HOST.address}
          <br />
          <a href={`mailto:${HOST.email}`} className="text-[#5096ff] hover:underline">{HOST.email}</a>
          {" · "}
          <a href={HOST.website} className="text-[#5096ff] hover:underline" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </p>
        <p>Les serveurs de l’application et la base de données (Neon) sont situés à Londres (Royaume-Uni).</p>
      </LegalSection>

      <LegalSection title="Projet indépendant et non officiel">
        <p>
          Yeye Pronos n’est <Strong>ni affilié, ni approuvé, ni sponsorisé</Strong> par la National Basketball
          Association (NBA), ses équipes ou ESPN.
        </p>
        <p>
          NBA ainsi que les noms, logos et emblèmes des équipes NBA sont des marques déposées de NBA Properties, Inc.
          et de leurs équipes respectives. Ils sont reproduits uniquement pour identifier les matchs et les équipes,
          sans revendication d’aucun droit.
        </p>
      </LegalSection>

      <LegalSection title="Sources et crédits">
        <LegalList>
          <li>Calendrier, scores, statistiques, effectifs et blessures : ESPN (espn.com).</li>
          <li>Photos des joueurs : ESPN.</li>
          <li>Logos des équipes : NBA et ses équipes.</li>
        </LegalList>
        <p>
          Ces données sont reprises automatiquement deux fois par jour. Elles peuvent comporter des erreurs ou des
          retards : seules les sources officielles font foi.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Le code, le design et les textes de Yeye Pronos appartiennent à leur auteur. Les marques, logos, photos et
          données citées ci-dessus restent la propriété de leurs titulaires.
        </p>
        <p>
          Tout titulaire de droits qui souhaite le retrait d’un contenu peut écrire à <ContactEmail /> : le contenu
          sera retiré dans les meilleurs délais.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Voir la <LegalLink href="/legal/confidentialite">politique de confidentialité</LegalLink> et les{" "}
          <LegalLink href="/legal/cgu">conditions d’utilisation</LegalLink>.
        </p>
      </LegalSection>
    </>
  );
}
