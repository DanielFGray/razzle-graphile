import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ApolloProvider } from '@apollo/client/react'
import { createApolloClient } from '@/lib/withApollo'
import App from './App'

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={createApolloClient()}>
      <HelmetProvider>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </HelmetProvider>
    </ApolloProvider>
  )
}

test('renders hello world', () => {
  const { getByText } = render(
    <Providers>
      <App />
    </Providers>,
  )
  const linkElement = getByText(/hello world/i)
  expect(linkElement).toBeInTheDocument()
})
