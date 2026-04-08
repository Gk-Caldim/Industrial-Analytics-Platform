import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Reads persisted mode from localStorage (instant, before any API call)
const getInitialMode = () => {
  try { return localStorage.getItem('display_mode') || 'light'; }
  catch { return 'light'; }
};

// Applies dark/light by toggling data-theme on <html>
const applyDisplayMode = (mode) => {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
};

export const ThemeProvider = ({ children }) => {
  const [themeSettings, setThemeSettings] = useState({
    primaryColor: '#6366f1',
    secondaryColor: '#0ea5e9',
    displayMode: getInitialMode(),
    companyName: 'Industrial Analytics Platform',
    companyLogo: '',
  });

  // Apply on first render immediately (no flash)
  useEffect(() => {
    applyDisplayMode(themeSettings.displayMode);
  }, []); // eslint-disable-line

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme.primaryColor) {
      root.style.setProperty('--primary-color', theme.primaryColor);
      if (theme.primaryColor.startsWith('#')) {
        const hex = theme.primaryColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        root.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
      }
    }
    // Apply display mode to DOM
    applyDisplayMode(theme.displayMode || 'light');
    // Persist for instant next-load
    try { localStorage.setItem('display_mode', theme.displayMode || 'light'); }
    catch { }
  };

  const fetchTheme = async () => {
    try {
      const response = await API.get('/settings/');
      const settings = response.data;
      const newTheme = { ...themeSettings };
      settings.forEach((s) => {
        if (s.key === 'primary_color') newTheme.primaryColor = s.value;
        if (s.key === 'secondary_color') newTheme.secondaryColor = s.value;
        if (s.key === 'display_mode') newTheme.displayMode = s.value;
        if (s.key === 'company_name') newTheme.companyName = s.value;
        if (s.key === 'company_logo') newTheme.companyLogo = s.value;
      });
      setThemeSettings(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Error fetching theme settings:', error);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []); // eslint-disable-line

  const updateThemeLocally = (newSettings) => {
    const updated = { ...themeSettings, ...newSettings };
    setThemeSettings(updated);
    applyTheme(updated);
  };

  return (
    <ThemeContext.Provider value={{ themeSettings, updateThemeLocally, refreshTheme: fetchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
