export interface PersonPhoto {
  id: string;
  dataUrl: string; // Base64 data URL for the image
  angle: 'front' | 'left' | 'right';
  capturedAt: number;
}

export interface Person {
  id: string;
  name: string;
  relationship?: string; // e.g., "Daughter", "Doctor", "Neighbor"
  note?: string;
  photos: PersonPhoto[];
  createdAt: number;
  updatedAt: number;
  recognitionActive: boolean;
}
