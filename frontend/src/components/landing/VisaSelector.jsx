import { Link } from 'react-router-dom';

const VISA_CATEGORIES = [
  {
    id: 'family',
    title: 'Family-Based',
    description: 'For those with US citizen or permanent resident family ties',
    visas: [
      {
        code: 'k1',
        name: 'K-1 Fiancé Visa',
        shortDesc: 'For fiancé(e)s of US citizens',
        hasDedicatedAssessment: true,
        route: '/assessment/k1'
      }
    ]
  },
  {
    id: 'work',
    title: 'Work Visas',
    description: 'For skilled workers and professionals',
    visas: [
      {
        code: 'h1b',
        name: 'H-1B Specialty Occupation',
        shortDesc: 'Bachelor\'s degree required, employer sponsorship',
        hasDedicatedAssessment: false,
        route: '/assessment'
      },
      {
        code: 'l1',
        name: 'L-1 Intracompany Transfer',
        shortDesc: 'For managers or specialized employees transferring',
        hasDedicatedAssessment: false,
        route: '/assessment'
      },
      {
        code: 'o1',
        name: 'O-1 Extraordinary Ability',
        shortDesc: 'For those with exceptional achievements',
        hasDedicatedAssessment: false,
        route: '/assessment'
      }
    ]
  },
  {
    id: 'green_card',
    title: 'Green Cards',
    description: 'Permanent residence pathways',
    visas: [
      {
        code: 'eb1a',
        name: 'EB-1A Extraordinary Ability',
        shortDesc: 'Self-petition, no job offer required',
        hasDedicatedAssessment: false,
        route: '/assessment'
      },
      {
        code: 'eb2_niw',
        name: 'EB-2 National Interest Waiver',
        shortDesc: 'For work benefiting US national interest',
        hasDedicatedAssessment: false,
        route: '/assessment'
      }
    ]
  },
  {
    id: 'investor',
    title: 'Investor Visas',
    description: 'For entrepreneurs and investors',
    visas: [
      {
        code: 'e2',
        name: 'E-2 Treaty Investor',
        shortDesc: 'For treaty country investors, ~$100K+',
        hasDedicatedAssessment: false,
        route: '/assessment'
      },
      {
        code: 'eb5',
        name: 'EB-5 Investor Green Card',
        shortDesc: '$800K-$1.05M investment for green card',
        hasDedicatedAssessment: false,
        route: '/assessment'
      }
    ]
  }
];

export default function VisaSelector() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {VISA_CATEGORIES.map((category) => (
        <div
          key={category.id}
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          <h3 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.25rem',
            color: '#1E1F1C',
            marginBottom: '0.25rem'
          }}>
            {category.title}
          </h3>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            color: '#77716E',
            marginBottom: '1rem'
          }}>
            {category.description}
          </p>

          <div className="space-y-3">
            {category.visas.map((visa) => (
              <Link
                key={visa.code}
                to={visa.route}
                className="block transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: '#F8F7F6',
                  borderRadius: '12px',
                  padding: '1rem',
                  textDecoration: 'none'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        color: '#1E3A5F'
                      }}>
                        {visa.name}
                      </span>
                      {visa.hasDedicatedAssessment && (
                        <span style={{
                          backgroundColor: '#1E3A5F',
                          color: 'white',
                          fontSize: '0.625rem',
                          fontFamily: 'Soehne, sans-serif',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: '500'
                        }}>
                          DEDICATED
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.8125rem',
                      color: '#77716E',
                      marginTop: '0.25rem'
                    }}>
                      {visa.shortDesc}
                    </p>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{ flexShrink: 0, marginTop: '0.125rem' }}
                  >
                    <path
                      d="M7.5 15L12.5 10L7.5 5"
                      stroke="#77716E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
