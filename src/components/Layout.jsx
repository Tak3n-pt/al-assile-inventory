import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info } from 'lucide-react';
import Sidebar from './Sidebar';
import TitleBar from './TitleBar';
import { useNotification } from '../contexts/NotificationContext';

const Layout = () => {
  const { notification, dismissNotification } = useNotification();

  return (
    <div className="h-screen flex flex-col bg-dark-950 overflow-hidden">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Global Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            onClick={dismissNotification}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-2xl
              flex items-center gap-3 cursor-pointer select-none ${
                notification.type === 'error'
                  ? 'bg-red-500'
                  : notification.type === 'info'
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
              } text-white font-medium`}
          >
            {notification.type === 'error' ? <AlertCircle size={20} /> : notification.type === 'info' ? <Info size={20} /> : <Check size={20} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-dark-900">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-primary/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent-secondary/10 via-transparent to-transparent" />
          </div>

          {/* Content Container */}
          <motion.div
            className="relative z-10 p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
