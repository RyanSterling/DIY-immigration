/**
 * AccountSidebar Component
 * Sidebar for account/visa selection page
 */

import { Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/react';

export default function AccountSidebar({ visaApplications = [] }) {
  const location = useLocation();

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 w-64"
      style={{ backgroundColor: '#151A22' }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link
          to="/"
          style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.125rem',
            color: 'white',
            textDecoration: 'none'
          }}
        >
          Immigration DIY
        </Link>
      </div>

      {/* My Visas Section */}
      <div className="p-4 border-b border-white/10">
        <h3
          className="text-xs uppercase tracking-wider mb-3"
          style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Soehne, sans-serif' }}
        >
          My Visa Applications
        </h3>
        <div className="space-y-2">
          {visaApplications.map((visa) => (
            <Link
              key={visa.type}
              to={`/visa/${visa.type}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#1E3A5F' }}
              >
                <span style={{ color: 'white', fontSize: '0.75rem', fontFamily: 'Soehne, sans-serif', fontWeight: '600' }}>
                  {visa.type.toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <div style={{ color: 'white', fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem' }}>
                  {visa.name}
                </div>
                {visa.progress !== undefined && (
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                    {visa.progress}% complete
                  </div>
                )}
              </div>
            </Link>
          ))}

          {visaApplications.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontFamily: 'Soehne, sans-serif' }}>
              No active applications
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <Link
          to="/account"
          className="flex items-center gap-3 px-4 py-3 transition-all"
          style={{
            backgroundColor: location.pathname === '/account' ? '#21252C' : 'transparent',
            borderLeft: location.pathname === '/account' ? '3px solid #4ADE80' : '3px solid transparent',
            textDecoration: 'none'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span style={{ color: 'white', fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem' }}>
            My Account
          </span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 transition-all"
          style={{
            backgroundColor: 'transparent',
            borderLeft: '3px solid transparent',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span style={{ color: 'white', fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem' }}>
            Take Assessment
          </span>
        </Link>
      </nav>

      {/* Footer - User */}
      <div className="mt-auto p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem' }}>
            Account
          </span>
        </div>
      </div>
    </aside>
  );
}
