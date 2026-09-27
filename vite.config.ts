import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { localApiPlugin } from './local/viteApiPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only variables are loaded into Node for local API handlers. They are
  // not exposed to browser code unless their names start with VITE_.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), localApiPlugin()],
  }
})
