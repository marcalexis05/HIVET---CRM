import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000'

  // Plugin: replace all hardcoded localhost:8000 strings at build time
  const replaceLocalhost = {
    name: 'replace-localhost-api',
    transform(code: string, id: string) {
      if (!id.includes('node_modules') && (id.endsWith('.ts') || id.endsWith('.tsx'))) {
        if (apiUrl !== 'http://localhost:8000') {
          return {
            code: code
              .replace(/['"`]http:\/\/localhost:8000['"`]/g, JSON.stringify(apiUrl))
              .replace(/\$\{['"`]http:\/\/localhost:8000['"`]\}/g, `\${${JSON.stringify(apiUrl)}}`)
              .replace(/http:\/\/localhost:8000\//g, `${apiUrl}/`),
            map: null,
          }
        }
      }
      return null
    },
  }

  return {
    plugins: [react(), replaceLocalhost],
    server: {
      port: 5175,
      strictPort: true,
    },
  }
})
