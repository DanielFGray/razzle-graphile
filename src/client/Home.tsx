import React from 'react'
import { useSharedQuery } from '../codegen'

export default function Home() {
  const query = useSharedQuery()
  return (
    <div className="Home">
      <div>
        <h2>hello world</h2>
      </div>
      <p>
        To get started, edit <code>src/App.tsx</code> or <code>src/Home.tsx</code> and save to
        reload.
      </p>
      <ul>
        <li>
          <a href="https://github.com/jaredpalmer/razzle">Docs</a>
        </li>
        <li>
          <a href="https://github.com/jaredpalmer/razzle/issues">Issues</a>
        </li>
        <li>
          <a href="https://palmer.chat">Community Slack</a>
        </li>
      </ul>
      <pre>{JSON.stringify(query.data, null, 2)}</pre>
    </div>
  )
}
