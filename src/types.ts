import type { IncomingMessage, ServerResponse } from 'node:http'

export type ProcRequest = IncomingMessage & {
  body: any
  query: {
    [key: string]: string | string[]
  }
}
export type ProcResponse = ServerResponse

export type Ctx = {
  req: ProcRequest
  res: ProcResponse
}

export type ProcHandler<TCtxFn extends Ctx = Ctx> = {
  __ctxFn: (ctx: Ctx) => Promise<TCtxFn>
  run: (ctx: TCtxFn) => Promise<any>
}

export type Resolvers = {
  query: Record<string, ProcHandler>
  mutate: Record<string, ProcHandler>
}

export type ProcServer<TResolvers extends Resolvers = Resolvers> = {
  __resolvers: TResolvers
  createHandler: (
    opts: CreateHandlerOptions,
  ) => (req: ProcRequest, res: ProcResponse) => Promise<any>
}

export type CreateHandlerOptions = {
  prefix?: string
}
