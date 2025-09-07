import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';  
import App from './App.jsx';
import client from './components/Apolloclient.js';
import { ApolloProvider } from '@apollo/client';

// Render root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
