/**
 * App shell: providers, layout and routes.
 * Pages other than Home are code-split (loaded on first visit) for speed.
 * HashRouter works on any static host; VITE_ROUTER=memory for sandboxes.
 */
import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PrefsProvider } from './state/PrefsContext';
import { BookingProvider } from './state/BookingContext';
import { AuthProvider } from './state/AuthContext';
import { Footer, Header, TabBar } from './ui/components/Layout';
import { ChatWidget } from './ui/components/ChatWidget';
import { Skeleton } from './ui/components/primitives';
import { HomePage } from './ui/pages/HomePage';

const ServicesPage = lazy(() => import('./ui/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const CategoryPage = lazy(() => import('./ui/pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const MastersPage = lazy(() => import('./ui/pages/MastersPage').then((m) => ({ default: m.MastersPage })));
const MasterProfilePage = lazy(() => import('./ui/pages/MasterProfilePage').then((m) => ({ default: m.MasterProfilePage })));
const ContactPage = lazy(() => import('./ui/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const RequestsPage = lazy(() => import('./ui/pages/RequestsPage').then((m) => ({ default: m.RequestsPage })));
const PriceCheckPage = lazy(() => import('./ui/pages/PriceCheckPage').then((m) => ({ default: m.PriceCheckPage })));
const AuthPage = lazy(() => import('./ui/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const ProPage = lazy(() => import('./ui/pages/ProPage').then((m) => ({ default: m.ProPage })));
const MessagesPage = lazy(() => import('./ui/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const SourcesPage = lazy(() => import('./ui/pages/SourcesPage').then((m) => ({ default: m.SourcesPage })));

const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : HashRouter;

/** Scroll to top on page change; re-trigger the page fade-in. */
function Page() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <main className="page" key={pathname.split('/')[1]}>
      <Suspense fallback={<div className="container"><Skeleton h={400} /></div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/c/:slug" element={<CategoryPage />} />
          <Route path="/c/:slug/masters" element={<MastersPage />} />
          <Route path="/masters" element={<MastersPage />} />
          <Route path="/master/:id" element={<MasterProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/check" element={<PriceCheckPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pro/*" element={<ProPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:id" element={<MessagesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </main>
  );
}

export default function App() {
  return (
    <PrefsProvider>
      <AuthProvider>
      <BookingProvider>
        <Router>
          <div className="shell">
            <Header />
            <Page />
            <Footer />
            <TabBar />
            <ChatWidget />
          </div>
        </Router>
      </BookingProvider>
      </AuthProvider>
    </PrefsProvider>
  );
}
