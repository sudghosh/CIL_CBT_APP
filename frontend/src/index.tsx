import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Import development tools (will only be active in development mode)
import './utils/devTools';
// Import auth verification (will only be active in development mode)
import './utils/authVerification';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
