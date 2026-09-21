import type { NextConfig } from "next";

// Passenger runs the standalone server output directly — see
// docs/kickoff/02-repo-structure.md and .github/workflows/deploy-cpanel.yml.
const config: NextConfig = {
  output: "standalone",
};

export default config;
