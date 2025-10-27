import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as typeof IntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock Google Maps API
interface MockGoogleMaps {
  maps: {
    Map: new () => unknown;
    InfoWindow: new () => unknown;
    OverlayView: new () => unknown;
    marker: {
      AdvancedMarkerElement: new () => unknown;
    };
    Size: new () => unknown;
    StreetViewService: new () => unknown;
    StreetViewSource: { OUTDOOR: string };
    StreetViewPanorama: new () => unknown;
  };
}

const mockGoogleMaps: MockGoogleMaps = {
  maps: {
    Map: class {
      setCenter() {}
      setZoom() {}
      getCenter() {
        return { lat: () => 0, lng: () => 0 };
      }
      getZoom() {
        return 10;
      }
    },
    InfoWindow: class {
      open() {}
      close() {}
      setContent() {}
      setPosition() {}
    },
    OverlayView: class {
      onAdd() {}
      draw() {}
      onRemove() {}
      getPanes() {
        return {
          overlayMouseTarget: document.createElement('div'),
        };
      }
      getProjection() {
        return {
          fromLatLngToDivPixel: () => ({ x: 0, y: 0 }),
        };
      }
    },
    marker: {
      AdvancedMarkerElement: class {},
    },
    Size: class {},
    StreetViewService: class {},
    StreetViewSource: { OUTDOOR: 'OUTDOOR' },
    StreetViewPanorama: class {},
  },
};

(window as Window & { google?: MockGoogleMaps }).google = mockGoogleMaps;

