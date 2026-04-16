import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { hasSeenLanding, markLandingSeen } from './lib/onboarding.js';
import { AvailabilityPage } from './pages/AvailabilityWorkspacePage.jsx';
import { BookingPage } from './pages/BookingWorkspacePage.jsx';
import { ConfirmationPage } from './pages/ConfirmationWorkspacePage.jsx';
import { EventTypesPage } from './pages/EventTypesWorkspacePage.jsx';
import { HomePage } from './pages/LandingPage.jsx';
import { MeetingsPage } from './pages/MeetingsWorkspacePage.jsx';
import { PublicEventTypesPage } from './pages/PublicEventTypesPage.jsx';

export default function App() {
  const location = useLocation();
  const [hasCompletedLanding, setHasCompletedLanding] = useState(() => hasSeenLanding());

  useEffect(() => {
    if (location.pathname !== '/' && !hasCompletedLanding) {
      markLandingSeen();
      setHasCompletedLanding(true);
    }
  }, [hasCompletedLanding, location.pathname]);

  const homeElement = useMemo(() => {
    if (hasCompletedLanding) {
      return <Navigate to="/events" replace />;
    }

    return <HomePage onEnterWorkspace={() => setHasCompletedLanding(true)} />;
  }, [hasCompletedLanding]);

  return (
    <Routes>
      <Route path="/" element={homeElement} />
      <Route path="/events" element={<EventTypesPage />} />
      <Route path="/availability" element={<AvailabilityPage />} />
      <Route path="/meetings" element={<MeetingsPage />} />
      <Route path="/book" element={<PublicEventTypesPage />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book/:slug/confirmed/:id" element={<ConfirmationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
