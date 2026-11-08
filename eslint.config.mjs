import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
    ignorePatterns: ["src/generated/**/**"],
    rules: {
      // Choix assumé : logos, avatars Cloudinary et photos ESPN sont déjà petits et servis par des CDN.
      // <Image> les ferait repasser par l'optimisation Vercel, limitée sur l'offre gratuite.
      "@next/next/no-img-element": "off",
    },
  }),
];

export default eslintConfig;
