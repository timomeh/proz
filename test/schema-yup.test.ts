import { expect, test } from 'vitest'
import * as yup from 'yup'
import { createProzClient, createProzResolver, proz } from '../src'
import { createTestServer, fetch } from './lib/test-server'

const prozResolver = createProzResolver({
  items: proz.query(
    proz.pipe(
      proz.params(
        yup.object({
          status: yup.string().oneOf(['todo', 'done']).required(),
          limit: yup.number().max(5),
        }),
      ),
    ),
    async (ctx) => {
      return [
        { id: 1, status: 'todo' as const },
        { id: 2, status: 'done' as const },
        { id: 3, status: 'todo' as const },
        { id: 4, status: 'todo' as const },
      ]
        .filter((item) => item.status === ctx.params.status)
        .splice(0, ctx.params.limit || Infinity)
    },
  ),
  createItem: proz.mutation(
    proz.pipe(
      proz.body(
        yup.object({
          priority: yup.number().max(5),
        }),
      ),
    ),
    async (ctx) => {
      return { id: 'id', name: 'new item', priority: ctx.body.priority }
    },
  ),
})

createTestServer(prozResolver)
const client = createProzClient<typeof prozResolver>({ fetch })

test('handles params in queries', async () => {
  expect(await client.query.items({ status: 'todo', limit: 2 })).toEqual([
    { id: 1, status: 'todo' },
    { id: 3, status: 'todo' },
  ])
})

test('handles failing param validation in queries', async () => {
  expect(await client.query.items({ limit: 6, status: 'todo' })).toMatchObject({
    error: 'ValidationError',
    errors: ['limit must be less than or equal to 5'],
  })
})

test('handles body in mutations', async () => {
  expect(await client.mutate.createItem({ priority: 5 })).toEqual({
    id: 'id',
    name: 'new item',
    priority: 5,
  })
})

test('handles failing body validation in mutations', async () => {
  expect(await client.mutate.createItem({ priority: 6 })).toMatchObject({
    error: 'ValidationError',
    errors: ['priority must be less than or equal to 5'],
  })
})
