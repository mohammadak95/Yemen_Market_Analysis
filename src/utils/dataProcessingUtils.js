// src/utils/dataProcessingUtils.js

/**
 * Process regression data into standardized format
 */
export const processRegressionData = (data, selectedCommodity) => {
    if (!Array.isArray(data)) return null;
    
    const filteredData = data.filter(item => 
      item.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    )[0];
  
    if (!filteredData) return null;
  
    // Create consistent format for regression data
    return {
      model: {
        coefficients: filteredData.coefficients || {},
        intercept: filteredData.intercept || 0,
        p_values: filteredData.p_values || {},
        r_squared: filteredData.r_squared || 0,
        adj_r_squared: filteredData.adj_r_squared || 0,
        mse: filteredData.mse || 0,
        observations: filteredData.observations || 0
      },
      spatial: {
        moran_i: filteredData.moran_i || { I: 0, 'p-value': 1 },
        vif: filteredData.vif || []
      },
      residuals: processResiduals(filteredData.residual || [])
    };
  };
  
  /**
   * Process residuals with consistent formatting
   */
  const processResiduals = (residuals) => {
    const processed = residuals.map(r => ({
      region_id: r.region_id,
      date: new Date(r.date).toISOString(),
      residual: Number(r.residual)
    }));
  
    return {
      raw: processed,
      byRegion: groupResidualsByRegion(processed),
      stats: calculateResidualStats(processed)
    };
  };
  
  /**
   * Group residuals by region
   */
  const groupResidualsByRegion = (residuals) => {
    return residuals.reduce((acc, r) => {
      if (!acc[r.region_id]) acc[r.region_id] = [];
      acc[r.region_id].push(r);
      return acc;
    }, {});
  };
  
  /**
   * Calculate residual statistics
   */
  const calculateResidualStats = (residuals) => {
    const values = residuals.map(r => r.residual);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return {
      mean,
      variance: values.reduce((sum, val) => 
        sum + Math.pow(val - mean, 2), 0) / (values.length - 1),
      maxAbsolute: Math.max(...values.map(Math.abs))
    };
  };