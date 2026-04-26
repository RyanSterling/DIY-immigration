export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#E6E4E1',
      padding: '2rem 1rem',
      textAlign: 'center'
    }}>
      <p style={{
        fontFamily: 'Soehne, sans-serif',
        fontSize: '0.875rem',
        color: '#77716E'
      }}>
        <a
          href="/privacy"
          style={{ color: '#1E3A5F', textDecoration: 'underline' }}
        >
          Privacy Policy
        </a>
        {' '}&middot;{' '}
        <span>&copy; {new Date().getFullYear()} Immigration DIY</span>
      </p>
      <p style={{
        fontFamily: 'Soehne, sans-serif',
        fontSize: '0.75rem',
        color: '#8B8886',
        marginTop: '0.5rem'
      }}>
        This tool provides general information only and does not constitute legal advice.
      </p>
    </footer>
  );
}
