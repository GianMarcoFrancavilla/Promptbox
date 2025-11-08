import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'  // ← Deve essere './App.jsx' non './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
