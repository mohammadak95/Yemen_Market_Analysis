// src/workers/optimizedSpatialWorker.js

const CHUNK_SIZE = 1000; // Adjust based on testing

// Cache for computational results
const computationCache = new Map();

// Helper to chunk array processing
const processInChunks = (data, processor) => {
  const results = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    results.push(...processor(chunk));
    
    // Report progress
    const progress = Math.min(100, Math.round((i + CHUNK_SIZE) * 100 / data.length));
    self.postMessage({ type: 'PROGRESS', data: { progress } });
  }
  return results;
};

// Memoization helper
const memoize = (key, computation) => {
  if (computationCache.has(key)) {
    return computationCache.get(key);
  }
  const result = computation();
  computationCache.set(key, result);
  
  // Basic cache management - keep only last 50 results
  if (computationCache.size > 50) {
    const firstKey = computationCache.keys().next().value;
    computationCache.delete(firstKey);
  }
  
  return result;
};

self.onmessage = async ({ data: { type, payload, taskId } }) => {
  try {
    let result;
    
    switch (type) {
      case 'COMPUTE_CLUSTERS': {
        const cacheKey = `clusters_${JSON.stringify(payload.bounds)}_${payload.date}`;
        result = await memoize(cacheKey, () => computeClusters(payload));
        break;
      }
      
      case 'PROCESS_TIME_SERIES': {
        const cacheKey = `timeseries_${payload.commodity}_${payload.startDate}_${payload.endDate}`;
        result = await memoize(cacheKey, () => processTimeSeries(payload));
        break;
      }
      
      case 'DETECT_SHOCKS': {
        const cacheKey = `shocks_${payload.date}_${payload.threshold}`;
        result = await memoize(cacheKey, () => detectMarketShocks(payload));
        break;
      }
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({ type: 'COMPLETE', taskId, data: result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', taskId, error: error.message });
  }
};

// Optimized cluster computation
const computeClusters = async ({ features, weights, flows }) => {
  const clusters = new Map();
  
  return processInChunks(features, (chunk) => {
    return chunk.map(feature => {
      const regionId = feature.properties.region_id;
      if (clusters.has(regionId)) return clusters.get(regionId);
      
      const cluster = {
        mainMarket: regionId,
        connectedMarkets: new Set(),
        flowMetrics: calculateFlowMetrics(regionId, flows),
        spatialWeight: weights[regionId]?.weight || 0
      };
      
      // Add connected markets based on weights
      if (weights[regionId]?.neighbors) {
        weights[regionId].neighbors.forEach(neighbor => 
          cluster.connectedMarkets.add(neighbor)
        );
      }
      
      clusters.set(regionId, cluster);
      return cluster;
    });
  });
};

// Optimized time series processing
const processTimeSeries = async ({ features, startDate, endDate }) => {
  const timeseriesMap = new Map();
  
  processInChunks(features, (chunk) => {
    chunk.forEach(feature => {
      const date = feature.properties.date;
      if (date < startDate || date > endDate) return;
      
      const key = date.slice(0, 7); // YYYY-MM
      if (!timeseriesMap.has(key)) {
        timeseriesMap.set(key, {
          prices: [],
          volumes: [],
          conflicts: []
        });
      }
      
      const data = timeseriesMap.get(key);
      data.prices.push(feature.properties.price);
      if (feature.properties.volume) data.volumes.push(feature.properties.volume);
      if (feature.properties.conflict_intensity) {
        data.conflicts.push(feature.properties.conflict_intensity);
      }
    });
  });
  
  // Convert map to array and calculate statistics
  return Array.from(timeseriesMap.entries()).map(([month, data]) => ({
    month,
    avgPrice: calculateAverage(data.prices),
    priceVolatility: calculateVolatility(data.prices),
    avgVolume: calculateAverage(data.volumes),
    conflictIntensity: calculateAverage(data.conflicts)
  }));
};

// Optimized market shock detection
const detectMarketShocks = async ({ features, date, threshold }) => {
  const shocks = [];
  const baseline = calculateBaseline(features);
  
  processInChunks(features, (chunk) => {
    chunk.forEach(feature => {
      if (feature.properties.date !== date) return;
      
      const deviation = calculateDeviation(
        feature.properties.price,
        baseline.mean,
        baseline.stdDev
      );
      
      if (Math.abs(deviation) > threshold) {
        shocks.push({
          region: feature.properties.region_id,
          magnitude: deviation,
          type: deviation > 0 ? 'surge' : 'drop',
          price: feature.properties.price,
          baseline: baseline.mean
        });
      }
    });
  });
  
  return shocks;
};

// Utility functions
const calculateAverage = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateVolatility = (values) => {
  const avg = calculateAverage(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(calculateAverage(squaredDiffs));
};

const calculateBaseline = (features) => {
  const prices = features.map(f => f.properties.price).filter(Boolean);
  return {
    mean: calculateAverage(prices),
    stdDev: calculateVolatility(prices)
  };
};

const calculateDeviation = (value, mean, stdDev) => {
  return (value - mean) / (stdDev || 1);
};

const calculateFlowMetrics = (regionId, flows) => {
  const relevantFlows = flows.filter(f => 
    f.source === regionId || f.target === regionId
  );
  
  return {
    totalFlow: relevantFlows.reduce((sum, f) => sum + (f.value || 0), 0),
    flowCount: relevantFlows.length,
    avgFlow: relevantFlows.length ? 
      relevantFlows.reduce((sum, f) => sum + (f.value || 0), 0) / relevantFlows.length : 
      0
  };
};