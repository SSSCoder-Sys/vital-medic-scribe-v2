// App.jsx is the "root" of our React app.
// Right now it just shows one page: the Dashboard.
// Later, if we add more pages (like a report history page),
// we'd add a router here and switch between pages.

import Dashboard from './pages/Dashboard.jsx'

function App() {
  return <Dashboard />
}

export default App
