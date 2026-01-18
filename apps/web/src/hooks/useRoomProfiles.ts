import { useState, useEffect, useCallback } from 'react';
import type { RoomProfile, RoomObservation } from '@/types/room';
import { aggregateObservations } from '@/lib/roomAggregation';

const STORAGE_KEY = 'cuelens_room_profiles';

export function useRoomProfiles() {
  const [profiles, setProfiles] = useState<RoomProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Default lounge area data
  const getDefaultLoungeArea = (): RoomProfile => {
    const now = Date.now();
    const loungeObservation: RoomObservation = {
      room_type: 'living_room',
      fixed_elements: {
        major_furniture: [
          { name: 'sofa', count: 1, attributes: ['leather', 'three-seater'] },
          { name: 'coffee table', count: 1, attributes: ['wooden', 'rectangular'] },
          { name: 'armchair', count: 2, attributes: ['fabric'] },
        ],
        surfaces: {
          floor: { material: 'carpet', color: 'beige', pattern: 'solid' },
          walls: { color: 'white', pattern: 'smooth' },
          ceiling: { color: 'white' },
        },
        lighting: [
          { type: 'ceiling light', count: 1, attributes: ['overhead', 'dimmable'] },
          { type: 'table lamp', count: 2, attributes: ['side table'] },
        ],
        large_decor: [
          { name: 'window', attributes: ['curtains', 'north facing'] },
        ],
      },
      distinctive_markers: ['wooden furniture', 'beige carpet', 'white walls'],
      summary: 'A comfortable lounge area with a leather sofa, wooden coffee table, fabric armchairs, beige carpet, and white walls. Features overhead lighting and side table lamps.',
    };

    return {
      id: 'default-lounge-area',
      name: 'Lounge Area',
      note: 'Main lounge area',
      createdAt: now,
      observationCount: 1,
      profile: loungeObservation,
      rawObservations: [loungeObservation],
    };
  };

  // Load profiles from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as RoomProfile[];
        // Basic validation
        if (Array.isArray(arr) && arr.length > 0) {
          setProfiles(arr);
        } else {
          // Array is empty or invalid, initialize with defaults
          const defaultLoungeArea = getDefaultLoungeArea();
          setProfiles([defaultLoungeArea]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultLoungeArea]));
        }
      } else {
        // Initialize with default lounge area if localStorage is empty
        const defaultLoungeArea = getDefaultLoungeArea();
        setProfiles([defaultLoungeArea]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultLoungeArea]));
      }
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load room profiles:', e);
      // On error, initialize with defaults
      const defaultLoungeArea = getDefaultLoungeArea();
      setProfiles([defaultLoungeArea]);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultLoungeArea]));
      } catch (saveError) {
        console.error('Failed to save default lounge area:', saveError);
      }
      setLoaded(true);
    }
  }, []);

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      } catch (e) {
        console.error('Failed to save room profiles:', e);
      }
    }
  }, [profiles, loaded]);

  const addProfile = useCallback(
    (name: string, note: string, observations: RoomObservation[]): RoomProfile => {
      if (observations.length === 0) {
        throw new Error('Cannot create profile with no observations');
      }

      const aggregated = aggregateObservations(observations);
      const profile: RoomProfile = {
        id: crypto.randomUUID(),
        name: name.trim(),
        note: note.trim(),
        createdAt: Date.now(),
        observationCount: observations.length,
        profile: aggregated,
        rawObservations: observations, // Store raw observations for detailed view
      };

      console.log('[useRoomProfiles] Creating profile:', {
        id: profile.id,
        name: profile.name,
        observationCount: profile.observationCount,
        aggregatedProfile: profile.profile,
        rawObservationsCount: profile.rawObservations?.length,
      });

      setProfiles((prev) => {
        const updated = [...prev, profile];
        console.log('[useRoomProfiles] Updated profiles list:', updated.length, 'profiles');
        return updated;
      });
      
      return profile;
    },
    []
  );

  const removeProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateProfile = useCallback(
    (id: string, updates: Partial<Pick<RoomProfile, 'name' | 'note'>>) => {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const getProfile = useCallback(
    (id: string): RoomProfile | null => {
      return profiles.find((p) => p.id === id) || null;
    },
    [profiles]
  );

  const importProfiles = useCallback((jsonString: string) => {
    try {
      const arr = JSON.parse(jsonString);
      if (!Array.isArray(arr)) {
        throw new Error('Invalid format: expected array');
      }

      // Basic validation - ensure each item has required fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validProfiles = arr.filter((p: any) => {
        return (
          p &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          typeof p.createdAt === 'number' &&
          p.profile &&
          p.profile.room_type &&
          p.profile.fixed_elements
        );
      }) as RoomProfile[];

      setProfiles(validProfiles);
      return validProfiles;
    } catch (e) {
      throw new Error(`Invalid JSON for room profiles: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, []);

  const exportProfiles = useCallback((): string => {
    return JSON.stringify(profiles, null, 2);
  }, [profiles]);

  const clearProfiles = useCallback(() => {
    setProfiles([]);
  }, []);

  return {
    profiles,
    loaded,
    addProfile,
    removeProfile,
    updateProfile,
    getProfile,
    importProfiles,
    exportProfiles,
    clearProfiles,
  };
}
