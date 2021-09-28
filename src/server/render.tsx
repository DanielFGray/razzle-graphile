import React from 'react'
import * as Express from 'express'
import { StaticRouter, StaticRouterContext } from 'react-router'
import { HelmetProvider, FilledContext } from 'react-helmet-async'
import { ApolloProvider, ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { renderToStringWithData } from '@apollo/client/react/ssr'
import { onError } from '@apollo/client/link/error'
import { GraphileApolloLink as GraphileLink } from '@/lib'
import Layout from '@/client/App'
import { getPostgraphileMiddleware } from './postgraphile'
import { renderHtml } from './html'

export async function render(
  req: Express.Request,
  res: Express.Response,
): Promise<
  | {
      type: 'redirect'
      status: number
      redirect: string
    }
  | {
      type: 'payload'
      status: number
      html: string
    }
> {
  let status = 200
  const postgraphileMiddleware = getPostgraphileMiddleware()
  const apolloClient = new ApolloClient({
    ssrMode: true,
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      onError(({ networkError, graphQLErrors }) => {
        if (graphQLErrors) console.error(...graphQLErrors)
        if (networkError) console.error(networkError)
      }),
      new GraphileLink({ req, res, postgraphileMiddleware }),
    ]),
  })
  const routerCtx: StaticRouterContext = {}
  const helmetCtx = {}

  const App = (
    <ApolloProvider client={apolloClient}>
      <StaticRouter location={req.url} context={routerCtx}>
        <HelmetProvider context={helmetCtx}>
          <Layout />
        </HelmetProvider>
      </StaticRouter>
    </ApolloProvider>
  )

  const markup = await renderToStringWithData(App)

  if (routerCtx.statusCode) status = routerCtx.statusCode
  if (routerCtx.url) {
    return {
      type: 'redirect',
      status: status !== 200 ? status : routerCtx.statusCode ?? 302,
      redirect: routerCtx.url,
    }
  }

  const { helmet } = helmetCtx as FilledContext
  const data = apolloClient.extract()
  Object.assign(data, { CSRF_TOKEN: req.csrfToken() })

  const html = renderHtml({ helmet, markup, data })

  return { type: 'payload', status, html }
}

export async function SSR(req: Express.Request, res: Express.Response): Promise<void> {
  const renderResult = await render(req, res)
  res.status(renderResult.status)
  if (renderResult.type === 'redirect') {
    return res.redirect(renderResult.redirect)
  }
  res.send(renderResult.html)
}
