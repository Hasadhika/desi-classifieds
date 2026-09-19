import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Ban } from 'lucide-react';
import CategoryPage from './pages/CategoryPage';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const NO_LAYOUT_PAGES = new Set(['Login', 'Signup', 'AdminDashboard']);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const BlockedUserPage = () => {
  const { logout } = useAuth();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ban className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-500 text-sm mb-6">
          Your account has been suspended due to a violation of our community guidelines.
          Please contact support if you believe this is an error.
        </p>
        <button
          onClick={logout}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

const AdminRoute = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/Login" replace />;
  }
  return children;
};

const AdminRedirect = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (user?.role === 'admin') {
    return <Navigate to="/AdminDashboard" replace />;
  }
  return children;
};

const AuthenticatedApp = () => {
  const { user, authError } = useAuth();
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath === '/Login' || currentPath === '/Signup';

  if (authError && !isAuthPage) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  if (user?.role === 'banned') {
    return <BlockedUserPage />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <AdminRedirect>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </AdminRedirect>
      } />
      {Object.entries(Pages).map(([path, Page]) => {
        const noLayout = NO_LAYOUT_PAGES.has(path);
        const isAdmin = path === 'AdminDashboard';
        const isUserFacingPage = path === 'Home' || path === 'Browse' || path === 'PostAd';
        const element = noLayout ? <Page /> : (
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        );
        let routeElement = element;
        if (isAdmin) {
          routeElement = <AdminRoute>{element}</AdminRoute>;
        } else if (isUserFacingPage) {
          routeElement = <AdminRedirect>{element}</AdminRedirect>;
        }
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={routeElement}
          />
        );
      })}
      {/* SEO-friendly slug routes — must come before the * catch-all.
          React Router v6 prefers static segments over dynamic, so /Browse,
          /PostAd, etc. (all PascalCase) take precedence over /:catSlug. */}

      {/* Individual listing: /{catSlug}/{provSlug}/{titleSlug} */}
      <Route
        path="/:catSlug/:provSlug/:titleSlug"
        element={
          <LayoutWrapper currentPageName="ListingDetail">
            <Pages.ListingDetail />
          </LayoutWrapper>
        }
      />

      {/* Category + province landing page: /{catSlug}/{provSlug} */}
      <Route
        path="/:catSlug/:provSlug"
        element={
          <LayoutWrapper currentPageName="Browse">
            <CategoryPage />
          </LayoutWrapper>
        }
      />

      {/* Category-only landing page: /{catSlug} */}
      <Route
        path="/:catSlug"
        element={
          <LayoutWrapper currentPageName="Browse">
            <CategoryPage />
          </LayoutWrapper>
        }
      />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
