import { ApolloClient, InMemoryCache, split } from '@apollo/client'
import { Observable } from '@apollo/client/utilities'
import { ApolloLink, FetchResult, Operation } from '@apollo/client/link/core'
import { onError } from '@apollo/client/link/error'
import { HttpLink } from '@apollo/client/link/http'
import { getOperationAST, GraphQLError, print } from 'graphql'
import { Client, createClient } from 'graphql-ws'

let wsClient: Client | null = null

class WebSocketLink extends ApolloLink {
  public request(operation: Operation): Observable<FetchResult> {
    return new Observable(sink => {
      if (! wsClient) {
        sink.error(new Error('No websocket connection'))
        return
      }
      return wsClient.subscribe<FetchResult>(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: err => {
            if (err instanceof Error) {
              sink.error(err)
            } else if (err instanceof CloseEvent) {
              sink.error(
                new Error(
                  `Socket closed with event ${err.code}` + err.reason
                    ? `: ${err.reason}` // reason will be available on clean closes
                    : '',
                ),
              )
            } else {
              sink.error(
                new Error((err as GraphQLError[]).map(({ message }) => message).join(', ')),
              )
            }
          },
        },
      )
    })
  }
}

let _rootURL: string | null = null
function createWsClient() {
  if (! _rootURL) throw new Error('No ROOT_URL')
  const url = `${_rootURL.replace(/^http/, 'ws')}/graphql`
  return createClient({ url })
}

export function resetWebsocketConnection(): void {
  if (wsClient) wsClient.dispose()
  wsClient = createWsClient()
}

let apolloClient: ApolloClient<unknown>
export function createApolloClient(): ApolloClient<unknown> {
  _rootURL = process.env.RAZZLE_ROOT_URL
  if (! _rootURL) throw new Error('ROOT_URL envvar is not set')
  if (apolloClient) return apolloClient
  const initialState = window.__INIT_DATA__
  const CSRF_TOKEN = initialState?.CSRF_TOKEN
  const httpLink = new HttpLink({
    uri: '/graphql',
    credentials: 'include',
    headers: {
      'CSRF-Token': CSRF_TOKEN,
    },
  })
  wsClient = createWsClient()
  const wsLink = new WebSocketLink()

  /* Using the ability to split links, you can send data to each link
   * depending on what kind of operation is being sent. */
  const mainLink = split(
    // split based on operation type
    ({ query, operationName }) => {
      const op = getOperationAST(query, operationName)
      return (op && op.operation === 'subscription') || false
    },
    wsLink,
    httpLink,
  )

  const onErrorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors)
      graphQLErrors.map(({ message, locations, path }) =>
        console.error(
          `[GraphQL error]: message: ${message}, location: ${JSON.stringify(
            locations,
          )}, path: ${JSON.stringify(path)}`,
        ),
      )
    if (networkError) console.error(`[Network error]: ${networkError}`)
  })

  apolloClient = new ApolloClient({
    link: ApolloLink.from([onErrorLink, mainLink]),
    // cache: new InMemoryCache().restore(initialState || {}),
    cache: new InMemoryCache({
      dataIdFromObject: o =>
        o.__typename === 'Query' ? 'ROOT_QUERY'
        : o.id ? `${o.__typename}:${o.id}`
        : null,
    }).restore(initialState || {}),
  })

  return apolloClient
}
