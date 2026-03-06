import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import LicenseGate from './components/LicenseGate'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import DevisList from './pages/DevisList'
import DevisEditor from './pages/DevisEditor'
import FacturesList from './pages/FacturesList'
import FactureView from './pages/FactureView'
import Catalogue from './pages/Catalogue'
import Rapports from './pages/Rapports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <LicenseGate>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="devis" element={<DevisList />} />
            <Route path="devis/:id" element={<DevisEditor />} />
            <Route path="factures" element={<FacturesList />} />
            <Route path="factures/:id" element={<FactureView />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="rapports" element={<Rapports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </LicenseGate>
    </ErrorBoundary>
  )
}
