import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Position, UserLocation } from '../location/user-location';
import { NearbyPlace } from './nearby-place';
import { NearbyPlaces } from './nearby-places';

describe('NearbyPlaces', () => {
  const sol: Position = { lat: 40.4169, lon: -3.7035, accuracy: 10 };
  const place: NearbyPlace = {
    pageId: 1,
    title: 'Puerta del Sol',
    lat: 40.4169,
    lon: -3.7035,
    distanceMeters: 5,
  };

  let position: ReturnType<typeof signal<Position | null>>;
  let http: HttpTestingController;
  let nearby: NearbyPlaces;

  beforeEach(() => {
    position = signal<Position | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserLocation, useValue: { position } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    nearby = TestBed.inject(NearbyPlaces);
  });

  afterEach(() => http.verify());

  /** Moves the user and lets the resource react. */
  async function moveTo(lat: number, lon: number) {
    position.set({ lat, lon, accuracy: 10 });
    await settle();
  }

  /** Runs effects, then waits one macrotask so the resource's promises finish. */
  async function settle() {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  }

  function expectSearch() {
    return http.expectOne((req) => req.url === '/api/places/nearby');
  }

  it('does not search before the position is known', async () => {
    await settle();
    http.expectNone('/api/places/nearby');
    expect(nearby.status()).toBe('idle');
  });

  it('searches around the first position', async () => {
    await moveTo(sol.lat, sol.lon);

    const request = expectSearch();
    expect(request.request.params.get('lat')).toBe('40.4169');
    expect(request.request.params.get('lon')).toBe('-3.7035');
    expect(nearby.status()).toBe('loading');

    request.flush([place]);
    await settle();
    expect(nearby.status()).toBe('ready');
    expect(nearby.places()).toEqual([place]);
  });

  it('does not search again after a small move', async () => {
    await moveTo(sol.lat, sol.lon);
    expectSearch().flush([place]);

    await moveTo(sol.lat + 0.0005, sol.lon); // about 55 m north
    http.expectNone('/api/places/nearby');
  });

  it('searches again after a big move and keeps the old places meanwhile', async () => {
    await moveTo(sol.lat, sol.lon);
    expectSearch().flush([place]);
    await settle();

    await moveTo(sol.lat + 0.005, sol.lon); // about 550 m north
    const request = expectSearch();
    expect(nearby.places()).toEqual([place]);

    request.flush([]);
    await settle();
    expect(nearby.status()).toBe('empty');
  });

  it('reports an error and can try again', async () => {
    await moveTo(sol.lat, sol.lon);
    expectSearch().flush(null, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(nearby.status()).toBe('error');

    nearby.reload();
    await settle();
    expectSearch().flush([place]);
    await settle();
    expect(nearby.status()).toBe('ready');
  });
});
