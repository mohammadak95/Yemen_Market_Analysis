// src/utils/marketAnalysisHelpers.js

/**
 * Calculate price trend over a specified time period
 * @param {Array} timeSeriesData - Array of price data points
 * @param {number} periodLength - Number of periods to analyze (default: 6)
 * @returns {number} Percentage change in price
 */
export const calculatePriceTrend = (timeSeriesData, periodLength = 6) => {
    if (!timeSeriesData?.length) return 0;
    
    const recentData = timeSeriesData.slice(-periodLength);
    const priceChanges = recentData.map((data, i) => {
      if (i === 0) return 0;
      return ((data.price - recentData[i - 1].price) / recentData[i - 1].price) * 100;
    });
  
    return priceChanges.reduce((sum, change) => sum + change, 0) / (priceChanges.length - 1);
  };
  
  /**
   * Calculate price volatility
   * @param {Array} timeSeriesData - Array of price data points
   * @returns {number} Volatility measure
   */
  export const calculateVolatility = (timeSeriesData) => {
    if (!timeSeriesData?.length) return 0;
  
    const prices = timeSeriesData.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const variance = prices.reduce((sum, price) => {
      return sum + Math.pow(price - mean, 2);
    }, 0) / prices.length;
  
    return Math.sqrt(variance) / mean;
  };
  
  /**
   * Determine market stability based on volatility and trend
   * @param {Array} timeSeriesData - Array of price data points
   * @returns {string} Stability classification
   */
  export const determineStability = (timeSeriesData) => {
    const volatility = calculateVolatility(timeSeriesData);
    const trend = calculatePriceTrend(timeSeriesData);
  
    if (volatility < 0.05 && Math.abs(trend) < 5) return 'stable';
    if (volatility < 0.10 && Math.abs(trend) < 10) return 'moderate';
    return 'volatile';
  };
  
  /**
   * Get regional market connections
   * @param {string} region - Region identifier
   * @param {Object} spatialWeights - Spatial weights matrix
   * @returns {Object} Connection metrics
   */
  export const getRegionalConnections = (region, spatialWeights) => {
    if (!spatialWeights?.[region]) return { count: 0, strength: 0 };
  
    const neighbors = spatialWeights[region].neighbors || [];
    const strength = neighbors.reduce((sum, neighbor) => {
      return sum + (spatialWeights[neighbor]?.weight || 0);
    }, 0) / (neighbors.length || 1);
  
    return {
      count: neighbors.length,
      strength
    };
  };
  
  /**
   * Determine market role based on network position
   * @param {string} region - Region identifier
   * @param {Object} spatialWeights - Spatial weights matrix
   * @returns {string} Market role classification
   */
  export const determineMarketRole = (region, spatialWeights) => {
    const connections = getRegionalConnections(region, spatialWeights);
    
    if (connections.count > 5 && connections.strength > 0.7) return 'hub';
    if (connections.count > 3 || connections.strength > 0.5) return 'intermediary';
    return 'peripheral';
  };
  
  /**
   * Calculate market importance in the network
   * @param {string} region - Region identifier
   * @param {Object} spatialWeights - Spatial weights matrix
   * @returns {number} Importance score
   */
  export const calculateMarketImportance = (region, spatialWeights) => {
    if (!spatialWeights?.[region]) return 0;
  
    const totalRegions = Object.keys(spatialWeights).length;
    const connections = getRegionalConnections(region, spatialWeights);
    
    return (connections.count / totalRegions) * connections.strength;
  };
  
  /**
   * Analyze regional market performance
   * @param {string} region - Region identifier
   * @param {Array} residuals - Price residuals data
   * @returns {Object} Performance metrics
   */
  export const analyzeRegionalPerformance = (region, residuals) => {
    if (!residuals?.length) return null;
  
    const regionResiduals = residuals.filter(r => r.region_id === region);
    if (!regionResiduals.length) return null;
  
    const mean = regionResiduals.reduce((sum, r) => sum + r.residual, 0) / regionResiduals.length;
    const variance = regionResiduals.reduce((sum, r) => sum + Math.pow(r.residual - mean, 2), 0) / regionResiduals.length;
  
    return {
      mean,
      volatility: Math.sqrt(variance),
      trend: calculateResidualTrend(regionResiduals)
    };
  };
  
  /**
   * Generate policy implications based on analysis
   * @param {Object} integrationAnalysis - Market integration metrics
   * @param {Object} priceAnalysis - Price dynamics analysis
   * @param {Object} regionalAnalysis - Regional market analysis
   * @returns {Array} Array of policy implications
   */
  export const generatePolicyImplications = (integrationAnalysis, priceAnalysis, regionalAnalysis) => {
    const implications = [];
  
    // Market Integration Implications
    if (integrationAnalysis.status === 'low') {
      implications.push({
        severity: 'warning',
        title: 'Market Integration',
        message: 'Low market integration indicates potential barriers to trade.',
        recommendation: 'Consider infrastructure improvements and trade barrier reduction.'
      });
    }
  
    // Price Stability Implications
    if (priceAnalysis?.stability === 'volatile') {
      implications.push({
        severity: 'error',
        title: 'Price Stability',
        message: 'High price volatility detected across markets.',
        recommendation: 'Implement price stabilization mechanisms and improve market information systems.'
      });
    }
  
    // Regional Development Implications
    if (regionalAnalysis?.role === 'peripheral') {
      implications.push({
        severity: 'info',
        title: 'Regional Development',
        message: 'Limited market connectivity may restrict economic opportunities.',
        recommendation: 'Develop regional market infrastructure and strengthen trade linkages.'
      });
    }
  
    return implications;
  };
  
  /**
   * Format time series data for charts
   * @param {Array} timeSeriesData - Raw time series data
   * @returns {Object} Formatted chart data
   */
  export const formatTimeSeriesData = (timeSeriesData) => {
    if (!timeSeriesData?.length) return null;
  
    return {
      labels: timeSeriesData.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [{
        label: 'Price',
        data: timeSeriesData.map(d => d.price),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }]
    };
  };
  
  /**
   * Get chart configuration options
   * @returns {Object} Chart.js options
   */
  export const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Price'
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  });
  
  /**
   * Calculate trend for specific metrics
   * @param {Array} data - Time series data
   * @param {string} metric - Metric to analyze
   * @returns {number} Trend percentage
   */
  export const calculateTrend = (data, metric) => {
    if (!data?.length) return 0;
    
    const periods = 6;
    const recentData = data.slice(-periods);
    
    const getValue = (item) => {
      switch (metric) {
        case 'integration':
          return item.r_squared || 0;
        case 'transmission':
          return item.coefficients?.spatial_lag_price || 0;
        default:
          return item.price || 0;
      }
    };
  
    const start = getValue(recentData[0]);
    const end = getValue(recentData[recentData.length - 1]);
    
    return ((end - start) / start) * 100;
  };
  
  /**
   * Get severity level for price alerts
   * @param {Object} priceAnalysis - Price analysis results
   * @returns {string} Alert severity
   */
  export const getPriceAlertSeverity = (priceAnalysis) => {
    if (!priceAnalysis) return 'info';
    
    if (priceAnalysis.stability === 'volatile') return 'error';
    if (priceAnalysis.stability === 'moderate') return 'warning';
    return 'success';
  };
  
  /**
   * Generate price trend message
   * @param {Object} priceAnalysis - Price analysis results
   * @returns {string} Formatted message
   */
  export const generatePriceTrendMessage = (priceAnalysis) => {
    if (!priceAnalysis) return '';
  
    const trendDirection = priceAnalysis.trend > 0 ? 'increasing' : 'decreasing';
    const stabilityLevel = priceAnalysis.stability;
    const convergence = priceAnalysis.convergence ? 'converging' : 'diverging';
  
    return `Prices are ${trendDirection} with ${stabilityLevel} stability and ${convergence} across markets.`;
  };