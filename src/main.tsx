import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ClinicProvider } from './context/ClinicContext'
import { ServiceCatalogProvider } from './context/ServiceCatalogContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ServiceCatalogProvider>
      <ClinicProvider>
        <App />
      </ClinicProvider>
    </ServiceCatalogProvider>
  </React.StrictMode>,
)
