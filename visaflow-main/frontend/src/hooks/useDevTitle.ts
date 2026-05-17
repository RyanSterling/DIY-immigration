import { useEffect } from 'react';

declare const __DEV_BRANCH__: string;

export function useDevTitle() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const branch = typeof __DEV_BRANCH__ !== 'undefined' ? __DEV_BRANCH__ : '';
    if (!branch) return;

    const originalTitle = document.title;
    document.title = `[${branch}] ${originalTitle}`;

    // Use MutationObserver to maintain prefix when title changes
    const observer = new MutationObserver(() => {
      if (!document.title.startsWith(`[${branch}]`)) {
        document.title = `[${branch}] ${document.title}`;
      }
    });

    const titleElement = document.querySelector('title');
    if (titleElement) {
      observer.observe(titleElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      document.title = originalTitle;
    };
  }, []);
}
