import React from 'react'
import * as Express from 'express'
import { renderToString } from 'react-dom/server'
import { StaticRouter, StaticRouterContext } from 'react-router'
import App from '../App'

interface Assets {
  [entrypoint: string]: { [asset: string]: ReadonlyArray<string> }
}
const assets: Assets = require(process.env.RAZZLE_ASSETS_MANIFEST)

function cssLinksFromAssets(entrypoint: string) {
  return (
    assets[entrypoint]?.css?.map(asset => `<link rel="stylesheet" href="${asset}">`).join('') ?? ''
  )
}

function jsScriptTagsFromAssets(entrypoint: string, extra = '') {
  return (
    assets[entrypoint]?.js?.map(asset => `<script src="${asset}"${extra}></script>`).join('') ?? ''
  )
}

export function render(
  req: Express.Request,
):
  | {
      type: 'redirect'
      status: number
      redirect: string
    }
  | {
      type: 'payload'
      status: number
      html: string
    } {
  let status = 200
  const routerCtx: StaticRouterContext = {}

  const markup = renderToString(
    <StaticRouter location={req.url} context={routerCtx}>
      <App />
    </StaticRouter>,
  )

  if (routerCtx.statusCode) status = routerCtx.statusCode
  if (routerCtx.url) {
    return {
      type: 'redirect',
      status: status !== 200 ? status : routerCtx.statusCode ?? 302,
      redirect: routerCtx.url,
    }
  }

  // prettier-ignore
  const html = `<!doctype html>
<html lang="">
  <head>
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta charSet="utf-8" />
      <title>Welcome to Razzle</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${cssLinksFromAssets('client')}
  </head>
  <body>
      <div id="root">${markup}</div>
      ${jsScriptTagsFromAssets('client', ' defer crossorigin')}
  </body>
</html>`

  return { type: 'payload', status, html }
}

export function ssr(req: Express.Request, res: Express.Response): void {
  const renderResult = render(req)
  res.status(renderResult.status)
  if (renderResult.type === 'redirect') {
    res.redirect(renderResult.redirect)
  } else {
    res.send(renderResult.html)
  }
}
