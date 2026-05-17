import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import LayoutAuth from '~/layouts/LayoutAuth';

const PageLogin = lazy(() => import('~/pages/auth/Login'));
const PageForgotPassword = lazy(() => import('~/pages/auth/ForgotPassword'));
const PageResetPassword = lazy(() => import('~/pages/auth/ResetPassword'));

export const authRoutes: RouteObject = {
  element: <LayoutAuth />,
  children: [
    {
      path: '/login',
      element: (
        <Suspense fallback={null}>
          <PageLogin />
        </Suspense>
      ),
    },
    {
      path: '/forgot-password',
      element: (
        <Suspense fallback={null}>
          <PageForgotPassword />
        </Suspense>
      ),
    },
    {
      path: '/reset-password',
      element: (
        <Suspense fallback={null}>
          <PageResetPassword />
        </Suspense>
      ),
    },
  ],
};
