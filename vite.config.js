import { defineConfig } from 'vite'
import visaBulletinHandler from './api/visa-bulletin.js'
import visaBulletinMetaHandler from './api/visa-bulletin-meta.js'

function createJsonResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value)
    },
    status(code) {
      res.statusCode = code
      return this
    },
    json(data) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    }
  }
}

export default defineConfig({
  plugins: [
    {
      name: 'local-api',
      configureServer(server) {
        server.middlewares.use('/api', async (req, res, next) => {
          const requestUrl = new URL(req.url || '/', 'http://localhost')
          const handler = requestUrl.pathname === '/visa-bulletin'
            ? visaBulletinHandler
            : requestUrl.pathname === '/visa-bulletin-meta'
              ? visaBulletinMetaHandler
              : null

          if (!handler) {
            next()
            return
          }

          req.query = Object.fromEntries(requestUrl.searchParams.entries())

          try {
            await handler(req, createJsonResponse(res))
          } catch (error) {
            console.error(error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Internal server error' }))
          }
        })
      }
    }
  ]
})
