/**
 * Charge les variables d'environnement comme Next.js (.env.local prioritaire sur .env).
 * À importer EN PREMIER dans un script : `import "./load-env";`
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
