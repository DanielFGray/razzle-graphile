import React from 'react'
import { hydrate } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ApolloProvider } from '@apollo/client/react'
import { createApolloClient } from 'lib/withApollo'
import './App.css'
import App from './App'

hydrate(
  <ApolloProvider client={createApolloClient()}>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </ApolloProvider>,
  document.getElementById('root'),
)

if (module.hot) {
  module.hot.accept()
}
