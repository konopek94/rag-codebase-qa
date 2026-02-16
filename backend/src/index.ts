import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ingestRouter } from './routes/ingest.js'
import { queryRouter } from './routes/query.js'

const app = new Hono()
app.use('*', cors())
app.route('/ingest', ingestRouter)
app.route('/query', queryRouter)

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('Backend running on http://localhost:3001')
})
