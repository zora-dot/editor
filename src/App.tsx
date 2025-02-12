import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ViewPaste from './pages/ViewPaste';
import EditPaste from './pages/EditPaste';
import Settings from './pages/Settings';
import Folders from './pages/Folders';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Drafts from './pages/Drafts';
import ActivityFeed from './pages/ActivityFeed';
import Pricing from './pages/Pricing';
import Purchase from './pages/Purchase';
import Success from './pages/Success';
import AuthCallback from './pages/AuthCallback';
import AllPastes from './pages/AllPastes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import CreatePaste from './pages/CreatePaste';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ThemeProvider>
          <SubscriptionProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/all-pastes" element={<AllPastes />} />
                  <Route path="/paste/:id" element={<ViewPaste />} />
                  <Route path="/paste/:id/edit" element={<EditPaste />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/folders" element={<Folders />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/drafts" element={<Drafts />} />
                  <Route path="/activity" element={<ActivityFeed />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/purchase" element={<Purchase />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/create-paste" element={<CreatePaste />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </SubscriptionProvider>
        </ThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;