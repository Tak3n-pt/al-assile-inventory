import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './styles/index.css';

// Fix: Electron frameless window loses keyboard focus after native dialogs.
// Only restore focus after the specific events that cause loss, not on every keystroke
// (which was interfering with NumLock / keyboard state).
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

// Restore focus only when clicking the title bar drag region (which steals focus).
// Clicks inside the app content don't need this.
document.addEventListener('mousedown', (e) => {
  const titleBar = e.target.closest('.title-bar');
  if (titleBar) {
    setTimeout(() => window.focus(), 50);
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
