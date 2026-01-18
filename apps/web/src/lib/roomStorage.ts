// Room data structure
export interface RoomFeatures {
  beds?: {
    count: number;
    colors: string[];
    sheetColors: string[];
  };
  flooring?: {
    type: string;
    color: string;
  };
  walls?: {
    color: string;
  };
  furniture?: {
    types: string[];
    colors: string[];
  };
  windows?: {
    count: number;
    type: string;
  };
  doors?: {
    count: number;
    type: string;
  };
  lighting?: {
    type: string;
    fixtures: string[];
  };
  [key: string]: unknown; // Allow for additional features
}

export interface RoomData {
  id: string;
  name: string;
  features: RoomFeatures;
  rawDescription: string; // Full Overshoot description for reference
  createdAt: string;
  updatedAt: string;
}

// Storage key
const STORAGE_KEY = 'cuelens_rooms';

// Get all saved rooms
export function getAllRooms(): RoomData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading rooms:', error);
    return [];
  }
}

// Save a room
export function saveRoom(room: Omit<RoomData, 'id' | 'createdAt' | 'updatedAt'>): RoomData {
  const rooms = getAllRooms();
  const newRoom: RoomData = {
    ...room,
    id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  rooms.push(newRoom);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  return newRoom;
}

// Update a room
export function updateRoom(id: string, updates: Partial<RoomData>): RoomData | null {
  const rooms = getAllRooms();
  const index = rooms.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  const existingRoom = rooms[index];
  if (!existingRoom) return null;
  
  rooms[index] = {
    ...existingRoom,
    ...updates,
    updatedAt: new Date().toISOString(),
  } as RoomData;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  return rooms[index]!;
}

// Delete a room
export function deleteRoom(id: string): boolean {
  const rooms = getAllRooms();
  const filtered = rooms.filter(r => r.id !== id);
  
  if (filtered.length === rooms.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Get a room by ID
export function getRoomById(id: string): RoomData | null {
  const rooms = getAllRooms();
  return rooms.find(r => r.id === id) || null;
}
