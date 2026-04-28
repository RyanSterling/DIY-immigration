import { Link } from 'react-router-dom';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react';
import Footer from '../components/shared/Footer';
import VisaSelector from '../components/landing/VisaSelector';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();

  const scrollToVisas = () => {
    document.getElementById('visa-selector')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.25rem',
              color: '#1E1F1C',
              textDecoration: 'none'
            }}
          >
            Immigration DIY
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={scrollToVisas}
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.9rem',
                color: '#1E1F1C',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Visa Types
            </button>
            <Link
              to="/assessment"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.9rem',
                color: '#1E1F1C',
                textDecoration: 'none'
              }}
            >
              Assessment
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isLoaded && (
              isSignedIn ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/account"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.875rem',
                      color: '#1E1F1C',
                      textDecoration: 'none'
                    }}
                  >
                    My Account
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button
                      style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.875rem',
                        color: '#1E1F1C',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      className="px-5 py-2.5 transition-all hover:opacity-90"
                      style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.875rem',
                        backgroundColor: '#1E1F1C',
                        color: 'white',
                        borderRadius: '24px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Get Started
                    </button>
                  </SignUpButton>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <section className="flex-1 px-6 py-12 md:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{
                  backgroundColor: '#F0F0F0',
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8rem',
                  color: '#555'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Free Assessment
              </span>

              <h1 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                color: '#1E1F1C',
                lineHeight: '1.15',
                fontWeight: '400',
                marginBottom: '1.5rem'
              }}>
                Your Path to<br />
                the United States
              </h1>

              <p style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1.1rem',
                color: '#666',
                lineHeight: '1.7',
                marginBottom: '2rem',
                maxWidth: '440px'
              }}>
                Discover which US visas you qualify for. Get personalized guidance on costs, timelines, and application steps.
              </p>

              <Link
                to="/assessment"
                className="inline-flex items-center px-7 py-3.5 transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#1E1F1C',
                  color: 'white',
                  borderRadius: '28px',
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.95rem',
                  textDecoration: 'none'
                }}
              >
                Start Assessment
              </Link>
            </div>

            {/* Right: Visual Cards */}
            <div className="relative hidden md:block">
              {/* Main decorative card */}
              <div
                className="rounded-2xl p-6 relative"
                style={{ backgroundColor: '#F5F0C4' }}
              >
                {/* Floating stat card */}
                <div
                  className="absolute -top-4 -left-4 bg-white rounded-xl p-4 shadow-lg"
                  style={{ minWidth: '180px' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#E8F5E9' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="#2E7D32" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#2E7D32' }}>
                      Eligible
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.85rem', color: '#1E1F1C', fontWeight: '500' }}>
                    K-1 Fiancé Visa
                  </p>
                  <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#888' }}>
                    Strong case identified
                  </p>
                </div>

                {/* Inner content area */}
                <div className="pt-16 pb-8">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Processing card */}
                    <div className="bg-white rounded-xl p-4">
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>
                        Processing Time
                      </p>
                      <p style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.5rem', color: '#1E1F1C' }}>
                        8-12
                      </p>
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#666' }}>
                        months average
                      </p>
                    </div>

                    {/* Cost card */}
                    <div className="bg-white rounded-xl p-4">
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>
                        Government Fees
                      </p>
                      <p style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.5rem', color: '#1E1F1C' }}>
                        $1,200
                      </p>
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#666' }}>
                        approximate total
                      </p>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-4 bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.8rem', color: '#1E1F1C', fontWeight: '500' }}>
                        Your Progress
                      </p>
                      <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#888' }}>
                        Step 1 of 4
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E8E8E8' }}>
                      <div className="h-2 rounded-full" style={{ width: '25%', backgroundColor: '#1E1F1C' }} />
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div
                  className="absolute -bottom-3 -right-3 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: '#1E1F1C', color: 'white' }}
                  >
                    7+
                  </div>
                  <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#1E1F1C' }}>
                    Visa types
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bullet Points - Horizontal */}
          <div className="mt-16 pt-10 border-t" style={{ borderColor: '#E8E8E8' }}>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { text: 'Free eligibility assessment in under 5 minutes' },
                { text: 'Personalized guidance for 7+ visa categories' },
                { text: 'Clear cost breakdowns with no hidden fees' }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="#1E1F1C" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.9rem', color: '#444' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Feature Cards */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            color: '#1E1F1C',
            marginBottom: '3rem'
          }}>
            Simple Steps to<br />
            Your Visa Journey
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tag: 'Assessment',
                title: 'Discover Your Options',
                description: 'Answer a few questions about your background, goals, and qualifications.',
                color: '#F5F0C4'
              },
              {
                tag: 'Results',
                title: 'Get Personalized Insights',
                description: 'See which visas you qualify for with costs, timelines, and success likelihood.',
                color: '#E3F2FD'
              },
              {
                tag: 'Guidance',
                title: 'Step-by-Step Application',
                description: 'Follow our detailed guides to complete your application with confidence.',
                color: '#F5F0C4'
              }
            ].map((card, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 h-full"
                style={{ backgroundColor: card.color }}
              >
                <span
                  className="inline-block px-3 py-1 rounded-full mb-4"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    fontFamily: 'Soehne, sans-serif',
                    fontSize: '0.75rem',
                    color: '#555'
                  }}
                >
                  {card.tag}
                </span>
                <h3 style={{
                  fontFamily: 'Libre Baskerville, serif',
                  fontSize: '1.35rem',
                  color: '#1E1F1C',
                  marginBottom: '0.75rem',
                  lineHeight: '1.3'
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.9rem',
                  color: '#555',
                  lineHeight: '1.6'
                }}>
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visa Selector */}
      <section id="visa-selector" className="px-6 py-16" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#1E1F1C',
              marginBottom: '1rem'
            }}>
              Choose Your Visa Type
            </h2>
            <p style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1rem',
              color: '#666'
            }}>
              Select a visa to take a targeted assessment, or{' '}
              <Link to="/assessment" style={{ color: '#1E1F1C', textDecoration: 'underline' }}>
                take our general assessment
              </Link>{' '}
              if you're not sure.
            </p>
          </div>

          <VisaSelector />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            color: '#1E1F1C',
            marginBottom: '1rem'
          }}>
            Ready to Start Your Journey?
          </h2>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1.1rem',
            color: '#666',
            marginBottom: '2rem'
          }}>
            Take our free assessment and discover your path to the United States.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/assessment"
              className="inline-flex items-center justify-center px-8 py-4 transition-all hover:opacity-90"
              style={{
                backgroundColor: '#1E1F1C',
                color: 'white',
                borderRadius: '28px',
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                textDecoration: 'none'
              }}
            >
              Start Free Assessment
            </Link>
            <button
              onClick={scrollToVisas}
              className="inline-flex items-center justify-center px-8 py-4 transition-all hover:bg-gray-100"
              style={{
                backgroundColor: 'transparent',
                color: '#1E1F1C',
                borderRadius: '28px',
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                border: '1px solid #D0D0D0'
              }}
            >
              Browse Visa Types
            </button>
          </div>
          <p className="mt-6" style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.8rem',
            color: '#999'
          }}>
            No signup required. Takes 3-5 minutes.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
