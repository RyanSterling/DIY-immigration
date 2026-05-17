import { createBrowserRouter } from 'react-router-dom';

import LayoutRoot from '~/layouts/LayoutRoot';
import LayoutAuth from '~/layouts/LayoutAuth';
import LayoutAdmin from '~/layouts/LayoutAdmin';

import PageLogin from '~/pages/auth/Login';
import PageDashboard from '~/pages/Dashboard';
import PageOrganizations from '~/pages/Organizations';
import PageOrganizationOverview from '~/pages/organizations/OrganizationOverview';
import PageOrganizationUsers from '~/pages/organizations/OrganizationUsers';
import PageOrganizationClients from '~/pages/organizations/OrganizationClients';
import PageOrganizationDocuments from '~/pages/organizations/OrganizationDocuments';
import PageOrganizationCosts from '~/pages/organizations/OrganizationCosts';
import PageFormTemplates from '~/pages/FormTemplates';
import PageFormTemplateCreate from '~/pages/form-templates/FormTemplateCreate';
import PageFormTemplateDetail from '~/pages/form-templates/FormTemplateDetail';

export const router = createBrowserRouter([
  {
    element: <LayoutRoot />,
    children: [
      // Auth routes
      {
        element: <LayoutAuth />,
        children: [
          { path: '/login', element: <PageLogin /> },
        ],
      },
      // Admin routes (protected)
      {
        element: <LayoutAdmin />,
        children: [
          { path: '/', element: <PageDashboard /> },
          { path: '/organizations', element: <PageOrganizations /> },
          { path: '/organizations/:id', element: <PageOrganizationOverview /> },
          { path: '/organizations/:id/users', element: <PageOrganizationUsers /> },
          { path: '/organizations/:id/clients', element: <PageOrganizationClients /> },
          { path: '/organizations/:id/documents', element: <PageOrganizationDocuments /> },
          { path: '/organizations/:id/costs', element: <PageOrganizationCosts /> },
          { path: '/form-templates', element: <PageFormTemplates /> },
          { path: '/form-templates/new', element: <PageFormTemplateCreate /> },
          { path: '/form-templates/:id', element: <PageFormTemplateDetail /> },
        ],
      },
    ],
  },
]);
