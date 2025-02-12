import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useTheme } from '../context/ThemeContext';
import AdBanner from './AdBanner';

export default function Layout() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme} min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-b from-primary-800 to-primary-900'}`}>
      <Navbar />

      {/* Top Ad Banner */}
      <AdBanner type="horizontal" className="w-full bg-white/5 backdrop-blur-sm border-b border-primary-700/20 py-2" />

      <div className="flex-1 flex relative">
        {/* Main Content */}
        <div className="flex-1 mx-auto max-w-[1600px] w-full">
          <div className="flex">
            {/* Left Vertical Ad Banner */}
            <AdBanner type="vertical" className="hidden lg:block w-[200px] px-4 sticky top-8" />

            {/* Main Content Area */}
            <main className="flex-1 px-4 py-8">
              <Outlet />
            </main>

            {/* Right Vertical Ad Banner */}
            <AdBanner type="vertical" className="hidden lg:block w-[200px] px-4 sticky top-8" />
          </div>
        </div>
      </div>

      {/* Bottom Ad Banner */}
      <div className="w-full bg-primary-900/50 backdrop-blur-sm border-t border-primary-700">
        <AdBanner type="horizontal" className="py-4" />
        <Footer />
      </div>
    </div>
  );
}