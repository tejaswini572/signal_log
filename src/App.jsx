/**
 * App — root component with client-side routing.
 * Renders the NavBar and the four main screens via React Router.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import StartIncident from './pages/StartIncident'
import Timeline from './pages/Timeline'
import VerifyChain from './pages/VerifyChain'
import Export from './pages/Export'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <NavBar />
        <Routes>
          <Route path="/" element={<StartIncident />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/verify" element={<VerifyChain />} />
          <Route path="/export" element={<Export />} />
          {/* Catch-all: redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
