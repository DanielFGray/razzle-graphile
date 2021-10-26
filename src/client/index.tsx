import React from 'react'
import { hydrate } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ApolloProvider } from '@apollo/client/react'
import { createApolloClient } from '@/lib'
import './App.css'
import App from './App'

function Init() {
  return (
    <ApolloProvider client={createApolloClient()}>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ApolloProvider>
  )
}

hydrate(<Init />, document.getElementById('root'))

if (module.hot) {
  module.hot.accept()
}
