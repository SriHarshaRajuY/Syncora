import { Navigate, Route, Routes } from 'react-router-dom';
import { AvailabilityPage } from './pages/AvailabilityWorkspacePage.jsx';
import { BookingPage } from './pages/BookingWorkspacePage.jsx';
import { ConfirmationPage } from './pages/ConfirmationWorkspacePage.jsx';
import { EventTypesPage } from './pages/EventTypesWorkspacePage.jsx';
import { MeetingsPage } from './pages/MeetingsWorkspacePage.jsx';
import { PublicEventTypesPage } from './pages/PublicEventTypesPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/events" replace />} />
      <Route path="/events" element={<EventTypesPage />} />
      <Route path="/availability" element={<AvailabilityPage />} />
      <Route path="/meetings" element={<MeetingsPage />} />
      <Route path="/book" element={<PublicEventTypesPage />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book/:slug/confirmed/:id" element={<ConfirmationPage />} />
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
}
