import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Layout } from '@/components'
import { useSharedQuery } from '@/generated'
import { RouteComponentProps } from 'react-router-dom'

export default function NotFound({ location, staticContext }: RouteComponentProps): JSX.Element {
  const query = useSharedQuery()

  if (staticContext) {
    // eslint-disable-next-line no-param-reassign
    staticContext.statusCode = 404
  }

  return (
    <Layout query={query}>
      <Helmet>
        <title>Not Found</title>
      </Helmet>
      <div className="error">{location.pathname} does not exist</div>
    </Layout>
  )
}
