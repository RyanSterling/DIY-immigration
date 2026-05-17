import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-acroform/styles.css'
import 'react-toastify/dist/ReactToastify.css'
import { queryClient } from '~/lib/cache'
import { AuthProvider } from '~/providers/AuthProvider'
import { MuiProvider } from '~/providers/MuiProvider'
import { ErrorBoundary } from '~/components/ErrorBoundary'
import { router } from '~/router'
import './tailwind.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MuiProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} closeOnClick pauseOnHover />
          </AuthProvider>
        </MuiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
