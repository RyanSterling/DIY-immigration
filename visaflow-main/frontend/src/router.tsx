import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LayoutRoot from '~/layouts/LayoutRoot';
import LayoutPrivate from '~/layouts/LayoutPrivate';
import { authRoutes } from '~/routes/auth.routes';

const PageClients = lazy(() => import('~/pages/Clients'));
const PageClientNew = lazy(() => import('~/pages/client-new'));
const ClientDetailLayout = lazy(() => import('~/pages/client-detail/ClientDetailLayout'));
const ClientProfile = lazy(() => import('~/pages/client-detail/ClientProfile'));
const ClientForms = lazy(() => import('~/pages/client-detail/ClientForms'));
const PageForms = lazy(() => import('~/pages/Forms'));
const PageFormInstance = lazy(() => import('~/pages/FormInstance'));
const PageSettings = lazy(() => import('~/pages/Settings'));
const PageNotFound = lazy(() => import('~/pages/NotFound'));

export const router = createBrowserRouter([
  {
    element: <LayoutRoot />,
    errorElement: (
      <Suspense fallback={null}>
        <PageNotFound />
      </Suspense>
    ),
    children: [
      authRoutes,
      {
        element: <LayoutPrivate />,
        children: [
          {
            path: '/',
            element: (
              <Suspense fallback={null}>
                <PageClients />
              </Suspense>
            ),
          },
          {
            path: '/clients',
            element: (
              <Suspense fallback={null}>
                <PageClients />
              </Suspense>
            ),
          },
          {
            path: '/clients/new',
            element: (
              <Suspense fallback={null}>
                <PageClientNew />
              </Suspense>
            ),
          },
          {
            path: '/clients/:id',
            element: (
              <Suspense fallback={null}>
                <ClientDetailLayout />
              </Suspense>
            ),
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={null}>
                    <ClientProfile />
                  </Suspense>
                ),
              },
              {
                path: 'forms',
                element: (
                  <Suspense fallback={null}>
                    <ClientForms />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: '/forms',
            element: (
              <Suspense fallback={null}>
                <PageForms />
              </Suspense>
            ),
          },
          {
            path: '/forms/:templateId/:instanceId',
            element: (
              <Suspense fallback={null}>
                <PageFormInstance />
              </Suspense>
            ),
          },
          {
            path: '/settings',
            element: (
              <Suspense fallback={null}>
                <PageSettings />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
