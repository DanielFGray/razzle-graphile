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

// unused helmet props:
// helmet.style.toString()
// helmet.link.toString()

// prettier-ignore
export const renderHtml = ({ helmet, markup, data }) => `<!doctype html>
<html ${helmet.htmlAttributes.toString()}>
<head>${helmet.title.toString()}${helmet.meta.toString()}${cssLinksFromAssets('client')}</head>
<body${helmet.bodyAttributes.toString()}>${helmet.noscript.toString()}
<div id="root">${markup}</div>
<script type="text/javascript">
  window.__INIT_DATA__ = ${JSON.stringify(
    data,
    null,
    process.env.NODE_ENV === 'development' ? 2 : undefined,
  ).replace(/</g, '\\u003c')}
</script>
${jsScriptTagsFromAssets('client', ' defer crossorigin')}
</body>
</html>`
