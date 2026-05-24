import packageJson from "../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Alayon Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, Alayon Admin.`,
  meta: {
    title: "Alayon Admin - Modern Marketplace",
    description:
      "Alayon Admin is a modern, open-source marketplace platform.",
  },
};
