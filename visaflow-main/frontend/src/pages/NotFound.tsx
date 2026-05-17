import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Link
          to="/"
          className="inline-block rounded-md bg-primary-600 px-6 py-3 text-white font-medium hover:bg-primary-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
