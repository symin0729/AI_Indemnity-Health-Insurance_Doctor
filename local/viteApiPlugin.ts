import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const sendResponse = async (response: Response, target: ServerResponse) => {
  target.statusCode = response.status
  response.headers.forEach((value, name) => target.setHeader(name, value))
  target.end(Buffer.from(await response.arrayBuffer()))
}

/** Runs the Vercel-style API handlers inside the local Vite dev server. */
export const localApiPlugin = (): Plugin => ({
  name: 'local-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
      const modulePath = pathname === '/api/chat'
        ? '/api/chat.ts'
        : pathname === '/api/health'
          ? '/api/health.ts'
          : null

      if (!modulePath) {
        next()
        return
      }

      try {
        const apiModule = await server.ssrLoadModule(modulePath)
        const handler = apiModule.default as (request: Request) => Response | Promise<Response>
        const body = request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await readBody(request)
        const headers = Object.fromEntries(
          Object.entries(request.headers)
            .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
            .map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : value]),
        )
        const localRequest = new Request(`http://${request.headers.host ?? 'localhost'}${request.url ?? pathname}`, {
          method: request.method,
          headers,
          body,
        })
        await sendResponse(await handler(localRequest), response)
      } catch (error) {
        server.config.logger.error(`Local API error: ${String(error)}`)
        response.statusCode = 500
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ status: 'LOCAL_API_ERROR' }))
      }
    })
  },
})
