export default function ProgressBar({ current, total }) {
  const percentage = (current / total) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: '#E6E4E1' }}>
      <div className="h-1 transition-all duration-300 ease-out" style={{
        width: `${percentage}%`,
        backgroundColor: '#1E3A5F'
      }} />
    </div>
  );
}
