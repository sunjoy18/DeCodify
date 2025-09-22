import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import './index.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00e5ff' }, // neon cyan
    secondary: { main: '#ff6ec7' }, // neon magenta
    background: {
      default: '#0b0e14',
      paper: 'rgba(17, 25, 40, 0.55)'
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8'
    },
    divider: 'rgba(255,255,255,0.08)'
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Share Tech Mono", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: 1 },
    h2: { fontWeight: 700, letterSpacing: 1 },
    h3: { fontWeight: 700, letterSpacing: 0.5 },
    button: { textTransform: 'none', letterSpacing: 0.5 }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(17, 25, 40, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px) saturate(120%)',
          WebkitBackdropFilter: 'blur(10px) saturate(120%)',
          color: '#e6edf3'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(17, 25, 40, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px) saturate(120%)',
          WebkitBackdropFilter: 'blur(10px) saturate(120%)',
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(17, 25, 40, 0.6)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px) saturate(130%)',
          WebkitBackdropFilter: 'blur(8px) saturate(130%)',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: '14px',
          paddingRight: '14px'
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00e5ff 0%, #00bcd4 100%)',
          boxShadow: '0 8px 20px rgba(0, 229, 255, 0.25)',
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ff6ec7 0%, #ff3d81 100%)',
          boxShadow: '0 8px 20px rgba(255, 110, 199, 0.25)'
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: 'rgba(255,255,255,0.18)' },
        root: {
          background: 'rgba(255,255,255,0.06)',
          color: '#e6edf3'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)'
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
); 