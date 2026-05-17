import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { cn } from '~/utils/cn';
import { useAuth } from '~/providers/AuthProvider';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Organisations', href: '/organizations', icon: BuildingOfficeIcon },
  { name: 'Form Templates', href: '/form-templates', icon: ClipboardDocumentListIcon },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Detect if we're viewing an organization
  const orgMatch = location.pathname.match(/^\/organizations\/([^/]+)/);
  const activeOrgId = orgMatch ? orgMatch[1] : null;

  // Organization sub-navigation (shown when viewing an org)
  const orgSubNavigation = activeOrgId
    ? [
        { name: 'Overview', href: `/organizations/${activeOrgId}`, icon: Squares2X2Icon },
        { name: 'Users', href: `/organizations/${activeOrgId}/users`, icon: UsersIcon },
        { name: 'Clients', href: `/organizations/${activeOrgId}/clients`, icon: UserGroupIcon },
        { name: 'Documents', href: `/organizations/${activeOrgId}/documents`, icon: DocumentTextIcon },
        { name: 'Costs', href: `/organizations/${activeOrgId}/costs`, icon: CurrencyDollarIcon },
      ]
    : [];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    // For org sub-pages, use exact match
    if (href.includes('/organizations/') && href !== '/organizations') {
      return location.pathname === href;
    }
    // For main nav, use startsWith but not for org detail pages
    if (href === '/organizations') {
      return location.pathname === '/organizations';
    }
    return location.pathname.startsWith(href);
  };

  const isOrgActive = activeOrgId !== null;

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold text-white">VisaFlow Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {mainNavigation.map((item) => (
          <div key={item.name}>
            <Link
              to={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive(item.href) || (item.href === '/organizations' && isOrgActive)
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 shrink-0',
                  isActive(item.href) || (item.href === '/organizations' && isOrgActive)
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>

            {/* Organization sub-navigation */}
            {item.href === '/organizations' && isOrgActive && (
              <div className="mt-1 space-y-1">
                {orgSubNavigation.map((subItem) => (
                  <Link
                    key={subItem.name}
                    to={subItem.href}
                    className={cn(
                      'group flex items-center pl-10 pr-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive(subItem.href)
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <subItem.icon
                      className={cn(
                        'mr-3 h-4 w-4 shrink-0',
                        isActive(subItem.href)
                          ? 'text-white'
                          : 'text-gray-500 group-hover:text-white'
                      )}
                    />
                    {subItem.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center">
          <div className="shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName || user?.email}
            </p>
            <p className="text-xs text-gray-400">Super Admin</p>
          </div>
          <button
            onClick={logout}
            className="ml-2 p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-800"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
