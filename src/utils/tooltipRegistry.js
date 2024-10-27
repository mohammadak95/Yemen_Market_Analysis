// src/utils/tooltipRegistry.js

// Technical tooltips by component and element
export const tooltips = {
  ecm: {
    alpha: {
      short: 'Speed of adjustment coefficient (α)',
      detailed: 'Measures how quickly deviations from long-run equilibrium are corrected',
      technical: 'Coefficient in the error correction term determining adjustment speed to equilibrium'
    },
    cointegration: {
      short: 'Long-run equilibrium relationship',
      detailed: 'Stable long-term relationship between non-stationary variables',
      technical: 'Statistical property where linear combination of non-stationary series is stationary'
    },
    diagnostics: {
      moransI: {
        short: "Moran's I statistic",
        detailed: 'Measures spatial autocorrelation in residuals',
        technical: 'Spatial correlation coefficient ranging from -1 (dispersion) to 1 (clustering)'
      }
    }
  },
  priceDiff: {
    spread: {
      short: 'Price spread between markets',
      detailed: 'Difference in log prices between two markets',
      technical: 'Logarithmic price differential measuring relative price gaps'
    },
    arbitrage: {
      short: 'Price arbitrage opportunity',
      detailed: 'Potential profit from price differences',
      technical: 'Price differential exceeding transaction costs'
    }
  },
  spatial: {
    weights: {
      short: 'Spatial weights matrix',
      detailed: 'Defines spatial relationships between markets',
      technical: 'Row-standardized matrix of spatial connectivity'
    },
    clustering: {
      short: 'Spatial clustering',
      detailed: 'Geographic grouping of similar values',
      technical: 'Positive spatial autocorrelation in market behavior'
    }
  },
  tvmii: {
    integration: {
      short: 'Market integration index',
      detailed: 'Measure of market connectedness',
      technical: 'Time-varying coefficient of market price co-movement'
    }
  }
};

// Get tooltip based on detail level
export const getTooltip = (componentType, element, level = 'short') => {
  const componentTooltips = tooltips[componentType];
  if (!componentTooltips) return null;

  // Handle nested tooltips
  const paths = element.split('.');
  let tooltip = componentTooltips;
  for (const path of paths) {
    tooltip = tooltip[path];
    if (!tooltip) return null;
  }

  return tooltip[level] || tooltip.short;
};