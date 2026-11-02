import { distanceMeters } from './distance';

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    const sol = { lat: 40.4169, lon: -3.7035 };
    expect(distanceMeters(sol, sol)).toBe(0);
  });

  it('measures a known distance', () => {
    const sol = { lat: 40.4169, lon: -3.7035 };
    const plazaMayor = { lat: 40.4155, lon: -3.7074 };
    // About 365 m on a map.
    expect(distanceMeters(sol, plazaMayor)).toBeGreaterThan(340);
    expect(distanceMeters(sol, plazaMayor)).toBeLessThan(390);
  });
});
