// src/components/analysis/spatial-analysis/utils/shockAnalysis.js

export const calculateShockStatistics = (shocks) => {
    if (!shocks.length) {
      return {
        totalShocks: 0,
        maxMagnitude: 0,
        avgMagnitude: 0,
        shockTypes: {}
      };
    }
  
    const stats = shocks.reduce((acc, shock) => {
      acc.totalShocks++;
      acc.maxMagnitude = Math.max(acc.maxMagnitude, shock.magnitude);
      acc.avgMagnitude += shock.magnitude;
      acc.shockTypes[shock.shock_type] = (acc.shockTypes[shock.shock_type] || 0) + 1;
      return acc;
    }, {
      totalShocks: 0,
      maxMagnitude: 0,
      avgMagnitude: 0,
      shockTypes: {}
    });
  
    stats.avgMagnitude /= stats.totalShocks;
    return stats;
  };
  
  export const analyzeShockPropagation = (shocks, selectedDate) => {
    // Group shocks by date to track propagation
    const shocksByDate = shocks.reduce((acc, shock) => {
      if (!acc[shock.date]) {
        acc[shock.date] = [];
      }
      acc[shock.date].push(shock);
      return acc;
    }, {});
  
    // Find connected shock patterns
    const patterns = [];
    const dates = Object.keys(shocksByDate).sort();
    const selectedIndex = dates.indexOf(selectedDate);
  
    if (selectedIndex >= 0) {
      const lookbackWindow = 3; // Number of months to look back
      const relevantDates = dates.slice(
        Math.max(0, selectedIndex - lookbackWindow),
        selectedIndex + 1
      );
  
      relevantDates.forEach((date, i) => {
        const currentShocks = shocksByDate[date];
        if (i > 0) {
          const previousShocks = shocksByDate[relevantDates[i - 1]];
          
          // Find connected shock patterns
          currentShocks.forEach(currentShock => {
            previousShocks.forEach(prevShock => {
              if (areRegionsConnected(currentShock.region, prevShock.region)) {
                patterns.push({
                  path: [getRegionCoordinates(prevShock.region), getRegionCoordinates(currentShock.region)],
                  delays: [getDaysBetween(prevShock.date, currentShock.date)],
                  magnitude: (currentShock.magnitude + prevShock.magnitude) / 2
                });
              }
            });
          });
        }
      });
    }
  
    return patterns;
  };
  
  // Helper functions
  const areRegionsConnected = (region1, region2) => {
    // Implementation would depend on your region connectivity data
    return true; // Placeholder
  };
  
  const getRegionCoordinates = (region) => {
    // Implementation would depend on your geometry data
    return [15.3694, 44.191]; // Placeholder
  };
  
  const getDaysBetween = (date1, date2) => {
    return Math.abs(new Date(date1) - new Date(date2)) / (1000 * 60 * 60 * 24);
  };