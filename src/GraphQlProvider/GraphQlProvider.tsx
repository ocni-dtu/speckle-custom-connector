import { ReactNode, useMemo } from 'react'

import { ApolloClient, ApolloProvider, createHttpLink, from, InMemoryCache } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import {useAuth} from "../AuthProvider";


type GraphQlProviderProps = {
  children: ReactNode
}

export const GraphQlProvider = ({ children }: GraphQlProviderProps) => {
  const { token } = useAuth()

  const speckleServerLink = createHttpLink({
    uri: `${import.meta.env.VITE_SPECKLE_SERVER_URL}/graphql`,
  })

  const authLink = useMemo(
    () =>
      setContext((_, { headers }) => {
        // get the authentication token from local storage if it exists
        // return the headers to the context so httpLink can read them
        return {
          headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
          },
        }
      }),
    [token],
  )

  const client = useMemo(
    () =>
      new ApolloClient({
        link: from([authLink, speckleServerLink]),
        cache: new InMemoryCache({}),
      }),
    [authLink, speckleServerLink],
  )

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
