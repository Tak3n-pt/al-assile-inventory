import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const timeoutRef = useRef(null);

  const showNotification = useCallback((message, type = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setNotification({ message, type, id: Date.now() });
    timeoutRef.current = setTimeout(() => setNotification(null), 3000);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (
    <NotificationContext.Provider value={{ notification, showNotification, dismissNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
