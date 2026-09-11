import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DisasterProvider } from './context/DisasterContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DisasterProvider>
      <App />
    </DisasterProvider>
  </React.StrictMode>
);
