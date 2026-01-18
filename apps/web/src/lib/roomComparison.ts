import type { RoomData } from './roomStorage';
import type { RoomFeatures } from './roomStorage';

// Extract features from Overshoot description
export function extractFeaturesFromDescription(description: string): RoomFeatures {
  const features: RoomFeatures = {};
  const lowerDesc = description.toLowerCase();

  // Extract bed information
  const bedMatch = lowerDesc.match(/(\d+)\s+bed/i) || lowerDesc.match(/bed/i);
  if (bedMatch) {
    features.beds = {
      count: bedMatch[1] ? parseInt(bedMatch[1]) : 1,
      colors: extractColors(lowerDesc, ['bed', 'mattress']),
      sheetColors: extractColors(lowerDesc, ['sheet', 'bedding', 'linen']),
    };
  }

  // Extract flooring
  const floorTypes = ['wood', 'carpet', 'tile', 'laminate', 'concrete', 'marble', 'vinyl'];
  const floorType = floorTypes.find(type => lowerDesc.includes(type));
  if (floorType) {
    features.flooring = {
      type: floorType,
      color: extractColors(lowerDesc, ['floor'])[0] || 'unknown',
    };
  }

  // Extract wall color
  const wallColors = extractColors(lowerDesc, ['wall', 'paint']);
  if (wallColors.length > 0 && wallColors[0]) {
    features.walls = {
      color: wallColors[0],
    };
  }

  // Extract furniture
  const furnitureTypes = ['chair', 'table', 'desk', 'dresser', 'cabinet', 'sofa', 'couch'];
  const foundFurniture = furnitureTypes.filter(type => lowerDesc.includes(type));
  if (foundFurniture.length > 0) {
    features.furniture = {
      types: foundFurniture,
      colors: extractColors(lowerDesc, foundFurniture),
    };
  }

  // Extract windows
  const windowMatch = lowerDesc.match(/(\d+)\s+window/i) || lowerDesc.match(/window/i);
  if (windowMatch) {
    features.windows = {
      count: windowMatch[1] ? parseInt(windowMatch[1]) : 1,
      type: extractWindowType(lowerDesc),
    };
  }

  // Extract doors
  const doorMatch = lowerDesc.match(/(\d+)\s+door/i) || lowerDesc.match(/door/i);
  if (doorMatch) {
    features.doors = {
      count: doorMatch[1] ? parseInt(doorMatch[1]) : 1,
      type: 'standard',
    };
  }

  return features;
}

// Extract colors from description
function extractColors(description: string, keywords: string[]): string[] {
  const colors = [
    'white', 'black', 'gray', 'grey', 'brown', 'beige', 'tan', 'cream',
    'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'pink',
    'navy', 'maroon', 'olive', 'teal', 'cyan', 'magenta',
  ];
  
  const foundColors: string[] = [];
  const relevantText = keywords
    .map(keyword => {
      const index = description.indexOf(keyword);
      if (index === -1) return '';
      return description.substring(Math.max(0, index - 50), index + 100);
    })
    .join(' ');

  colors.forEach(color => {
    if (relevantText.includes(color)) {
      foundColors.push(color);
    }
  });

  return [...new Set(foundColors)]; // Remove duplicates
}

// Extract window type
function extractWindowType(description: string): string {
  if (description.includes('curtain')) return 'with curtains';
  if (description.includes('blind')) return 'with blinds';
  if (description.includes('shade')) return 'with shades';
  return 'standard';
}

// Compare two room feature sets and return similarity percentage
export function compareRooms(room1: RoomFeatures, room2: RoomFeatures): number {
  let matches = 0;
  let totalChecks = 0;

  // Compare beds
  if (room1.beds && room2.beds) {
    totalChecks++;
    if (room1.beds.count === room2.beds.count) matches += 0.3;
    if (arraysOverlap(room1.beds.colors, room2.beds.colors)) matches += 0.3;
    if (arraysOverlap(room1.beds.sheetColors, room2.beds.sheetColors)) matches += 0.2;
  } else if (!room1.beds && !room2.beds) {
    totalChecks++;
    matches += 0.8; // Both missing is a match
  }

  // Compare flooring
  if (room1.flooring && room2.flooring) {
    totalChecks++;
    if (room1.flooring.type === room2.flooring.type) matches += 0.5;
    if (room1.flooring.color === room2.flooring.color) matches += 0.3;
  } else if (!room1.flooring && !room2.flooring) {
    totalChecks++;
    matches += 0.8;
  }

  // Compare walls
  if (room1.walls && room2.walls) {
    totalChecks++;
    if (room1.walls.color === room2.walls.color) matches += 0.5;
  } else if (!room1.walls && !room2.walls) {
    totalChecks++;
    matches += 0.5;
  }

  // Compare furniture
  if (room1.furniture && room2.furniture) {
    totalChecks++;
    const furnitureOverlap = arraysOverlap(room1.furniture.types, room2.furniture.types);
    if (furnitureOverlap) matches += 0.4;
    const colorOverlap = arraysOverlap(room1.furniture.colors, room2.furniture.colors);
    if (colorOverlap) matches += 0.2;
  } else if (!room1.furniture && !room2.furniture) {
    totalChecks++;
    matches += 0.6;
  }

  // Compare windows
  if (room1.windows && room2.windows) {
    totalChecks++;
    if (room1.windows.count === room2.windows.count) matches += 0.3;
    if (room1.windows.type === room2.windows.type) matches += 0.2;
  } else if (!room1.windows && !room2.windows) {
    totalChecks++;
    matches += 0.5;
  }

  // Compare doors
  if (room1.doors && room2.doors) {
    totalChecks++;
    if (room1.doors.count === room2.doors.count) matches += 0.3;
  } else if (!room1.doors && !room2.doors) {
    totalChecks++;
    matches += 0.3;
  }

  if (totalChecks === 0) return 0;
  return (matches / totalChecks) * 100;
}

// Check if two arrays have overlapping elements
function arraysOverlap(arr1: string[], arr2: string[]): boolean {
  return arr1.some(item => arr2.includes(item));
}

// Find matching room from current description
export function findMatchingRoom(
  currentDescription: string,
  savedRooms: RoomData[],
  threshold: number = 60
): { room: RoomData; similarity: number } | null {
  const currentFeatures = extractFeaturesFromDescription(currentDescription);

  let bestMatch: { room: RoomData; similarity: number } | null = null;

  for (const savedRoom of savedRooms) {
    const similarity = compareRooms(currentFeatures, savedRoom.features);
    
    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { room: savedRoom, similarity };
      }
    }
  }

  return bestMatch;
}
