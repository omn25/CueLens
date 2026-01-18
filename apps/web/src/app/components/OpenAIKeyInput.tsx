'use client';

import { useState } from 'react';

interface OpenAIKeyInputProps {
  onSave: (key: string) => void;
  initialKey?: string;
}

export default function OpenAIKeyInput({ onSave, initialKey = '' }: OpenAIKeyInputProps) {
  const [apiKey, setApiKey] = useState<string>(initialKey || '');
  const [isVisible, setIsVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) {
      return;
    }
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('OPENAI_API_KEY', apiKey.trim());
    }
    
    // Save to env variable (for current session)
    // Note: This won't persist across restarts, but will work for current session
    if (typeof window !== 'undefined') {
      (window as any).__OPENAI_API_KEY__ = apiKey.trim();
    }
    
    onSave(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        OpenAI API Key
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type={isVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined text-lg">
              {isVisible ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:text-slate-400 text-white font-semibold transition-all flex items-center gap-2"
        >
          {saved ? (
            <>
              <span className="material-symbols-outlined text-lg">check</span>
              Saved
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Your API key is stored locally and never sent to our servers.
      </p>
    </div>
  );
}
