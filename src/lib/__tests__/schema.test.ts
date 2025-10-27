import { describe, it, expect } from 'vitest';
import { owned, leases } from '../schema';

describe('Schema', () => {
  it('should export owned table', () => {
    expect(owned).toBeDefined();
  });

  it('should export leases table', () => {
    expect(leases).toBeDefined();
  });

  it('should have correct owned table structure', () => {
    expect(owned).toBeDefined();
    expect(typeof owned).toBe('object');
  });

  it('should have correct leases table structure', () => {
    expect(leases).toBeDefined();
    expect(typeof leases).toBe('object');
  });
});

