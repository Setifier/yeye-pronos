# Configuration des logos NBA

## Emplacement

Les logos des équipes NBA doivent être ajoutés dans le fichier :
`src/lib/nba-logos.ts`

## Format

Vous pouvez utiliser deux approches :

### 1. Logos dans le dossier public

Créez un dossier `public/logos/nba/` et ajoutez vos logos avec le nom de l'abréviation de l'équipe.

```
public/
  └── logos/
      └── nba/
          ├── BOS.png
          ├── LAL.png
          ├── GSW.png
          └── ...
```

Puis mettez à jour le fichier `nba-logos.ts` :

```typescript
export const NBA_TEAM_LOGOS: Record<string, string> = {
  BOS: "/logos/nba/BOS.png",
  LAL: "/logos/nba/LAL.png",
  GSW: "/logos/nba/GSW.png",
  // ...
};
```

### 2. URLs externes

Si vous avez des URLs externes (CDN, API, etc.) respectant les droits d'auteur :

```typescript
export const NBA_TEAM_LOGOS: Record<string, string> = {
  BOS: "https://votre-cdn.com/logos/bos.png",
  LAL: "https://votre-cdn.com/logos/lal.png",
  // ...
};
```

## Liste des abréviations

### Eastern Conference

**Atlantic Division**
- BOS - Boston Celtics
- BKN - Brooklyn Nets
- NYK - New York Knicks
- PHI - Philadelphia 76ers
- TOR - Toronto Raptors

**Central Division**
- CHI - Chicago Bulls
- CLE - Cleveland Cavaliers
- DET - Detroit Pistons
- IND - Indiana Pacers
- MIL - Milwaukee Bucks

**Southeast Division**
- ATL - Atlanta Hawks
- CHA - Charlotte Hornets
- MIA - Miami Heat
- ORL - Orlando Magic
- WAS - Washington Wizards

### Western Conference

**Northwest Division**
- DEN - Denver Nuggets
- MIN - Minnesota Timberwolves
- OKC - Oklahoma City Thunder
- POR - Portland Trail Blazers
- UTA - Utah Jazz

**Pacific Division**
- GSW - Golden State Warriors
- LAC - Los Angeles Clippers
- LAL - Los Angeles Lakers
- PHX - Phoenix Suns
- SAC - Sacramento Kings

**Southwest Division**
- DAL - Dallas Mavericks
- HOU - Houston Rockets
- MEM - Memphis Grizzlies
- NOP - New Orleans Pelicans
- SAS - San Antonio Spurs

## Recommandations

- Format : PNG ou SVG (transparent de préférence)
- Taille recommandée : 500x500px minimum
- Respectez les droits d'auteur et marques déposées
- Assurez-vous que les logos sont libres de droit ou que vous avez les autorisations nécessaires
