'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CaretakerModeContextType {
  isCaretakerMode: boolean;
  toggleCaretakerMode: () => void;
}

const CaretakerModeContext = createContext<CaretakerModeContextType | undefined>(undefined);

export function CaretakerModeProvider({ children }: { children: React.ReactNode }) {
  const [isCaretakerMode, setIsCaretakerMode] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('caretakerMode');
    if (saved !== null) {
      setIsCaretakerMode(saved === 'true');
    }
  }, []);

  // Save to localStorage when mode changes
  useEffect(() => {
    localStorage.setItem('caretakerMode', String(isCaretakerMode));
  }, [isCaretakerMode]);

  const toggleCaretakerMode = () => {
    setIsCaretakerMode((prev) => !prev);
  };

  return (
    <CaretakerModeContext.Provider value={{ isCaretakerMode, toggleCaretakerMode }}>
      {children}
    </CaretakerModeContext.Provider>
  );
}

export function useCaretakerMode() {
  const context = useContext(CaretakerModeContext);
  if (context === undefined) {
    throw new Error('useCaretakerMode must be used within a CaretakerModeProvider');
  }
  return context;
}

