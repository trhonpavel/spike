import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import HomePage from './pages/HomePage'
import TournamentPage from './pages/TournamentPage'
import StandingsPage from './pages/StandingsPage'
import AdminPage from './pages/AdminPage'
import TournamentsPage from './pages/TournamentsPage'
import LeaguePage from './pages/LeaguePage'
import PasswordGate from './components/PasswordGate'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PasswordGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/t/:slug" element={<TournamentPage />} />
            <Route path="/t/:slug/standings" element={<StandingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/l/:slug" element={<LeaguePage />} />
          </Routes>
        </BrowserRouter>
      </PasswordGate>
    </QueryClientProvider>
  </StrictMode>,
)
