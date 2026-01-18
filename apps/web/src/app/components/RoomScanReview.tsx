'use client';

import { useState } from 'react';
import type { RoomObservation } from '@/types/room';

interface RoomScanReviewProps {
  observations: RoomObservation[];
  aggregated: RoomObservation;
  onSave: (name: string, note: string) => void;
  onCancel: () => void;
}

export default function RoomScanReview({
  observations,
  aggregated,
  onSave,
  onCancel,
}: RoomScanReviewProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [showRawData, setShowRawData] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a room name');
      return;
    }
    if (observations.length === 0) {
      alert('No observation data to save. Please try scanning again.');
      return;
    }
    console.log('[RoomScanReview] Saving profile with observations:', observations);
    onSave(name.trim(), note.trim());
  };

  // Extract all terms/features from observations
  const extractAllTerms = () => {
    const terms = new Set<string>();
    
    observations.forEach((obs) => {
      // Room type
      terms.add(`room_type:${obs.room_type}`);
      
      // Furniture
      obs.fixed_elements.major_furniture.forEach((f) => {
        terms.add(`furniture:${f.name}`);
        terms.add(`furniture_count:${f.count}`);
        f.attributes.forEach((attr) => terms.add(`furniture_attr:${attr}`));
      });
      
      // Surfaces
      terms.add(`floor_material:${obs.fixed_elements.surfaces.floor.material}`);
      terms.add(`floor_color:${obs.fixed_elements.surfaces.floor.color}`);
      terms.add(`floor_pattern:${obs.fixed_elements.surfaces.floor.pattern}`);
      terms.add(`wall_color:${obs.fixed_elements.surfaces.walls.color}`);
      terms.add(`wall_pattern:${obs.fixed_elements.surfaces.walls.pattern}`);
      terms.add(`ceiling_color:${obs.fixed_elements.surfaces.ceiling.color}`);
      
      // Lighting
      obs.fixed_elements.lighting.forEach((l) => {
        terms.add(`lighting:${l.type}`);
        terms.add(`lighting_count:${l.count}`);
        l.attributes.forEach((attr) => terms.add(`lighting_attr:${attr}`));
      });
      
      // Decor
      obs.fixed_elements.large_decor.forEach((d) => {
        terms.add(`decor:${d.name}`);
        d.attributes.forEach((attr) => terms.add(`decor_attr:${attr}`));
      });
      
      // Markers
      obs.distinctive_markers.forEach((m) => terms.add(`marker:${m}`));
      
      // Summary words
      obs.summary.split(/\s+/).forEach((word) => {
        const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleaned.length > 2) {
          terms.add(`summary_word:${cleaned}`);
        }
      });
    });
    
    return Array.from(terms).slice(0, 100); // Limit to 100 terms
  };
  
  const allTerms = extractAllTerms();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-background-dark/95">
      <div className="bg-white dark:bg-sidebar-surface rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Review Room Scan
        </h2>

        {/* Room Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Room Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lounge Area, Kitchen, Living Room"
            className="w-full bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm transition-all"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                handleSave();
              }
            }}
          />
        </div>

        {/* Optional Note */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any helpful notes about this room..."
            rows={3}
            className="w-full bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm transition-all resize-none"
          />
        </div>

        {/* Extracted Fields Preview */}
        <div className="mb-6 p-4 bg-slate-50 dark:bg-card-dark/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Extracted Room Features ({observations.length} observations)
          </h3>

          <div className="space-y-3 text-sm">
            {/* Room Type */}
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-400">Room Type:</span>{' '}
              <span className="text-slate-900 dark:text-white capitalize">
                {aggregated.room_type.replace('_', ' ')}
              </span>
            </div>

            {/* Major Furniture */}
            {aggregated.fixed_elements.major_furniture.length > 0 && (
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-400">Furniture:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {aggregated.fixed_elements.major_furniture.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                    >
                      {item.count}× {item.name}
                      {item.attributes.length > 0 && (
                        <span className="text-slate-500"> ({item.attributes.slice(0, 2).join(', ')})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Surfaces */}
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-400">Surfaces:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs">
                  Floor: {aggregated.fixed_elements.surfaces.floor.color} {aggregated.fixed_elements.surfaces.floor.material}
                </span>
                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs">
                  Walls: {aggregated.fixed_elements.surfaces.walls.color}
                </span>
                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs">
                  Ceiling: {aggregated.fixed_elements.surfaces.ceiling.color}
                </span>
              </div>
            </div>

            {/* Lighting */}
            {aggregated.fixed_elements.lighting.length > 0 && (
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-400">Lighting:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {aggregated.fixed_elements.lighting.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md text-xs"
                    >
                      {item.count}× {item.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Large Decor */}
            {aggregated.fixed_elements.large_decor.length > 0 && (
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-400">Decor:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {aggregated.fixed_elements.large_decor.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-xs"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Distinctive Markers */}
            {aggregated.distinctive_markers.length > 0 && (
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-400">Markers:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {aggregated.distinctive_markers.map((marker, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md text-xs"
                    >
                      {marker}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {aggregated.summary && (
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-400">Summary:</span>{' '}
                <span className="text-slate-700 dark:text-slate-300 italic">{aggregated.summary}</span>
              </div>
            )}
          </div>
        </div>

        {/* Raw Data Section */}
        <div className="mb-6 p-4 bg-slate-50 dark:bg-card-dark/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Raw Scan Data ({observations.length} observations, {allTerms.length} unique terms)
            </h3>
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showRawData ? 'expand_less' : 'expand_more'}
              </span>
              {showRawData ? 'Hide' : 'Show'} JSON
            </button>
          </div>

          {showRawData && (
            <div className="space-y-4">
              {/* All Terms List */}
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Extracted Terms ({allTerms.length}):
                </p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-800 rounded">
                  {allTerms.map((term, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              {/* Full JSON Data */}
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Complete JSON Data:
                </p>
                <details className="cursor-pointer">
                  <summary className="text-xs text-primary hover:text-primary/80 mb-2">
                    View all observations as JSON
                  </summary>
                  <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-auto max-h-64 border border-slate-200 dark:border-slate-700">
                    {JSON.stringify(observations, null, 2)}
                  </pre>
                </details>
                
                <details className="cursor-pointer mt-2">
                  <summary className="text-xs text-primary hover:text-primary/80 mb-2">
                    View aggregated profile as JSON
                  </summary>
                  <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-auto max-h-64 border border-slate-200 dark:border-slate-700">
                    {JSON.stringify(aggregated, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:dark:bg-slate-700 disabled:text-slate-400 disabled:dark:text-slate-500 text-white font-bold transition-all disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Place
          </button>
        </div>
      </div>
    </div>
  );
}
