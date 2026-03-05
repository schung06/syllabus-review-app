import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';

function App() {
  const [activeReviewer, setActiveReviewer] = useState(null);
  const [siteAuthenticated, setSiteAuthenticated] = useState(() => {
    return sessionStorage.getItem('site_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const sitePassword = import.meta.env.VITE_SITE_PASSWORD || 'SPECS';
    if (password === sitePassword) {
      setSiteAuthenticated(true);
      sessionStorage.setItem('site_auth', 'true');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  if (!siteAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="card" style={{ width: '400px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '24px' }}>Site Access Restricted</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="input-group" style={{ marginBottom: '16px', textAlign: 'left' }}>
              <input
                type="password"
                className="input-field"
                placeholder="Enter site password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enter Site</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {activeReviewer && (
        <header className="app-header">
          <div className="container flex justify-between items-center" style={{ width: '100%' }}>
            <h2>Syllabus Review</h2>
            <div className="flex items-center gap-md">
              <span style={{ fontWeight: 500 }}>👤 {activeReviewer.name}</span>
              <button
                className="btn btn-outline"
                onClick={() => setActiveReviewer(null)}
              >Switch Reviewer</button>
            </div>
          </div>
        </header>
      )}
      <main className="container" style={{ padding: '24px 0' }}>
        <Routes>
          <Route
            path="/"
            element={activeReviewer ? <Dashboard reviewer={activeReviewer} /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!activeReviewer ? <Login onLogin={setActiveReviewer} /> : <Navigate to="/" />}
          />
          <Route
            path="/review/:assignmentId"
            element={activeReviewer ? <Review reviewer={activeReviewer} /> : <Navigate to="/login" />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
