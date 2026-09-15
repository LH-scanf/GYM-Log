import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import './styles/global.css'

const rootElement = document.querySelector('#root')

if (!rootElement) {
  throw new Error('Unable to find the application root element.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
