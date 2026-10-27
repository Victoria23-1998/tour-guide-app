import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { LocationStatus, Position, UserLocation } from './location/user-location';
import { TourMap } from './map/tour-map';
import { NearbyPlace } from './places/nearby-place';
import { NearbyPlaces, PlacesStatus } from './places/nearby-places';

// jsdom has no WebGL, so the real map is replaced with a stub that has the same inputs and output.
@Component({ selector: 'app-tour-map', template: '' })
class FakeTourMap {
  readonly places = input<NearbyPlace[]>([]);
  readonly selectedId = input<number | null>(null);
  readonly placeSelect = output<NearbyPlace | null>();
}

describe('App', () => {
  const sol: NearbyPlace = {
    pageId: 42,
    title: 'Puerta del Sol',
    lat: 40.4169,
    lon: -3.7035,
    distanceMeters: 5,
  };

  let location: {
    status: ReturnType<typeof signal<LocationStatus>>;
    position: ReturnType<typeof signal<Position | null>>;
    start: ReturnType<typeof vi.fn>;
  };
  let nearby: {
    status: ReturnType<typeof signal<PlacesStatus>>;
    places: ReturnType<typeof signal<NearbyPlace[]>>;
    reload: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    location = {
      status: signal<LocationStatus>('locating'),
      position: signal<Position | null>(null),
      start: vi.fn(),
    };
    nearby = {
      status: signal<PlacesStatus>('idle'),
      places: signal<NearbyPlace[]>([]),
      reload: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: UserLocation, useValue: location },
        { provide: NearbyPlaces, useValue: nearby },
      ],
    })
      .overrideComponent(App, { remove: { imports: [TourMap] }, add: { imports: [FakeTourMap] } })
      .compileComponents();
  });

  async function render(status: LocationStatus, placesStatus: PlacesStatus = 'idle') {
    location.status.set(status);
    nearby.status.set(placesStatus);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  }

  it('starts watching the location', async () => {
    await render('locating');
    expect(location.start).toHaveBeenCalledTimes(1);
  });

  it('renders the app name', async () => {
    const page = (await render('tracking')).nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Tour Guide');
  });

  it('shows a message while locating', async () => {
    const page = (await render('locating')).nativeElement as HTMLElement;
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Finding your location');
  });

  it('shows no message when places are shown', async () => {
    nearby.places.set([sol]);
    const page = (await render('tracking', 'ready')).nativeElement as HTMLElement;
    expect(page.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  it('explains denied permission and lets the user try again', async () => {
    const page = (await render('denied')).nativeElement as HTMLElement;
    const alert = page.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Location is turned off');

    alert?.querySelector('button')?.click();
    expect(location.start).toHaveBeenCalledTimes(2);
  });

  it('has no retry button when geolocation is unsupported', async () => {
    const page = (await render('unsupported')).nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('not supported');
    expect(page.querySelector('[role="alert"] button')).toBeNull();
  });

  it('shows a message while places load', async () => {
    const page = (await render('tracking', 'loading')).nativeElement as HTMLElement;
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Finding places nearby');
  });

  it('says when no places are found', async () => {
    const page = (await render('tracking', 'empty')).nativeElement as HTMLElement;
    expect(page.querySelector('[role="status"]')?.textContent).toContain('No places found');
  });

  it('lets the user retry when places fail to load', async () => {
    const page = (await render('tracking', 'error')).nativeElement as HTMLElement;
    const alert = page.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("couldn't load nearby places");

    alert?.querySelector('button')?.click();
    expect(nearby.reload).toHaveBeenCalled();
  });

  it('shows a card for the place tapped on the map', async () => {
    location.position.set({ lat: 40.4169, lon: -3.7074, accuracy: 10 }); // about 330 m west
    nearby.places.set([sol]);
    const fixture = await render('tracking', 'ready');
    const map = fixture.debugElement.query(By.directive(FakeTourMap))
      .componentInstance as FakeTourMap;

    map.placeSelect.emit(sol);
    await fixture.whenStable();

    const card = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Selected place"]',
    );
    expect(card?.querySelector('h2')?.textContent).toContain('Puerta del Sol');
    expect(card?.textContent).toContain('330 m away');
    expect(card?.querySelector('a')?.getAttribute('href')).toBe(
      'https://en.wikipedia.org/?curid=42',
    );
    expect(map.selectedId()).toBe(42);

    card?.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
    await fixture.whenStable();
    expect(map.selectedId()).toBeNull();
  });
});
