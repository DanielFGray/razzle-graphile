import React from 'react'
import { Layout } from '@/components'
import { useSharedQuery } from '@/generated'

export default function Home() {
  const query = useSharedQuery()
  return (
    <Layout query={query}>
      <pre>{JSON.stringify(query.data, null, 2)}</pre>
    </Layout>
  )
}
