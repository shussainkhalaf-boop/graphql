import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const token = localStorage.getItem("token"); // Get the token from localStorage

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://learn.reboot01.com/api/graphql-engine/v1/graphql",
    headers: {
      Authorization: token ? `Bearer ${token}` : "", // Ensure Bearer token format
    },
  }),
  cache: new InMemoryCache(),
});

export default client;
