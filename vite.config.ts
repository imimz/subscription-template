import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile";

// PasarGuard renders index.html with Jinja. Wrap the inlined bundle in {% raw %} so Jinja
// doesn't treat "{{" / "}}" inside the JS/CSS (e.g. i18next's {{var}} placeholders) as template tags.
// Runs after viteSingleFile has inlined the assets.
const jinjaRawBundle = (): Plugin => ({
  name: "jinja-raw-bundle",
  apply: "build",
  enforce: "post",
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type !== "asset" || !file.fileName.endsWith(".html")) continue
      file.source = String(file.source).replace(
        /<script type="module"[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>/g,
        (block) => `{% raw %}${block}{% endraw %}`,
      )
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(), 
    viteSingleFile(),
    jinjaRawBundle()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging in production
    sourcemap: false,
    // Use default minification (esbuild) instead of terser
    minify: true
    // Note: manualChunks is incompatible with viteSingleFile plugin
    // which uses inlineDynamicImports, so we remove it
  },
  esbuild: {
    drop: ['console', 'debugger']
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-i18next',
      'i18next',
      'swr',
      'recharts'
    ]
  },
  // Performance improvements
  server: {
    fs: {
      // Allow serving files from one level up from the package root
      allow: ['..']
    }
  }
})
