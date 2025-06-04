# Dark Mode Implementation

## Overview

The CIL CBT App includes a dark mode feature that allows users to switch between light and dark themes based on their preference. This feature enhances accessibility, reduces eye strain during extended use, and provides a more comfortable viewing experience in low-light environments.

## Features

1. **Theme Toggle**
   - Users can toggle between light and dark themes with a single click
   - The toggle button is conveniently located in the application header
   - Visual feedback indicates the current theme mode

2. **Persistent Preferences**
   - User theme preferences are stored in localStorage
   - The selected theme persists between sessions
   - The application remembers each user's preferred theme

3. **Responsive Design**
   - Dark mode is applied consistently across all components
   - All UI elements maintain proper contrast ratios in both themes
   - Custom styling for both modes ensures readability and usability

## Implementation Details

### ThemeContext

The implementation uses React's Context API to manage theme state globally:

```tsx
// ThemeContext.tsx
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteMode } from '@mui/material';

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load theme preference from localStorage
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('theme');
    return (savedMode === 'dark' || savedMode === 'light') ? savedMode : 'light';
  });

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  // Toggle theme function
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Create theme
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      // Theme-specific colors
    }
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
```

### Theme Toggle Button

A toggle button in the Layout component allows users to switch between themes:

```tsx
// In Layout.tsx
import { useTheme } from '../contexts/ThemeContext';
import { Brightness4, Brightness7 } from '@mui/icons-material';

export const Layout = () => {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton onClick={toggleTheme} color="inherit">
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};
```

## Theme Color Palette

### Light Theme Colors
- **Primary**: #1976d2
- **Secondary**: #dc004e
- **Background**: #f5f5f5
- **Paper**: #ffffff
- **Text**: #000000

### Dark Theme Colors
- **Primary**: #90caf9
- **Secondary**: #f48fb1
- **Background**: #121212
- **Paper**: #1e1e1e
- **Text**: #ffffff

## Accessibility Considerations

- Color contrast ratios meet WCAG AA standards in both themes
- Interactive elements maintain clear focus indicators in dark mode
- Error and success states remain clearly distinguishable in both themes

## Best Practices

1. **Testing Both Themes**
   - Always test components in both light and dark modes
   - Ensure proper contrast and readability in all states

2. **Custom Component Theming**
   - For custom components, use theme-dependent styling
   - Access the current theme using `useTheme` hook

3. **Icons and Images**
   - Choose icons that are visible in both themes
   - Consider providing alternative assets for dark mode when necessary

## Known Limitations

1. Some third-party components may not fully support theme switching
2. Certain visualizations (charts, graphs) may need manual adjustments for dark mode
3. Very specific custom components might require additional theming adjustments
