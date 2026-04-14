import { Navigate, Route, Routes } from 'react-router-dom';
import { AvailabilityPage } from './pages/AvailabilityPage.jsx';
import { BookingPage } from './pages/BookingPage.jsx';
import { ConfirmationPage } from './pages/ConfirmationPage.jsx';
import { EventTypesPage } from './pages/EventTypesPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { MeetingsPage } from './pages/MeetingsPage.jsx';
import { PublicEventTypesPage } from './pages/PublicEventTypesPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
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
