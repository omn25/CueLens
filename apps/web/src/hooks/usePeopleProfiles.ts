import { useState, useEffect, useCallback } from 'react';
import type { Person, PersonPhoto } from '@/types/person';

const STORAGE_KEY = 'cuelens_people_profiles';

export function usePeopleProfiles() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Default people data
  const getDefaultPeople = (): Person[] => {
    const now = Date.now();
    return [
      {
        id: 'default-om',
        name: 'Om',
        relationship: 'Brother',
        note: '',
        photos: [],
        createdAt: now,
        updatedAt: now,
        recognitionActive: false,
      },
      {
        id: 'default-keeret',
        name: 'Keeret',
        relationship: 'Brother',
        note: '',
        photos: [],
        createdAt: now,
        updatedAt: now,
        recognitionActive: false,
      },
      {
        id: 'default-michael',
        name: 'Michael',
        relationship: 'Brother',
        note: '',
        photos: [],
        createdAt: now,
        updatedAt: now,
        recognitionActive: false,
      },
    ];
  };

  // Load people from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as Person[];
        // Basic validation
        if (Array.isArray(arr) && arr.length > 0) {
          setPeople(arr);
        } else {
          // Array is empty or invalid, initialize with defaults
          const defaultPeople = getDefaultPeople();
          setPeople(defaultPeople);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPeople));
        }
      } else {
        // Initialize with default people if localStorage is empty
        const defaultPeople = getDefaultPeople();
        setPeople(defaultPeople);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPeople));
      }
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load people profiles:', e);
      // On error, initialize with defaults
      const defaultPeople = getDefaultPeople();
      setPeople(defaultPeople);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPeople));
      } catch (saveError) {
        console.error('Failed to save default people:', saveError);
      }
      setLoaded(true);
    }
  }, []);

  // Save people to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
      } catch (e) {
        console.error('Failed to save people profiles:', e);
      }
    }
  }, [people, loaded]);

  const addPerson = useCallback(
    (name: string, relationship?: string, note?: string, photos: PersonPhoto[] = []): Person => {
      const person: Person = {
        id: crypto.randomUUID(),
        name: name.trim(),
        relationship: relationship?.trim(),
        note: note?.trim(),
        photos,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        recognitionActive: photos.length >= 3, // Active if at least 3 photos
      };

      console.log('[usePeopleProfiles] Creating person:', {
        id: person.id,
        name: person.name,
        photoCount: person.photos.length,
      });

      setPeople((prev) => {
        const updated = [...prev, person];
        console.log('[usePeopleProfiles] Updated people list:', updated.length, 'people');
        return updated;
      });

      return person;
    },
    []
  );

  const removePerson = useCallback((id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePerson = useCallback(
    (id: string, updates: Partial<Pick<Person, 'name' | 'relationship' | 'note' | 'recognitionActive'>>) => {
      setPeople((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...updates,
                updatedAt: Date.now(),
              }
            : p
        )
      );
    },
    []
  );

  const addPhotoToPerson = useCallback((personId: string, photo: PersonPhoto) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          const updatedPhotos = [...p.photos, photo];
          return {
            ...p,
            photos: updatedPhotos,
            updatedAt: Date.now(),
            recognitionActive: updatedPhotos.length >= 3,
          };
        }
        return p;
      })
    );
  }, []);

  const removePhotoFromPerson = useCallback((personId: string, photoId: string) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          const updatedPhotos = p.photos.filter((ph) => ph.id !== photoId);
          return {
            ...p,
            photos: updatedPhotos,
            updatedAt: Date.now(),
            recognitionActive: updatedPhotos.length >= 3,
          };
        }
        return p;
      })
    );
  }, []);

  const getPerson = useCallback(
    (id: string): Person | null => {
      return people.find((p) => p.id === id) || null;
    },
    [people]
  );

  const importPeople = useCallback((jsonString: string) => {
    try {
      const arr = JSON.parse(jsonString);
      if (!Array.isArray(arr)) {
        throw new Error('Invalid format: expected array');
      }

      // Basic validation - ensure each item has required fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validPeople = arr.filter((p: any) => {
        return (
          p &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          typeof p.createdAt === 'number' &&
          Array.isArray(p.photos)
        );
      }) as Person[];

      setPeople(validPeople);
      return validPeople;
    } catch (e) {
      throw new Error(`Invalid JSON for people profiles: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, []);

  const exportPeople = useCallback((): string => {
    return JSON.stringify(people, null, 2);
  }, [people]);

  const clearPeople = useCallback(() => {
    setPeople([]);
  }, []);

  return {
    people,
    loaded,
    addPerson,
    removePerson,
    updatePerson,
    addPhotoToPerson,
    removePhotoFromPerson,
    getPerson,
    importPeople,
    exportPeople,
    clearPeople,
  };
}
