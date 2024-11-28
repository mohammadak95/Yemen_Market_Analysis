// src/components/analysis/spatial-analysis/utils/spatialAutocorrelationUtils.js

export const processScatterData = (timeSeriesData, localMorans) => {
  if (!timeSeriesData?.length || !localMorans) return [];
  
  // Extract prices and calculate mean and std deviation
  const prices = timeSeriesData.map(d => d.usdPrice).filter(p => !isNaN(p));
  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdPrice = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - meanPrice, 2), 0) / prices.length
  );
  
  return timeSeriesData.map(d => {
    const standardizedPrice = stdPrice !== 0 ? (d.usdPrice - meanPrice) / stdPrice : 0;
    const moranResult = localMorans[d.region] || {};
    
    return {
      name: d.region,
      x: standardizedPrice,
      y: moranResult.local_i !== undefined ? moranResult.local_i : 0,
      cluster: moranResult.cluster_type || 'not-significant',
      price: d.usdPrice !== null && d.usdPrice !== undefined ? d.usdPrice : 0,
      significance: moranResult.p_value !== null && moranResult.p_value < 0.05,
      localI: moranResult.local_i !== undefined ? moranResult.local_i : 0
    };
  });
};

export const getClusterColor = (clusterType, significance = true) => {
  const colors = {
    'high-high': '#d73027',
    'low-low': '#4575b4',
    'high-low': '#fc8d59',
    'low-high': '#91bfdb',
    'not-significant': '#cccccc'
  };
  
  // If not significant, use 'not-significant' color
  if (!significance) {
    return colors['not-significant'];
  }

  return colors[clusterType] || '#cccccc';
};

export const interpretMoranResults = (global, stats) => {
  const { moran_i, p_value } = global;
  
  if (moran_i === undefined || p_value === undefined) return 'Insufficient data for spatial analysis.';

  const interpretation = [];

  if (Math.abs(moran_i) > 0.3) {
    interpretation.push(moran_i > 0 
      ? 'Strong positive spatial autocorrelation indicates clustered price patterns.'
      : 'Strong negative spatial autocorrelation indicates dispersed price patterns.');
  } else {
    interpretation.push('Weak spatial autocorrelation suggests random price distribution.');
  }

  const { highHighClusters, lowLowClusters } = stats;
  if (highHighClusters > 0 || lowLowClusters > 0) {
    interpretation.push(
      `Found ${highHighClusters} high-price and ${lowLowClusters} low-price significant clusters.`
    );
  }

  return interpretation.join(' ');
};