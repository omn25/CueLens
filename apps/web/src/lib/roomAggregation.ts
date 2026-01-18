import type { RoomObservation } from '@/types/room';

// Utility helpers
function normalizeName(n: string): string {
  return n.trim().toLowerCase().replace(/s$/, '');
}

function mode<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const freq = new Map<T, number>();
  arr.forEach((a) => {
    freq.set(a, (freq.get(a) || 0) + 1);
  });
  let max = 0;
  let best: T | null = null;
  for (const [k, v] of freq.entries()) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) {
    const value = s[mid];
    return value !== undefined ? value : 0;
  }
  const mid1 = s[mid - 1];
  const mid2 = s[mid];
  if (mid1 !== undefined && mid2 !== undefined) {
    return Math.round((mid1 + mid2) / 2);
  }
  return 0;
}

export function aggregateObservations(obs: RoomObservation[]): RoomObservation {
  if (obs.length === 0) {
    // Return empty observation if no observations
    return {
      room_type: 'unknown',
      fixed_elements: {
        major_furniture: [],
        surfaces: {
          floor: { material: 'unknown', color: 'unknown', pattern: 'unknown' },
          walls: { color: 'unknown', pattern: 'unknown' },
          ceiling: { color: 'unknown' },
        },
        lighting: [],
        large_decor: [],
      },
      distinctive_markers: [],
      summary: '',
    };
  }

  // Aggregate room_type
  const types = obs.map((o) => o.room_type);
  const room_type = mode(types) || 'unknown';

  // Aggregate major_furniture
  const furnitureMap = new Map<
    string,
    { counts: number[]; attrFreq: Map<string, number> }
  >();
  obs.forEach((o) => {
    o.fixed_elements.major_furniture.forEach((item) => {
      const name = normalizeName(item.name);
      if (!furnitureMap.has(name)) {
        furnitureMap.set(name, { counts: [], attrFreq: new Map() });
      }
      const rec = furnitureMap.get(name)!;
      rec.counts.push(item.count);
      item.attributes.forEach((attr) => {
        const a = attr.toLowerCase().trim();
        rec.attrFreq.set(a, (rec.attrFreq.get(a) || 0) + 1);
      });
    });
  });
  const major_furniture = Array.from(furnitureMap.entries()).map(([name, rec]) => {
    const count = median(rec.counts);
    const attrArray = Array.from(rec.attrFreq.entries())
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a);
    return { name, count, attributes: attrArray };
  });

  // Aggregate surfaces
  const floor_materials = obs
    .map((o) => o.fixed_elements.surfaces.floor.material.toLowerCase().trim())
    .filter((m) => m && m !== 'unknown');
  const floor_colors = obs
    .map((o) => o.fixed_elements.surfaces.floor.color.toLowerCase().trim())
    .filter((c) => c && c !== 'unknown');
  const floor_patterns = obs
    .map((o) => o.fixed_elements.surfaces.floor.pattern.toLowerCase().trim())
    .filter((p) => p && p !== 'unknown');
  const walls_colors = obs
    .map((o) => o.fixed_elements.surfaces.walls.color.toLowerCase().trim())
    .filter((c) => c && c !== 'unknown');
  const walls_patterns = obs
    .map((o) => o.fixed_elements.surfaces.walls.pattern.toLowerCase().trim())
    .filter((p) => p && p !== 'unknown');
  const ceiling_colors = obs
    .map((o) => o.fixed_elements.surfaces.ceiling.color.toLowerCase().trim())
    .filter((c) => c && c !== 'unknown');

  const surfaces = {
    floor: {
      material: mode(floor_materials) || 'unknown',
      color: mode(floor_colors) || 'unknown',
      pattern: mode(floor_patterns) || 'unknown',
    },
    walls: {
      color: mode(walls_colors) || 'unknown',
      pattern: mode(walls_patterns) || 'unknown',
    },
    ceiling: { color: mode(ceiling_colors) || 'unknown' },
  };

  // Aggregate lighting
  const lightingMap = new Map<
    string,
    { counts: number[]; attrFreq: Map<string, number> }
  >();
  obs.forEach((o) => {
    o.fixed_elements.lighting.forEach((item) => {
      const type = normalizeName(item.type);
      if (!lightingMap.has(type)) {
        lightingMap.set(type, { counts: [], attrFreq: new Map() });
      }
      const rec = lightingMap.get(type)!;
      rec.counts.push(item.count);
      item.attributes.forEach((attr) => {
        const a = attr.toLowerCase().trim();
        rec.attrFreq.set(a, (rec.attrFreq.get(a) || 0) + 1);
      });
    });
  });
  const lighting = Array.from(lightingMap.entries()).map(([type, rec]) => ({
    type,
    count: median(rec.counts),
    attributes: Array.from(rec.attrFreq.entries())
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a),
  }));

  // Aggregate large_decor
  const decorMap = new Map<
    string,
    { freq: number; attributesFreq: Map<string, number> }
  >();
  obs.forEach((o) => {
    o.fixed_elements.large_decor.forEach((item) => {
      const name = normalizeName(item.name);
      if (!decorMap.has(name)) {
        decorMap.set(name, { freq: 0, attributesFreq: new Map() });
      }
      const rec = decorMap.get(name)!;
      rec.freq++;
      item.attributes.forEach((attr) => {
        const a = attr.toLowerCase().trim();
        rec.attributesFreq.set(a, (rec.attributesFreq.get(a) || 0) + 1);
      });
    });
  });
  const large_decor = Array.from(decorMap.entries())
    .filter(([, rec]) => rec.freq >= 1)
    .map(([name, rec]) => {
      const attributes = Array.from(rec.attributesFreq.entries())
        .filter(([, c]) => c > 1)
        .sort((a, b) => b[1] - a[1])
        .map(([a]) => a);
      return { name, attributes };
    });

  // Aggregate distinctive_markers: top 5
  const markerFreq = new Map<string, number>();
  obs.forEach((o) => {
    o.distinctive_markers.forEach((m) => {
      const m2 = m.toLowerCase().trim();
      markerFreq.set(m2, (markerFreq.get(m2) || 0) + 1);
    });
  });
  const distinctive_markers = Array.from(markerFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([m]) => m);

  // Aggregate summary: pick most frequent summary, or generate
  const summaries = obs.map((o) => o.summary.toLowerCase().trim()).filter((s) => s);
  const summary =
    mode(summaries) ||
    generateSummary({
      room_type,
      fixed_elements: { major_furniture, surfaces, lighting, large_decor },
      distinctive_markers,
      summary: '',
    });

  return {
    room_type,
    fixed_elements: {
      major_furniture,
      surfaces,
      lighting,
      large_decor,
    },
    distinctive_markers,
    summary,
  };
}

// Generate a deterministic summary from the aggregated profile
function generateSummary(profile: RoomObservation): string {
  const parts: string[] = [];
  if (profile.room_type !== 'unknown') {
    parts.push(profile.room_type.replace('_', ' '));
  }
  if (profile.fixed_elements.surfaces.floor.material !== 'unknown') {
    parts.push(`${profile.fixed_elements.surfaces.floor.color} ${profile.fixed_elements.surfaces.floor.material} floor`);
  }
  if (profile.fixed_elements.major_furniture.length > 0) {
    const furnNames = profile.fixed_elements.major_furniture
      .slice(0, 3)
      .map((f) => f.name)
      .join(', ');
    parts.push(furnNames);
  }
  return parts.join(' · ') || 'Room profile';
}
