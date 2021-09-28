import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Layout } from 'components'

export default function NotFound({ location, ...props }) {
  if (props.staticContext) {
    // eslint-disable-next-line no-param-reassign
    props.staticContext.statusCode = 404
  }
  return (
    <Layout>
      <Helmet>
        <title>Not Found</title>
      </Helmet>
      {`${location.pathname} does not exist`}
    </Layout>
  )
}

