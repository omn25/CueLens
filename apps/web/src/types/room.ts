export interface RoomObservation {
  room_type: 'bedroom' | 'living_room' | 'bathroom' | 'kitchen' | 'office' | 'hallway' | 'unknown';
  fixed_elements: {
    major_furniture: { name: string; count: number; attributes: string[] }[];
    surfaces: {
      floor: { material: string; color: string; pattern: string };
      walls: { color: string; pattern: string };
      ceiling: { color: string };
    };
    lighting: { type: string; count: number; attributes: string[] }[];
    large_decor: { name: string; attributes: string[] }[];
  };
  distinctive_markers: string[];
  summary: string;
}

export interface RoomProfile {
  id: string;
  name: string;
  note: string;
  createdAt: number;
  observationCount: number;
  profile: RoomObservation;
  rawObservations?: RoomObservation[]; // Store raw observations for detailed view
}
