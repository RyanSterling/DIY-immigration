import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0084ff', // primary-600
      light: '#60a5fa', // primary-400
      dark: '#2563eb', // primary-700
    },
    error: {
      main: '#ef4444', // red-500
    },
  },
  typography: {
    fontFamily: 'inherit',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d1d5db', // gray-300
            borderRadius: '0.375rem', // rounded-md
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#9ca3af', // gray-400
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0084ff', // primary-600
            borderWidth: '1px',
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: '#fca5a5', // red-300
          },
          '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ef4444', // red-500
          },
        },
        input: {
          padding: '0.5rem 0.75rem', // py-2 px-3
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
      },
    },
  },
});

interface MuiProviderProps {
  children: ReactNode;
}

export function MuiProvider({ children }: MuiProviderProps) {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
