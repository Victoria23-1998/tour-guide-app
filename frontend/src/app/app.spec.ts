import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { LocationStatus, Position, UserLocation } from './location/user-location';
import { TourMap } from './map/tour-map';

// jsdom has no WebGL, so the real map is replaced with an empty stub.
@Component({ selector: 'app-tour-map', template: '' })
class FakeTourMap {}

describe('App', () => {
  let location: {
    status: ReturnType<typeof signal<LocationStatus>>;
    position: ReturnType<typeof signal<Position | null>>;
    start: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    location = {
      status: signal<LocationStatus>('locating'),
      position: signal<Position | null>(null),
      start: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: UserLocation, useValue: location }],
    })
      .overrideComponent(App, { remove: { imports: [TourMap] }, add: { imports: [FakeTourMap] } })
      .compileComponents();
  });

  async function render(status: LocationStatus) {
    location.status.set(status);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('starts watching the location', async () => {
    await render('locating');
    expect(location.start).toHaveBeenCalledTimes(1);
  });

  it('renders the app name', async () => {
    const page = await render('tracking');
    expect(page.querySelector('h1')?.textContent).toContain('Tour Guide');
  });

  it('shows a message while locating', async () => {
    const page = await render('locating');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Finding your location');
  });

  it('shows no message while tracking', async () => {
    const page = await render('tracking');
    expect(page.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  it('explains denied permission and lets the user try again', async () => {
    const page = await render('denied');
    const alert = page.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Location is turned off');

    alert?.querySelector('button')?.click();
    expect(location.start).toHaveBeenCalledTimes(2);
  });

  it('has no retry button when geolocation is unsupported', async () => {
    const page = await render('unsupported');
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('not supported');
    expect(page.querySelector('[role="alert"] button')).toBeNull();
  });
});
