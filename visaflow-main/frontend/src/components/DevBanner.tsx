declare const __DEV_BRANCH__: string;

export default function DevBanner() {
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const branch = typeof __DEV_BRANCH__ !== 'undefined' ? __DEV_BRANCH__ : '';

  // Don't show banner if no branch set (main worktree without env)
  if (!branch) {
    return null;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const port = import.meta.env.VITE_DEV_PORT || '5173';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-amber-500 text-black px-3 py-1 text-xs font-mono flex items-center justify-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-green-600 animate-pulse" />
      <span className="font-semibold">DEV: {branch}</span>
      <span className="text-amber-700">|</span>
      <span className="text-amber-800">
        Port: {port} | API: {apiUrl.replace('/api', '')}
      </span>
    </div>
  );
}
