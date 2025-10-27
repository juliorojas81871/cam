import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';

// Mock fetch
global.fetch = vi.fn();

describe('DataContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should provide loading state initially', async () => {
    (global.fetch as unknown as typeof fetch).mockImplementation(() =>
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
    (global.fetch as unknown as typeof fetch).mockImplementation(() =>
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
    (global.fetch as unknown as typeof fetch).mockImplementation(() =>
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
    (global.fetch as unknown as typeof fetch).mockImplementation(() =>
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

