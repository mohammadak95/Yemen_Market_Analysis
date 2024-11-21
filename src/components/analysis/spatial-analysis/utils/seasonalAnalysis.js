// src/components/analysis/spatial-analysis/utils/seasonalAnalysis.js

export const calculateRegionalPatterns = (timeSeriesData) => {
    const regions = new Set(timeSeriesData.map(d => d.region));
    const patterns = {};
  
    regions.forEach(region => {
      const regionData = timeSeriesData.filter(d => d.region === region);
      patterns[region] = calculateMonthlyPatterns(regionData);
    });
  
    return patterns;
  };
  
  export const analyzeSeasonalStrength = (timeSeriesData) => {
    const regions = new Set(timeSeriesData.map(d => d.region));
    const strength = {};
  
    regions.forEach(region => {
      const regionData = timeSeriesData.filter(d => d.region === region);
      strength[region] = calculateSeasonalStrength(regionData);
    });
  
    return strength;
  };
  
  const calculateMonthlyPatterns = (data) => {
    const monthlyAverages = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);
    const overallMean = data.reduce((sum, d) => sum + d.avgUsdPrice, 0) / data.length;
  
    data.forEach(d => {
      const month = new Date(d.month).getMonth();
      monthlyAverages[month] += d.avgUsdPrice;
      monthCounts[month]++;
    });
  
    return monthlyAverages.map((sum, i) => 
      monthCounts[i] ? (sum / monthCounts[i] - overallMean) / overallMean : 0
    );
  };
  
  const calculateSeasonalStrength = (data) => {
    const monthlyPattern = calculateMonthlyPatterns(data);
    const variance = monthlyPattern.reduce((sum, effect) => sum + effect * effect, 0);
    return Math.sqrt(variance / 12);
  };