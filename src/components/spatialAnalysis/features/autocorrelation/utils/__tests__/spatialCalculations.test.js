import {
  calculateGlobalMoranI,
  calculateLocalMoranI
} from '../spatialCalculations';

describe('Spatial Calculations', () => {
  // Mock data
  const mockData = [
    { region: 'region1', usdPrice: 10 },
    { region: 'region2', usdPrice: 15 },
    { region: 'region3', usdPrice: 5 },
    { region: 'region4', usdPrice: 20 }
  ];

  const mockWeights = {
    'region1': { 'region2': 1, 'region3': 1, 'region4': 0 },
    'region2': { 'region1': 1, 'region3': 0, 'region4': 1 },
    'region3': { 'region1': 1, 'region2': 0, 'region4': 1 },
    'region4': { 'region1': 0, 'region2': 1, 'region3': 1 }
  };

  describe('Global Moran\'s I', () => {
    it('should calculate global Moran\'s I statistics', () => {
      const result = calculateGlobalMoranI(mockData, mockWeights);

      expect(result).toHaveProperty('moran_i');
      expect(result).toHaveProperty('p_value');
      expect(result).toHaveProperty('z_score');
      expect(result).toHaveProperty('significance');

      expect(typeof result.moran_i).toBe('number');
      expect(typeof result.p_value).toBe('number');
      expect(typeof result.z_score).toBe('number');
      expect(typeof result.significance).toBe('boolean');
    });

    it('should handle null/undefined data', () => {
      const result = calculateGlobalMoranI(null, mockWeights);
      expect(result).toEqual({
        moran_i: 0,
        p_value: 0,
        z_score: 0,
        significance: false
      });
    });

    it('should handle empty data array', () => {
      const result = calculateGlobalMoranI([], mockWeights);
      expect(result).toEqual({
        moran_i: 0,
        p_value: 0,
        z_score: 0,
        significance: false
      });
    });

    it('should handle missing weights', () => {
      const result = calculateGlobalMoranI(mockData, null);
      expect(result).toEqual({
        moran_i: 0,
        p_value: 0,
        z_score: 0,
        significance: false
      });
    });

    it('should calculate expected values for known case', () => {
      const simpleData = [
        { region: 'A', usdPrice: 100 },
        { region: 'B', usdPrice: 90 }
      ];
      const simpleWeights = {
        'A': { 'B': 1 },
        'B': { 'A': 1 }
      };

      const result = calculateGlobalMoranI(simpleData, simpleWeights);
      expect(result.moran_i).toBeCloseTo(-1, 1); // Perfect negative correlation
      expect(result.significance).toBe(true);
    });
  });

  describe('Local Moran\'s I', () => {
    it('should calculate local Moran\'s I statistics for each region', () => {
      const result = calculateLocalMoranI(mockData, mockWeights);

      expect(Object.keys(result)).toHaveLength(mockData.length);
      
      Object.values(result).forEach(stats => {
        expect(stats).toHaveProperty('local_i');
        expect(stats).toHaveProperty('p_value');
        expect(stats).toHaveProperty('z_score');
        expect(stats).toHaveProperty('cluster_type');
        expect(stats).toHaveProperty('variance');
        expect(stats).toHaveProperty('spatial_lag');
      });
    });

    it('should handle null/undefined data', () => {
      const result = calculateLocalMoranI(null, mockWeights);
      expect(result).toEqual({});
    });

    it('should handle empty data array', () => {
      const result = calculateLocalMoranI([], mockWeights);
      expect(result).toEqual({});
    });

    it('should handle missing weights', () => {
      const result = calculateLocalMoranI(mockData, null);
      expect(result).toEqual({});
    });

    it('should identify correct cluster types', () => {
      const simpleData = [
        { region: 'high1', usdPrice: 100 },
        { region: 'high2', usdPrice: 95 },
        { region: 'low1', usdPrice: 10 },
        { region: 'low2', usdPrice: 15 }
      ];

      const simpleWeights = {
        'high1': { 'high2': 1, 'low1': 0, 'low2': 0 },
        'high2': { 'high1': 1, 'low1': 0, 'low2': 0 },
        'low1': { 'high1': 0, 'high2': 0, 'low2': 1 },
        'low2': { 'high1': 0, 'high2': 0, 'low1': 1 }
      };

      const result = calculateLocalMoranI(simpleData, simpleWeights);

      expect(result.high1.cluster_type).toBe('high-high');
      expect(result.high2.cluster_type).toBe('high-high');
      expect(result.low1.cluster_type).toBe('low-low');
      expect(result.low2.cluster_type).toBe('low-low');
    });

    it('should calculate spatial lag correctly', () => {
      const simpleData = [
        { region: 'A', usdPrice: 100 },
        { region: 'B', usdPrice: 50 }
      ];
      const simpleWeights = {
        'A': { 'B': 1 },
        'B': { 'A': 1 }
      };

      const result = calculateLocalMoranI(simpleData, simpleWeights);
      expect(result.A.spatial_lag).toBeDefined();
      expect(result.B.spatial_lag).toBeDefined();
      expect(result.A.spatial_lag).toBe(-result.B.spatial_lag); // Should be opposite for two regions
    });
  });

  describe('Edge Cases', () => {
    it('should handle regions with no neighbors', () => {
      const isolatedData = [
        { region: 'isolated', usdPrice: 100 },
        { region: 'connected1', usdPrice: 50 },
        { region: 'connected2', usdPrice: 75 }
      ];
      const isolatedWeights = {
        'isolated': {},
        'connected1': { 'connected2': 1 },
        'connected2': { 'connected1': 1 }
      };

      const result = calculateLocalMoranI(isolatedData, isolatedWeights);
      expect(result.isolated.cluster_type).toBe('not_significant');
    });

    it('should handle extreme values', () => {
      const extremeData = [
        { region: 'normal', usdPrice: 100 },
        { region: 'extreme', usdPrice: 1000000 }
      ];
      const weights = {
        'normal': { 'extreme': 1 },
        'extreme': { 'normal': 1 }
      };

      const result = calculateLocalMoranI(extremeData, weights);
      expect(result.extreme).toBeDefined();
      expect(result.normal).toBeDefined();
    });

    it('should handle zero values', () => {
      const zeroData = [
        { region: 'zero', usdPrice: 0 },
        { region: 'nonzero', usdPrice: 100 }
      ];
      const weights = {
        'zero': { 'nonzero': 1 },
        'nonzero': { 'zero': 1 }
      };

      const result = calculateLocalMoranI(zeroData, weights);
      expect(result.zero).toBeDefined();
      expect(result.nonzero).toBeDefined();
    });
  });
});
