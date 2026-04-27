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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEDEC' }}>
      {/* Header */}
      <header className="px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.25rem',
              color: '#1E3A5F',
              textDecoration: 'none'
            }}
          >
            Immigration DIY
          </Link>

          <div className="flex items-center gap-3">
            {isLoaded && (
              isSignedIn ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/account"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.875rem',
                      color: '#1E3A5F',
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
                        color: '#1E3A5F',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Log in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      className="px-4 py-2 transition-all hover:opacity-90"
                      style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.875rem',
                        backgroundColor: '#1E3A5F',
                        color: 'white',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Sign up
                    </button>
                  </SignUpButton>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#1E1F1C',
            lineHeight: '1.2',
            fontWeight: '400',
            marginBottom: '1.5rem'
          }}>
            Navigate Your Path to the US
          </h1>

          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1.125rem',
            color: '#77716E',
            lineHeight: '1.6',
            marginBottom: '2.5rem',
            maxWidth: '600px',
            margin: '0 auto 2.5rem'
          }}>
            Free visa eligibility assessment in minutes. Discover which visas you qualify for,
            estimated costs, timelines, and step-by-step DIY guidance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/assessment"
              className="px-8 py-4 font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: '#1E3A5F',
                color: 'white',
                borderRadius: '27px',
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Help me find my visa
            </Link>

            <button
              onClick={scrollToVisas}
              className="px-8 py-4 font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: 'transparent',
                color: '#1E3A5F',
                borderRadius: '27px',
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                border: '2px solid #1E3A5F'
              }}
            >
              I know which visa I need
            </button>
          </div>

          <p className="mt-8" style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.75rem',
            color: '#8B8886'
          }}>
            No signup required. Takes 3-5 minutes.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16" style={{ backgroundColor: '#E6E4E1' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12" style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.75rem',
            color: '#1E1F1C'
          }}>
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Take Assessment',
                description: 'Answer questions about your background, qualifications, and goals.'
              },
              {
                step: '2',
                title: 'Get Results',
                description: 'See which visas you may qualify for with costs and timelines.'
              },
              {
                step: '3',
                title: 'DIY Application',
                description: 'Follow our step-by-step guidance to complete your application.'
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="mx-auto mb-4 flex items-center justify-center"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#1E3A5F',
                    color: 'white',
                    fontFamily: 'Libre Baskerville, serif',
                    fontSize: '1.25rem'
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  color: '#1E1F1C',
                  marginBottom: '0.5rem'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.9375rem',
                  color: '#77716E',
                  lineHeight: '1.5'
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visa Selector */}
      <section id="visa-selector" className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-4" style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.75rem',
            color: '#1E1F1C'
          }}>
            Choose Your Visa Type
          </h2>
          <p className="text-center mb-10" style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1rem',
            color: '#77716E'
          }}>
            Select a visa to take a targeted assessment, or{' '}
            <Link to="/assessment" style={{ color: '#1E3A5F', textDecoration: 'underline' }}>
              take our general assessment
            </Link>{' '}
            if you're not sure.
          </p>

          <VisaSelector />
        </div>
      </section>

      <Footer />
    </div>
  );
}
