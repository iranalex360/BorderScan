import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import MapView from './pages/MapView.jsx';
import Report from './pages/Report.jsx';
import PredictionQuality from './pages/PredictionQuality.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header" style={{ height: 'auto', padding: '0.75rem 2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="header-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="header-icon">🛂</span>
              <span className="header-title" style={{ fontSize: '1.25rem', fontWeight: '800' }}>BorderScan</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>TJ → SD border advisor</span>
          </div>
          <nav className="header-nav" style={{ marginLeft: 'auto' }}>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Dashboard
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Map
            </NavLink>
            <NavLink to="/report" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Report
            </NavLink>
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/report" element={<Report />} />
            <Route path="/prediction-quality" element={<PredictionQuality />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
