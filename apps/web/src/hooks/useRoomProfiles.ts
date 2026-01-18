import { useState, useEffect, useCallback } from 'react';
import type { RoomProfile, RoomObservation } from '@/types/room';
import { aggregateObservations } from '@/lib/roomAggregation';

const STORAGE_KEY = 'cuelens_room_profiles';

export function useRoomProfiles() {
  const [profiles, setProfiles] = useState<RoomProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Default office data
  const getDefaultOffice = (): RoomProfile => {
    const now = Date.now();
    const officeObservation: RoomObservation = {
      room_type: 'office',
      fixed_elements: {
        major_furniture: [
          { name: 'desk', count: 5, attributes: ['wood', 'rectangular', 'office style'] },
          { name: 'table', count: 8, attributes: ['wood', 'large', 'workspace'] },
          { name: 'conference table', count: 1, attributes: ['large', 'oval', 'wood'] },
          { name: 'chair', count: 12, attributes: ['office chair', 'rolling', 'black'] },
          { name: 'filing cabinet', count: 3, attributes: ['metal', 'gray', 'tall'] },
          { name: 'bookshelf', count: 2, attributes: ['wood', 'tall', 'wall mounted'] },
        ],
        surfaces: {
          floor: {
            material: 'tile',
            color: 'gray',
            pattern: 'square tiles',
          },
          walls: {
            color: 'white',
            pattern: 'smooth',
          },
          ceiling: {
            color: 'white',
          },
        },
        lighting: [
          {
            type: 'fluorescent light',
            count: 6,
            attributes: ['ceiling mounted', 'bright', 'white'],
          },
          {
            type: 'desk lamp',
            count: 5,
            attributes: ['adjustable', 'LED'],
          },
        ],
        large_decor: [
          { name: 'whiteboard', attributes: ['wall mounted', 'large'] },
          { name: 'whiteboard', attributes: ['mobile', 'small'] },
          { name: 'monitor', attributes: ['wall mounted', 'display screen'] },
        ],
      },
      distinctive_markers: [
        'Multiple desks arranged in rows',
        'Conference table in center',
        'Whiteboard on wall',
        'Fluorescent lighting overhead',
        'Many office chairs',
        'Cable management visible',
      ],
      summary: 'This is an office space with many tables - 5 desks, 8 workspace tables, and 1 large conference table. The room has fluorescent lighting, white walls, and gray tile floors. There are 12 office chairs and various office furniture throughout.',
    };

    return {
      id: 'default-office',
      name: 'Office 1',
      note: 'Main office',
      createdAt: now,
      observationCount: 1,
      profile: officeObservation,
      rawObservations: [officeObservation],
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
          const defaultOffice = getDefaultOffice();
          setProfiles([defaultOffice]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultOffice]));
        }
      } else {
        // Initialize with default office if localStorage is empty
        const defaultOffice = getDefaultOffice();
        setProfiles([defaultOffice]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultOffice]));
      }
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load room profiles:', e);
      // On error, initialize with defaults
      const defaultOffice = getDefaultOffice();
      setProfiles([defaultOffice]);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultOffice]));
      } catch (saveError) {
        console.error('Failed to save default bedroom:', saveError);
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
