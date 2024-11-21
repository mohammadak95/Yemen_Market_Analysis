// src/components/analysis/spatial-analysis/utils/conflictAnalysis.js

export const calculateConflictMetrics = (timeSeriesData, timeWindow) => {
    const metrics = {};
    const windowMonths = getWindowMonths(timeWindow);
  
    // Filter data for time window
    const filteredData = filterDataByTimeWindow(timeSeriesData, windowMonths);
  
    // Group by region
    const regionGroups = _.groupBy(filteredData, 'region');
  
    Object.entries(regionGroups).forEach(([region, data]) => {
      metrics[region] = {
        priceImpact: calculatePriceImpact(data),
        correlation: calculatePriceConflictCorrelation(data),
        volatility: calculatePriceVolatility(data),
        avgConflict: calculateAverageConflict(data),
        trendAnalysis: analyzeConflictTrends(data)
      };
    });
  
    return metrics;
  };
  
  export const analyzePriceImpacts = (timeSeriesData, timeWindow) => {
    const impacts = {};
    const windowMonths = getWindowMonths(timeWindow);
    const filteredData = filterDataByTimeWindow(timeSeriesData, windowMonths);
    const regionGroups = _.groupBy(filteredData, 'region');
  
    Object.entries(regionGroups).forEach(([region, data]) => {
      const sortedData = _.sortBy(data, 'month');
      const baseline = calculateBaselinePrices(sortedData);
      
      impacts[region] = {
        region,
        conflict: calculateAverageConflict(data),
        impact: calculatePercentageChange(baseline.prices),
        volatility: calculatePriceVolatility(data),
        direction: baseline.trend > 0 ? 'up' : 'down',
        severity: calculateImpactSeverity(baseline.trend, data)
      };
    });
  
    return impacts;
  };
  
  export const calculateRegionalCorrelations = (timeSeriesData, spatialClusters) => {
    const correlations = [];
    const regions = [...new Set(timeSeriesData.map(d => d.region))];
  
    regions.forEach((region1, i) => {
      regions.slice(i + 1).forEach(region2 => {
        const correlation = calculateInterRegionalCorrelation(
          timeSeriesData,
          region1,
          region2
        );
  
        correlations.push({
          region1,
          region2,
          correlation,
          isConnected: areRegionsConnected(region1, region2, spatialClusters)
        });
      });
    });
  
    return correlations;
  };
  
  // Helper functions
  
  const getWindowMonths = (timeWindow) => {
    const windows = {
      '1M': 1,
      '3M': 3,
      '6M': 6,
      '1Y': 12
    };
    return windows[timeWindow] || 1;
  };
  
  const filterDataByTimeWindow = (data, months) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return data.filter(d => new Date(d.month) >= cutoffDate);
  };
  
  const calculatePriceImpact = (data) => {
    const sortedData = _.sortBy(data, 'month');
    const priceChanges = [];
  
    for (let i = 1; i < sortedData.length; i++) {
      const prevPrice = sortedData[i - 1].avgUsdPrice;
      const currentPrice = sortedData[i].avgUsdPrice;
      const conflictChange = sortedData[i].conflict_intensity - sortedData[i - 1].conflict_intensity;
      
      if (conflictChange > 0) {
        priceChanges.push((currentPrice - prevPrice) / prevPrice * 100);
      }
    }
  
    return priceChanges.length ? _.mean(priceChanges) : 0;
  };
  
  const calculatePriceConflictCorrelation = (data) => {
    if (data.length < 2) return 0;
    
    const prices = data.map(d => d.avgUsdPrice);
    const conflicts = data.map(d => d.conflict_intensity);
    
    return calculateCorrelation(prices, conflicts);
  };
  
  const calculatePriceVolatility = (data) => {
    if (data.length < 2) return 0;
    
    const prices = data.map(d => d.avgUsdPrice);
    const mean = _.mean(prices);
    const variance = _.mean(prices.map(p => Math.pow(p - mean, 2)));
    
    return Math.sqrt(variance) / mean * 100;
  };
  
  const calculateAverageConflict = (data) => {
    return _.meanBy(data, 'conflict_intensity');
  };
  
  const calculateBaselinePrices = (sortedData) => {
    const prices = sortedData.map(d => d.avgUsdPrice);
    const trend = calculateLinearTrend(prices);
    
    return {
      prices,
      trend
    };
  };
  
  const calculateLinearTrend = (values) => {
    const n = values.length;
    if (n < 2) return 0;
  
    const xMean = (n - 1) / 2;
    const yMean = _.mean(values);
  
    let numerator = 0;
    let denominator = 0;
  
    values.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean);
      denominator += Math.pow(x - xMean, 2);
    });
  
    return numerator / denominator;
  };
  
  const calculatePercentageChange = (prices) => {
    if (prices.length < 2) return 0;
    return (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
  };
  
  const calculateImpactSeverity = (trend, data) => {
    const volatility = calculatePriceVolatility(data);
    const avgConflict = calculateAverageConflict(data);
    
    return Math.abs(trend) * volatility * avgConflict / 1000;
  };
  
  const calculateInterRegionalCorrelation = (timeSeriesData, region1, region2) => {
    const data1 = timeSeriesData.filter(d => d.region === region1);
    const data2 = timeSeriesData.filter(d => d.region === region2);
    
    const dates = [...new Set([...data1, ...data2].map(d => d.month))].sort();
    const pairs = dates.map(date => {
      const d1 = data1.find(d => d.month === date);
      const d2 = data2.find(d => d.month === date);
      return {
        price1: d1?.avgUsdPrice,
        price2: d2?.avgUsdPrice,
        conflict1: d1?.conflict_intensity,
        conflict2: d2?.conflict_intensity
      };
    }).filter(p => p.price1 && p.price2 && p.conflict1 && p.conflict2);
  
    const priceCorr = calculateCorrelation(
      pairs.map(p => p.price1),
      pairs.map(p => p.price2)
    );
  
    const conflictCorr = calculateCorrelation(
      pairs.map(p => p.conflict1),
      pairs.map(p => p.conflict2)
    );
  
    return (priceCorr + conflictCorr) / 2;
  };
  
  const calculateCorrelation = (x, y) => {
    const n = x.length;
    if (n !== y.length || n < 2) return 0;
  
    const xMean = _.mean(x);
    const yMean = _.mean(y);
    
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
  
    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
  
    const denominator = Math.sqrt(xDenominator * yDenominator);
    return denominator === 0 ? 0 : numerator / denominator;
  };
  
  const areRegionsConnected = (region1, region2, spatialClusters) => {
    return spatialClusters.some(cluster => 
      (cluster.main_market === region1 && cluster.connected_markets.includes(region2)) ||
      (cluster.main_market === region2 && cluster.connected_markets.includes(region1))
    );
  };
  
  const analyzeConflictTrends = (data) => {
    const sortedData = _.sortBy(data, 'month');
    const conflicts = sortedData.map(d => d.conflict_intensity);
    
    return {
      trend: calculateLinearTrend(conflicts),
      peakIntensity: Math.max(...conflicts),
      sustainedConflict: calculateSustainedConflict(conflicts),
      variability: calculateVariability(conflicts)
    };
  };
  
  const calculateSustainedConflict = (conflicts) => {
    let maxStreak = 0;
    let currentStreak = 0;
    const threshold = _.mean(conflicts);
  
    conflicts.forEach(conflict => {
      if (conflict > threshold) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
  
    return maxStreak;
  };
  
  const calculateVariability = (values) => {
    const differences = [];
    for (let i = 1; i < values.length; i++) {
      differences.push(Math.abs(values[i] - values[i - 1]));
    }
    return differences.length ? _.mean(differences) : 0;
  };