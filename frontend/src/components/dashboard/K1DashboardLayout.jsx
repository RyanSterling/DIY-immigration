/**
 * K1DashboardLayout Component
 * Tab-based layout for the K-1 DIY Dashboard
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Timeline' }
];

export default function K1DashboardLayout({ activeTab, onTabChange, children }) {
  return (
    <div>
      {/* Tab navigation */}
      <div
        className="border-b mb-6"
        style={{ borderColor: '#E6E4E1' }}
      >
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="px-4 py-3 relative transition-colors"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: activeTab === tab.id ? '600' : '400',
                color: activeTab === tab.id ? '#1E3A5F' : '#77716E',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: '#1E3A5F' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {children}
      </div>
    </div>
  );
}
