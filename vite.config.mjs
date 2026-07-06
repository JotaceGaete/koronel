import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// %VITE_SITE_NAME%/%VITE_CITY_NAME% placeholders in index.html fall back to
// Coronel's current values when the env vars aren't set, so existing
// deploys keep their title/description unchanged either way.
function htmlCityDefaults(env) {
  const defaults = {
    VITE_SITE_NAME: env.VITE_SITE_NAME || 'CoronelLocal',
    VITE_CITY_NAME: env.VITE_CITY_NAME || 'Coronel',
  };
  return {
    name: 'html-city-defaults',
    transformIndexHtml(html) {
      return html.replace(/%(VITE_SITE_NAME|VITE_CITY_NAME)%/g, (_, key) => defaults[key]);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // This changes the out put dir from dist to build
    // comment this out if that isn't relevant for your project
    build: {
      outDir: "build",
      chunkSizeWarningLimit: 2000,
    },
    plugins: [tsconfigPaths(), react(), htmlCityDefaults(env)],
    server: {
      port: "4028",
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: ['.amazonaws.com', '.builtwithrocket.new']
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});