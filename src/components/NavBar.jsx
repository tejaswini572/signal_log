/**
 * NavBar — top navigation bar for SignalLog.
 * Uses NavLink from react-router-dom for active-state styling.
 */
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

export default function NavBar() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header>
      <nav className="nav-bar" role="navigation" aria-label="Main navigation">
        {/* Brand */}
        <NavLink to="/" className="nav-brand" aria-label="SignalLog home">
          {/* Shield / signal icon rendered as inline SVG — no external resource */}
          <svg
            className="brand-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.35C16.5 21.15 20 16.25 20 11V5l-8-3z" />
          </svg>
          SignalLog
        </NavLink>

        {/* Navigation links */}
        <ul className="nav-links" role="list">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Start Incident
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/timeline"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Timeline
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/verify"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Verify Chain
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/export"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Export
            </NavLink>
          </li>
        </ul>

        {/* PWA / Network Status Indicator */}
        <div className={`status-pill ${!isOnline ? 'offline' : ''}`} title={isOnline ? 'PWA precached & active' : 'Running offline from service worker cache'}>
          <span className="status-pill-dot" aria-hidden="true"></span>
          <span>{isOnline ? 'PWA Ready' : 'Offline Mode'}</span>
        </div>
      </nav>
    </header>
  )
}
