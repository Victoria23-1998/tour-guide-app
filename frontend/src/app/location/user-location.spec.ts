import { TestBed } from '@angular/core/testing';
import { UserLocation } from './user-location';

describe('UserLocation', () => {
  let onSuccess: PositionCallback;
  let onError: PositionErrorCallback;
  let geolocation: {
    watchPosition: ReturnType<typeof vi.fn>;
    clearWatch: ReturnType<typeof vi.fn>;
  };

  function position(latitude: number, longitude: number, accuracy = 10) {
    return { coords: { latitude, longitude, accuracy } } as GeolocationPosition;
  }

  function error(code: number) {
    return { code } as GeolocationPositionError;
  }

  beforeEach(() => {
    geolocation = {
      watchPosition: vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
        onSuccess = success;
        onError = failure;
        return 42;
      }),
      clearWatch: vi.fn(),
    };
    vi.stubGlobal('navigator', { geolocation });
  });

  afterEach(() => vi.unstubAllGlobals());

  function create() {
    return TestBed.inject(UserLocation);
  }

  it('is locating until the first position arrives', () => {
    const location = create();
    location.start();
    expect(location.status()).toBe('locating');
    expect(location.position()).toBeNull();
  });

  it('tracks the position', () => {
    const location = create();
    location.start();
    onSuccess(position(40.4168, -3.7038, 12));
    expect(location.status()).toBe('tracking');
    expect(location.position()).toEqual({ lat: 40.4168, lon: -3.7038, accuracy: 12 });
  });

  it('reports denied permission and stops watching', () => {
    const location = create();
    location.start();
    onError(error(1));
    expect(location.status()).toBe('denied');
    expect(geolocation.clearWatch).toHaveBeenCalledWith(42);
  });

  it('reports an unavailable position', () => {
    const location = create();
    location.start();
    onError(error(2));
    expect(location.status()).toBe('unavailable');
  });

  it('keeps the last position when a later update times out', () => {
    const location = create();
    location.start();
    onSuccess(position(1, 2));
    onError(error(3));
    expect(location.status()).toBe('tracking');
    expect(location.position()).toEqual({ lat: 1, lon: 2, accuracy: 10 });
  });

  it('reports unsupported when the browser has no geolocation', () => {
    vi.stubGlobal('navigator', {});
    const location = create();
    location.start();
    expect(location.status()).toBe('unsupported');
  });

  it('clears the watch on stop', () => {
    const location = create();
    location.start();
    location.stop();
    expect(geolocation.clearWatch).toHaveBeenCalledWith(42);
  });
});
