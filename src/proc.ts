import { pipe } from './pipe.js'
import { Ctx } from './types.js'

function procHandler<TProcessedCtx, TRes>(
  ctxFn: (ctx: Ctx) => TProcessedCtx,
  fn: (ctx: Awaited<TProcessedCtx>) => TRes,
) {
  return {
    __ctxFn: ctxFn,
    call: async (ctx: Ctx) => {
      const processedCtx = await ctxFn(ctx)
      return fn(processedCtx)
    },
  }
}

export const proc = {
  pipe,
  handler: procHandler,
}