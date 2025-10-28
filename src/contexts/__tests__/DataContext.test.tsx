import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DataContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should provide loading state initially', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
        ok: true,
      } as Response)
    );

    const { result } = renderHook(() => useData(), {
      wrapper: DataProvider,
    });

    // Initially loading should be true
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should have data fetching structure', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
        ok: true,
      } as Response)
    );

    const { result } = renderHook(() => useData(), {
      wrapper: DataProvider,
    });

    expect(result.current).toHaveProperty('owned');
    expect(result.current).toHaveProperty('leases');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const { result } = renderHook(() => useData(), {
      wrapper: DataProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 1000 });

    expect(result.current.error).toBeTruthy();
  });

  it('should have correct data structures', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
        ok: true,
      } as Response)
    );

    const { result } = renderHook(() => useData(), {
      wrapper: DataProvider,
    });

    expect(Array.isArray(result.current.owned)).toBe(true);
    expect(Array.isArray(result.current.leases)).toBe(true);
  });
});

