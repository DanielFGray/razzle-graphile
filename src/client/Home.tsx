import React, { useState } from 'react'
import { ButtonProgress, Layout } from '@/components'
import { useSharedQuery } from '@/generated'
import { sleep } from '@/lib'

export default function Home(): React.ReactElement {
  const query = useSharedQuery()
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle')

  async function simulateEvent() {
    setStatus('waiting')
    await sleep(500)
    setStatus('error')
    await sleep(2000)
    setStatus('idle')
  }

  return (
    <Layout query={query}>
      <h1>hello world</h1>

      <pre>{JSON.stringify(query.data, null, 2)}</pre>

      <ButtonProgress onClick={simulateEvent} status={status}>
        this is a button
      </ButtonProgress>
    </Layout>
  )
}
