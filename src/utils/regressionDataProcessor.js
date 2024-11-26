//src/utils/regressionDataProcessor.js

import _ from 'lodash';
import { spatialHandler } from './spatialDataHandler';

/**
 * Process and validate spatial regression results
 */
export const processSpatialRegression = (regressionData) => {
  return spatialHandler.processRegressionAnalysis(regressionData);
};

/**
 * Generate summary statistics for visualization
 */
export const generateRegressionSummary = (processedResults) => {
  const { model, spatial, residuals } = processedResults;
  
  return {
    modelFit: {
      r2: model.statistics.r_squared,
      adjR2: model.statistics.adj_r_squared,
      mse: model.statistics.mse,
      observations: model.statistics.observations,
      spatialCoef: model.coefficients.spatial_lag_price
    },
    spatialDependence: {
      moranI: spatial.moran_i.I,
      pValue: spatial.moran_i['p-value'],
      vifMax: _.maxBy(spatial.vif, 'VIF')?.VIF
    },
    residualPatterns: {
      meanResidual: residuals.global.mean,
      stdResidual: residuals.global.std,
      maxAbsResidual: Math.max(
        Math.abs(residuals.global.max),
        Math.abs(residuals.global.min)
      ),
      regionsWithHighResiduals: Object.entries(residuals.stats)
        .filter(([_, stats]) => Math.abs(stats.mean) > residuals.global.std)
        .map(([region]) => region)
    }
  };
};
