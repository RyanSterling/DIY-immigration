/**
 * Marriage-Based Green Card Landing Page
 * For spouses of US citizens to learn about and start the adjustment of status process
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import Footer from '../components/shared/Footer';

export default function MarriageLandingPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const handleGetStarted = () => {
    if (isSignedIn) {
      navigate('/visa/marriage/pricing');
    } else {
      // Redirect to sign-in, then to pricing
      navigate('/visa/marriage/pricing');
    }
  };

  const steps = [
    {
      number: '1',
      title: 'Gather Documents',
      description: 'Start with documents that take longest - police certificates, birth certificates, passport.'
    },
    {
      number: '2',
      title: 'Complete Forms',
      description: 'Fill out I-130 (petition), I-485 (adjustment), I-864 (financial support), and optional work/travel permits.'
    },
    {
      number: '3',
      title: 'Mail Your Package',
      description: 'Submit your complete petition to USCIS Chicago Lockbox for concurrent processing.'
    },
    {
      number: '4',
      title: 'Interview & Approval',
      description: 'Attend biometrics, then your green card interview at a local USCIS office.'
    }
  ];

  const eligibilityChecks = [
    'You are legally married to a US citizen',
    'Your spouse is currently in the US',
    'Your spouse entered the US lawfully (with a visa or ESTA)',
    'The US citizen can meet income requirements (125% of poverty guidelines)'
  ];

  const whatsIncluded = [
    'Step-by-step guidance through all 12 phases',
    'Complete document checklist with detailed instructions',
    'Form-by-form walkthrough for I-130, I-485, I-864, and more',
    'Timeline tracking to keep you on schedule',
    'Evidence organization tips for proving genuine marriage',
    'Common mistakes to avoid',
    'Video tutorials for complex sections'
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDEC' }}>
      {/* Header */}
      <header className="py-4 px-6 border-b" style={{ backgroundColor: 'white', borderColor: '#E6E4E1' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.25rem', color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Immigration DIY
          </button>
          <button
            onClick={() => navigate('/account')}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ fontFamily: 'Soehne, sans-serif', color: '#1E3A5F', background: 'none', border: '1px solid #E6E4E1', cursor: 'pointer' }}
          >
            My Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="max-w-4xl mx-auto text-center">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm mb-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontFamily: 'Soehne, sans-serif' }}
          >
            Family-Based Immigration
          </span>
          <h1 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '2.75rem',
            color: 'white',
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            Marriage-Based Green Card
          </h1>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1.25rem',
            color: 'rgba(255,255,255,0.85)',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>
            Already married to a US citizen? Get your permanent residence (green card) while living in the US.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: 'white', color: '#1E3A5F', fontFamily: 'Soehne, sans-serif', fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}
            >
              Get Started · $499
            </button>
            <span style={{ fontFamily: 'Soehne, sans-serif', color: 'rgba(255,255,255,0.7)' }}>
              + $2,115 gov't fees (paid to USCIS)
            </span>
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.75rem',
            color: '#1E1F1C',
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            Is This Right for You?
          </h2>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            color: '#77716E',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            This guide is for you if all of these apply:
          </p>
          <div
            className="rounded-xl p-8"
            style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
          >
            <ul className="space-y-4">
              {eligibilityChecks.map((check, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#D1FAE5' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="#065F46" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '1.125rem', color: '#1E1F1C' }}>
                    {check}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 px-6" style={{ backgroundColor: 'white' }}>
        <div className="max-w-4xl mx-auto">
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.75rem',
            color: '#1E1F1C',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            The Process
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="p-6 rounded-lg"
                style={{ backgroundColor: '#F8F7F6', border: '1px solid #E6E4E1' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#1E3A5F', color: 'white', fontFamily: 'Soehne, sans-serif', fontWeight: '600' }}
                >
                  {step.number}
                </div>
                <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.125rem', color: '#1E1F1C', marginBottom: '0.5rem' }}>
                  {step.title}
                </h3>
                <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.9rem', color: '#77716E' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.75rem',
            color: '#1E1F1C',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            What's Included
          </h2>
          <div
            className="rounded-xl p-8"
            style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
          >
            <ul className="grid md:grid-cols-2 gap-4">
              {whatsIncluded.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#059669" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 px-6" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '2rem',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Ready to Get Started?
          </h2>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '2rem'
          }}>
            Join thousands of couples who have successfully navigated the marriage-based green card process.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-10 py-4 rounded-lg font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: 'white', color: '#1E3A5F', fontFamily: 'Soehne, sans-serif', fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}
          >
            Get Started · $499
          </button>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '1rem'
          }}>
            Government filing fees ($2,115) paid separately to USCIS
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
