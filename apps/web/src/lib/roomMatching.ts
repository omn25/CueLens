import type { RoomObservation } from '@/types/room';

function normalizeName(n: string): string {
  return n.trim().toLowerCase().replace(/s$/, '');
}

export function scoreRoom(live: RoomObservation, profile: RoomObservation): number {
  let score = 0;

  // 1) room_type (0.15)
  score += (live.room_type === profile.room_type ? 1 : 0) * 0.15;

  // 2) furniture (0.45)
  let furnitureScore = 0;
  const profFurniture = profile.fixed_elements.major_furniture;
  const liveFurniture = live.fixed_elements.major_furniture;

  if (profFurniture.length === 0 && liveFurniture.length === 0) {
    furnitureScore = 1;
  } else if (profFurniture.length > 0) {
    profFurniture.forEach((pf) => {
      const normalizedProfName = normalizeName(pf.name);
      const lf = liveFurniture.find(
        (l) => normalizeName(l.name) === normalizedProfName
      );
      if (lf) {
        // Count matching within ±1
        const countDiff = Math.abs(lf.count - pf.count);
        const countMatch = countDiff <= 1 ? 1 : Math.max(0, 1 - countDiff / (pf.count + 1));
        furnitureScore += 1 * countMatch;

        // Attributes overlap bonus
        const profAttrs = new Set(pf.attributes.map((a) => a.toLowerCase().trim()));
        const liveAttrs = new Set(lf.attributes.map((a) => a.toLowerCase().trim()));
        let commonCount = 0;
        profAttrs.forEach((attr) => {
          if (liveAttrs.has(attr)) commonCount++;
        });
        furnitureScore += commonCount * 0.2; // bonus per matching attribute
      }
    });
    // Normalize by profile furniture count
    const maxFurniturePoints = profFurniture.length * (1 + profFurniture.reduce((acc, f) => acc + f.attributes.length, 0) * 0.2);
    furnitureScore = maxFurniturePoints > 0 ? furnitureScore / maxFurniturePoints : 0;
  }

  score += furnitureScore * 0.45;

  // 3) surfaces (0.25)
  let surfMatch = 0;
  let surfMax = 0;
  const sLive = live.fixed_elements.surfaces;
  const sProf = profile.fixed_elements.surfaces;

  // Floor material, color, pattern (3)
  surfMax += 3;
  if (sLive.floor.material !== 'unknown' && sProf.floor.material !== 'unknown') {
    if (sLive.floor.material === sProf.floor.material) surfMatch++;
  }
  if (sLive.floor.color !== 'unknown' && sProf.floor.color !== 'unknown') {
    if (sLive.floor.color === sProf.floor.color) surfMatch++;
  }
  if (sLive.floor.pattern !== 'unknown' && sProf.floor.pattern !== 'unknown') {
    if (sLive.floor.pattern === sProf.floor.pattern) surfMatch++;
  }

  // Walls: color, pattern (2)
  surfMax += 2;
  if (sLive.walls.color !== 'unknown' && sProf.walls.color !== 'unknown') {
    if (sLive.walls.color === sProf.walls.color) surfMatch++;
  }
  if (sLive.walls.pattern !== 'unknown' && sProf.walls.pattern !== 'unknown') {
    if (sLive.walls.pattern === sProf.walls.pattern) surfMatch++;
  }

  // Ceiling color (1)
  surfMax += 1;
  if (sLive.ceiling.color !== 'unknown' && sProf.ceiling.color !== 'unknown') {
    if (sLive.ceiling.color === sProf.ceiling.color) surfMatch++;
  }

  score += (surfMax > 0 ? surfMatch / surfMax : 0) * 0.25;

  // 4) lighting and decor (0.10)
  let ldMatch = 0;
  let ldMax = 0;

  profile.fixed_elements.lighting.forEach((pl) => {
    ldMax++;
    const normalizedProfType = normalizeName(pl.type);
    const ll = live.fixed_elements.lighting.find((l) => normalizeName(l.type) === normalizedProfType);
    if (ll && Math.abs(ll.count - pl.count) <= 1) {
      ldMatch++;
    }
  });

  profile.fixed_elements.large_decor.forEach((pd) => {
    ldMax++;
    const normalizedProfName = normalizeName(pd.name);
    if (live.fixed_elements.large_decor.find((ldec) => normalizeName(ldec.name) === normalizedProfName)) {
      ldMatch++;
    }
  });

  if (ldMax > 0) {
    score += (ldMatch / ldMax) * 0.1;
  }

  // 5) distinctive_markers (0.05)
  const dmProf = new Set(profile.distinctive_markers.map((m) => m.toLowerCase().trim()));
  const dmLive = new Set(live.distinctive_markers.map((m) => m.toLowerCase().trim()));
  let dmCommon = 0;
  dmProf.forEach((m) => {
    if (dmLive.has(m)) dmCommon++;
  });
  const markersScore = profile.distinctive_markers.length > 0 ? dmCommon / profile.distinctive_markers.length : 0;
  score += markersScore * 0.05;

  // Clamp to [0, 1]
  return Math.min(Math.max(score, 0), 1);
}

export function pickBestMatch(
  live: RoomObservation,
  profiles: { profile: RoomObservation; id: string; name: string }[]
): { id: string; name: string; score: number } {
  let best = { id: '', name: '', score: 0 };
  profiles.forEach((p) => {
    const sc = scoreRoom(live, p.profile);
    if (sc > best.score) {
      best = { id: p.id, name: p.name, score: sc };
    }
  });
  return best;
}
