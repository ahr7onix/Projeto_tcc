import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { capturarErrosGlobais } from './lib/logger'
import './index.css'

capturarErrosGlobais()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
