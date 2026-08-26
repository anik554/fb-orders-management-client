import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone with a self-contained server and only the node_modules
  // it traced as reachable — the runtime image then needs no npm install.
  output: 'standalone',
  // The container is the deploy artefact; a type error should fail the build.
  typescript: { ignoreBuildErrors: false },
};

export default config;
