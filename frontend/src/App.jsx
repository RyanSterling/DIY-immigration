import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Show, RedirectToSignIn } from '@clerk/react';
import QuizContainer from './components/quiz/QuizContainer';
import K1QuizContainer from './components/quiz/K1QuizContainer';
import LandingPage from './pages/LandingPage';
import Privacy from './pages/Privacy';
import Dashboard from './pages/Dashboard';
import K1Dashboard from './pages/K1Dashboard';
import VisaDashboard from './pages/VisaDashboard';
import Footer from './components/shared/Footer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/assessment" element={
          <>
            <QuizContainer />
            <Footer />
          </>
        } />
        <Route path="/assessment/k1" element={
          <>
            <K1QuizContainer />
            <Footer />
          </>
        } />
        {/* Backward compatibility redirect */}
        <Route path="/k1" element={<Navigate to="/assessment/k1" replace />} />
        <Route path="/privacy" element={
          <>
            <Privacy />
            <Footer />
          </>
        } />

        {/* Protected Routes */}
        {/* Generic visa dashboard - supports any visa type via URL param */}
        <Route path="/visa/:visaType" element={
          <>
            <Show when="signed-in">
              <VisaDashboard />
            </Show>
            <Show when="signed-out">
              <RedirectToSignIn />
            </Show>
          </>
        } />
        {/* Keep old K-1 route for backward compatibility */}
        <Route path="/dashboard/k1" element={
          <>
            <Show when="signed-in">
              <K1Dashboard />
            </Show>
            <Show when="signed-out">
              <RedirectToSignIn />
            </Show>
          </>
        } />
        <Route path="/dashboard" element={
          <>
            <Show when="signed-in">
              <Dashboard />
              <Footer />
            </Show>
            <Show when="signed-out">
              <RedirectToSignIn />
            </Show>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
