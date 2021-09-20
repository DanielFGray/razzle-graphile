import React from 'react'
import * as Express from 'express'
import { StaticRouter, StaticRouterContext } from 'react-router'
import { HelmetProvider, FilledContext } from 'react-helmet-async'
import { ApolloProvider, ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { renderToStringWithData } from '@apollo/client/react/ssr'
import { onError } from '@apollo/client/link/error'
import { GraphileApolloLink } from '../lib/GraphileApolloLink'
import Layout from '../client/App'
import { getPostgraphileMiddleware } from './postgraphile'

interface Assets {
  [entrypoint: string]: { [asset: string]: ReadonlyArray<string> }
}

const assets: Assets = require(process.env.RAZZLE_ASSETS_MANIFEST!)

function cssLinksFromAssets(entrypoint: string) {
  return (
    assets[entrypoint]?.css
      ?.map(asset => `<link rel="stylesheet" href="${asset}" type="text/css">`)
      .join('') ?? ''
  )
}

function jsScriptTagsFromAssets(entrypoint: string, extra = '') {
  return (
    assets[entrypoint]?.js
      ?.map(asset => `<script src="${asset}" type="text/javascript"${extra}></script>`)
      .join('') ?? ''
  )
}

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
      new GraphileApolloLink({ req, res, postgraphileMiddleware }),
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

  if (routerCtx.statusCode) status = routerCtx.statusCode
  if (routerCtx.url) {
    return {
      type: 'redirect',
      status: status !== 200 ? status : routerCtx.statusCode ?? 302,
      redirect: routerCtx.url,
    }
  }

  const markup = await renderToStringWithData(App)
  const { helmet } = helmetCtx as FilledContext
  const data = apolloClient.extract()

  const html = `<!doctype html>
<html ${helmet.htmlAttributes.toString()}>
  <head>
    ${helmet.title.toString()}
    ${helmet.meta.toString()}
    ${helmet.style.toString()}
    ${helmet.link.toString()}
    ${cssLinksFromAssets('client')}
  </head>
  <body${helmet.bodyAttributes.toString()}>
    ${helmet.noscript.toString()}
    <div id="root">${markup}</div>
    <script type="text/javascript">window.__INIT_DATA__ = ${JSON.stringify(
    Object.assign({}, data, { CSRF_TOKEN: req.csrfToken() }),
    null,
    process.env.NODE_ENV === 'development' ? 2 : undefined,
  ).replace(/</g, '\\u003c')}</script>
    ${jsScriptTagsFromAssets('client', ' defer crossorigin')}
  </body>
</html>`

  return { type: 'payload', status, html }
}

export async function SSR(req: Express.Request, res: Express.Response): Promise<void> {
  const renderResult = await render(req, res)
  res.status(renderResult.status)
  if (renderResult.type === 'redirect') {
    res.redirect(renderResult.redirect)
  } else {
    res.send(renderResult.html)
  }
}
