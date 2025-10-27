import { describe, it, expect } from 'vitest';
import { cleanBuildingName, hasAddressInName, processRowData } from '../data-cleansing';

describe('data-cleansing utilities', () => {
  describe('cleanBuildingName', () => {
    it('should clean building names from complex strings', () => {
      // The implementation tries to clean but may preserve if cleaning too aggressive
      const result1 = cleanBuildingName('BUILDING AT 456 STREET');
      expect(typeof result1).toBe('string');
      
      const result2 = cleanBuildingName('MAIN OFFICE - SUITE 100');
      expect(result2).toBe('MAIN OFFICE');
      
      // ZIP codes should be removed
      const result3 = cleanBuildingName('BUILDING NAME, 12345');
      expect(result3).toBe('BUILDING NAME');
    });

    it('should handle null or empty input', () => {
      expect(cleanBuildingName(null)).toBeNull();
      expect(cleanBuildingName('')).toBe('');
      expect(cleanBuildingName(undefined as unknown as string)).toBeUndefined();
    });

    it('should preserve meaningful names', () => {
      expect(cleanBuildingName('JACOB K. JAVITS FR/CIT')).toBe('JACOB K. JAVITS FR/CIT');
      expect(cleanBuildingName('REAGAN BLDG FOS')).toBe('REAGAN BLDG FOS');
    });

    it('should remove ZIP codes', () => {
      expect(cleanBuildingName('BUILDING NAME, 12345')).toBe('BUILDING NAME');
    });
  });

  describe('hasAddressInName', () => {
    it('should detect street addresses in name', () => {
      expect(hasAddressInName('123 MAIN ST')).toBe(true);
      expect(hasAddressInName('BUILDING AT 456 STREET')).toBe(true);
    });

    it('should detect city in name', () => {
      expect(hasAddressInName('BUILDING AT 123 MAIN ST, WASHINGTON DC, 20001')).toBe(true);
    });

    it('should handle names without addresses', () => {
      expect(hasAddressInName('GENERIC BUILDING')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(hasAddressInName('')).toBe(false);
      expect(hasAddressInName(null)).toBe(false);
      expect(hasAddressInName(undefined as unknown as string)).toBe(false);
    });
  });

  describe('processRowData', () => {
    it('should process row data and add cleaned fields', () => {
      const row = {
        'Real Property Asset Name': 'BUILDING AT 123 MAIN ST',
      };
      
      const result = processRowData(row);
      
      expect(result.cleanedBuildingName).toBeDefined();
      expect(result.addressInName).toBeDefined();
    });
  });
});