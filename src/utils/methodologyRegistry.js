// src/utils/methodologyRegistry.js

// Technical component mapping
export const technicalMapping = {
  ecm: {
    section: '2.1. Error Correction Model (ECM)',
    equations: {
      main: {
        latex: '\\Delta Y_t = \\alpha \\beta\' Y_{t-1} + \\sum_{i=1}^{p-1} \\Gamma_i \\Delta Y_{t-i} + u_t',
        description: 'Vector Error Correction Model specification',
        variables: {
          '\\alpha': 'Speed of adjustment coefficient',
          '\\beta': 'Long-run cointegration vector',
          '\\Gamma_i': 'Short-run dynamics coefficients',
          'u_t': 'Error term'
        }
      },
      diagnostics: {
        moransI: {
          latex: 'I = \\frac{N}{\\sum_{i=1}^{N} \\sum_{j=1}^{N} w_{ij}} \\cdot \\frac{\\sum_{i=1}^{N} \\sum_{j=1}^{N} w_{ij}(y_i - \\bar{y})(y_j - \\bar{y})}{\\sum_{i=1}^{N} (y_i - \\bar{y})^2}',
          description: "Moran's I spatial autocorrelation statistic"
        },
        jarqueBera: {
          latex: 'JB = \\frac{n}{6}(S^2 + \\frac{1}{4}(K-3)^2)',
          description: 'Jarque-Bera normality test statistic'
        }
      }
    },
    concepts: {
      cointegration: 'Long-run equilibrium relationship between variables',
      errorCorrection: 'Adjustment process towards long-run equilibrium',
      grangerCausality: 'Statistical prediction relationship between variables'
    }
  },
  priceDiff: {
    section: '2.2. Price Differential Model',
    equations: {
      main: {
        latex: '\\Delta P_{ijt} = \\ln(P_{it}) - \\ln(P_{jt})',
        description: 'Log price differential between markets i and j at time t',
        variables: {
          'P_{it}': 'Price in market i at time t',
          'P_{jt}': 'Price in market j at time t'
        }
      }
    },
    concepts: {
      arbitrage: 'Price convergence through market mechanisms',
      priceTransmission: 'Speed and extent of price signal propagation'
    }
  },
  spatial: {
    section: '3. Spatial Econometric Analysis',
    equations: {
      weights: {
        latex: 'w_{ij} = \\begin{cases} 1 & \\text{if } j \\text{ is one of the } k \\text{ nearest neighbors of } i \\\\ 0 & \\text{otherwise} \\end{cases}',
        description: 'K-nearest neighbors spatial weights specification'
      }
    },
    concepts: {
      spatialAutocorrelation: 'Spatial dependence in price patterns',
      marketClustering: 'Geographic clustering of similar market behaviors'
    }
  },
  tvmii: {
    section: 'Time-Varying Market Integration Index',
    equations: {
      index: {
        latex: 'TVMII_{ijt} = f(\\rho_{ijt}, \\sigma_{ijt}, d_{ij})',
        description: 'Time-varying market integration index',
        variables: {
          '\\rho_{ijt}': 'Time-varying price correlation',
          '\\sigma_{ijt}': 'Time-varying volatility',
          'd_{ij}': 'Distance between markets'
        }
      }
    },
    concepts: {
      marketIntegration: 'Degree of price co-movement between markets',
      timeVaryingRelationship: 'Evolution of market relationships over time'
    }
  }
};

// Helper functions for accessing methodology
export const getMethodologySection = (componentType) => {
  const mapping = technicalMapping[componentType];
  if (!mapping) return null;

  return methodologyContent.find(
    section => section.title.includes(mapping.section)
  );
};

export const getEquation = (componentType, equationType) => {
  const mapping = technicalMapping[componentType];
  if (!mapping?.equations) return null;

  return mapping.equations[equationType];
};

export const getConcept = (componentType, conceptKey) => {
  const mapping = technicalMapping[componentType];
  if (!mapping?.concepts) return null;

  return mapping.concepts[conceptKey];
};

// src/utils/methodologyRegistry.js

export const methodologyContent = {
  'price-diff': {
    section: 'price-differential',
    tooltips: {
      main: 'Price differential analysis examines the differences in prices between markets',
      chart: 'Visualizes price differences over time with confidence intervals',
      diagnostics: 'Statistical tests to validate price differential patterns',
      market_pairs: 'Comparison of price relationships between market pairs',
    },
    equations: {
      main: {
        latex: '\\Delta P_{ij,t} = \\ln(P_{i,t}) - \\ln(P_{j,t})',
        description: 'Price differential between markets i and j at time t',
        variables: {
          'P_{i,t}': 'Price in market i at time t',
          'P_{j,t}': 'Price in market j at time t',
          '\\Delta P_{ij,t}': 'Log price differential',
        },
      },
    },
  },
  'ecm': {
    section: 'error-correction-model',
    tooltips: {
      main: 'Error Correction Model analyzes long-run equilibrium relationships',
      diagnostics: 'Model diagnostics and statistical validation tests',
      cointegration: 'Tests for long-run relationships between price series',
    },
    equations: {
      main: {
        latex: '\\Delta y_t = \\alpha(y_{t-1} - \\beta x_{t-1}) + \\gamma\\Delta x_t + \\epsilon_t',
        description: 'Error correction model specification',
        variables: {
          '\\alpha': 'Speed of adjustment coefficient',
          '\\beta': 'Long-run equilibrium coefficient',
          '\\gamma': 'Short-run dynamics coefficient',
        },
      },
    },
  },
  'spatial': {
    section: 'spatial-analysis',
    tooltips: {
      main: 'Spatial analysis examines geographic patterns in market relationships',
      choropleth: 'Color-coded map showing spatial distribution of values',
      flow_network: 'Network diagram showing market relationships and flows',
      market_clustering: 'Analysis of market groupings based on spatial relationships',
    },
    equations: {
      moran: {
        latex: 'I = \\frac{n}{W} \\frac{\\sum_i \\sum_j w_{ij}(x_i - \\bar{x})(x_j - \\bar{x})}{\\sum_i (x_i - \\bar{x})^2}',
        description: "Moran's I spatial autocorrelation statistic",
        variables: {
          'w_{ij}': 'Spatial weight between locations i and j',
          'x_i': 'Variable value at location i',
          'W': 'Sum of all spatial weights',
        },
      },
    },
  },
  'tvmii': {
    section: 'time-varying-market-integration',
    tooltips: {
      main: 'Time-Varying Market Integration Index measures dynamic market relationships',
      chart: 'Visualizes changes in market integration over time',
      interpretation: 'Guidelines for interpreting TV-MII values',
      market_pairs: 'Comparison of integration between market pairs',
    },
    equations: {
      main: {
        latex: 'TV\\text{-}MII_{t} = \\frac{\\text{Cov}(P_{1t}, P_{2t})}{\\sqrt{\\text{Var}(P_{1t})\\text{Var}(P_{2t})}}',
        description: 'Time-Varying Market Integration Index calculation',
        variables: {
          'P_{1t}': 'Price in market 1 at time t',
          'P_{2t}': 'Price in market 2 at time t',
          'TV\\text{-}MII_{t}': 'Integration index at time t',
        },
      },
    },
  },
};

export const getMethodologyInfo = (componentType, element) => {
  const info = methodologyContent[componentType];
  if (!info) return null;
  
  if (element) {
    return {
      tooltips: info.tooltips?.[element],
      equations: info.equations?.[element],
    };
  }
  
  return info;
};