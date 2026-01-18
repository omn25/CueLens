'use client';

import { useEffect } from 'react';

export default function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      // Cleanup on unmount
      const existingLink = document.querySelector(
        'link[href*="Material+Symbols+Outlined"]'
      );
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, []);

  return null;
}
