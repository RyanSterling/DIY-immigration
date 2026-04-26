/**
 * VideoModal Component
 * Full-screen modal for playing instructional videos
 */

import { useEffect, useRef } from 'react';

export default function VideoModal({
  video,
  isOpen,
  onClose
}) {
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!video || !isOpen) return null;

  // Determine video type and render appropriate player
  const renderVideoPlayer = () => {
    // YouTube embed
    if (video.youtubeId) {
      return (
        <iframe
          className="w-full aspect-video rounded-lg"
          src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Vimeo embed
    if (video.vimeoId) {
      return (
        <iframe
          className="w-full aspect-video rounded-lg"
          src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1`}
          title={video.title}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Direct video URL
    if (video.url) {
      return (
        <video
          className="w-full aspect-video rounded-lg"
          src={video.url}
          controls
          autoPlay
          playsInline
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    // Placeholder for videos not yet added
    return (
      <div
        className="w-full aspect-video rounded-lg flex flex-col items-center justify-center"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        <svg className="w-16 h-16 mb-4" fill="none" stroke="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p
          style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.7)'
          }}
        >
          Video coming soon
        </p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 rounded-full transition-colors hover:bg-white/10"
      >
        <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Modal content */}
      <div
        ref={modalRef}
        className="w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video player */}
        {renderVideoPlayer()}

        {/* Video info */}
        <div className="mt-4">
          <h2
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'white'
            }}
          >
            {video.title}
          </h2>
          {video.description && (
            <p
              className="mt-2"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.9375rem',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: '1.5'
              }}
            >
              {video.description}
            </p>
          )}
          {video.presenter && (
            <p
              className="mt-2 flex items-center gap-2"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                {video.presenter.charAt(0)}
              </span>
              {video.presenter}
            </p>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
