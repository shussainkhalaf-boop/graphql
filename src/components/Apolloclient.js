// Apollo imports
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

//  HTTP link to the GraphQL endpoint
const httpLink = createHttpLink({
  uri: 'https://learn.reboot01.com/api/graphql-engine/v1/graphql', 
});

// authLink adds the JWT as Bearer token to each request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token'); // retrieve JWT from localStorage
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Apollo client with authLink
 const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
export default client;