import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './styles/index.css';

// Fix: Electron frameless window loses keyboard focus after native dialogs
// Patch window.confirm AND window.alert to restore focus after dialog closes
const originalConfirm = window.confirm;
window.confirm = function(message) {
  const result = originalConfirm.call(window, message);
  setTimeout(() => window.focus(), 50);
  return result;
};

const originalAlert = window.alert;
window.alert = function(message) {
  originalAlert.call(window, message);
  setTimeout(() => window.focus(), 50);
};

// Fix: Aggressive focus restoration for frameless Electron windows.
// The webContents can silently lose keyboard focus from:
// - Clicking the drag region (title bar)
// - Native dialogs (confirm/alert/print)
// - CustomSelect dropdowns stealing focus
// - Auto-sync fetch() calls
// This ensures clicking ANYWHERE in the app restores keyboard input.
document.addEventListener('mousedown', () => {
  setTimeout(() => window.focus(), 10);
});

// Also restore focus on any keydown attempt (catches the "stuck" state)
document.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  const isInput = active && ['INPUT', 'TEXTAREA'].includes(active.tagName);
  // If user is trying to type but focus is lost (body or non-input has focus)
  if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    window.focus();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
