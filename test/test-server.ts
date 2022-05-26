import { afterAll, afterEach, beforeAll } from 'vitest'
import got from 'got'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import httpMocks, { RequestMethod } from 'node-mocks-http'
import { z } from 'zod'
import { createClient, createServer, proc } from '../src/index.js'

const items = [
  { id: 1, status: 'todo' },
  { id: 2, status: 'done' },
  { id: 3, status: 'todo' },
  { id: 4, status: 'todo' },
] as const

const procServer = createServer({
  query: {
    items: proc.handler(
      proc.pipe((ctx) => ctx),
      async (ctx) => {
        return items
      },
    ),
    zodItems: proc.handler(
      proc.pipe(
        proc.zodParams(
          z.object({
            status: z.union([z.literal('todo'), z.literal('done')]),
            limit: z.preprocess(
              (val: any) => (val ? parseInt(val) : undefined),
              z.number().default(Infinity).nullable(),
            ),
          }),
        ),
      ),
      async (ctx) => {
        return items
          .filter((item) => item.status === ctx.params.status)
          .splice(0, ctx.params.limit)
      },
    ),
  },
  mutate: {
    createItem: proc.handler(
      proc.pipe((ctx) => ({ ...ctx, body: { id: ctx.req.body.id } })),
      async (ctx) => {
        return { id: ctx.body.id, name: 'new item' }
      },
    ),
    zodCreateItem: proc.handler(
      proc.pipe(
        proc.zodBody(
          z.object({ id: z.union([z.literal('qux'), z.literal('baz')]) }),
        ),
      ),
      async (ctx) => {
        return { id: ctx.body.id, name: 'new item' }
      },
    ),
  },
})

export const client = createClient<typeof procServer>({
  fetch: async ({ proc, method, body, params }) => {
    return got(`http://test.tld/api/${proc}`, {
      method,
      json: body,
      searchParams: new URLSearchParams(params),
      retry: {
        limit: 0,
      },
      throwHttpErrors: false, // makes it easier to test
    }).json()
  },
})

const handler = procServer.createHandler({ prefix: '/api/' })

const server = setupServer(
  rest.all('http://test.tld/api/*', async (req, res, ctx) => {
    try {
      const data = await handler(
        httpMocks.createRequest({
          url: req.url.toString(),
          method: req.method as RequestMethod,
          body: req.body as unknown,
          params: req.params as unknown,
        }),
        httpMocks.createResponse(),
      )

      return res(ctx.json(data))
    } catch (err) {
      return res(
        ctx.status(err.statusCode || 500),
        ctx.json({
          error: err.name,
          issues: err.issues,
        }),
      )
    }
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
