// useMarketAnalysis.js

import { useSelector } from 'react-redux';
import {
  selectTimeSeriesData,       // Changed from getTimeSeriesData
  selectMarketShocks,         // Changed from getMarketShocks
  selectRegressionAnalysis,   // Changed from getRegressionAnalysis
  selectSpatialAutocorrelation // Changed from getSpatialAutocorrelation
} from '../selectors/optimizedSelectors';

export function useMarketAnalysis() {
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const shocksData = useSelector(selectMarketShocks);
  const regressionAnalysis = useSelector(selectRegressionAnalysis);
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);

  // Function to calculate price trend using linear regression
  function calculatePriceTrend(data) {
    if (!data || data.length === 0) return NaN;

    // Extract prices and months (as numerical indices)
    const prices = data.map((item) => item.avgUsdPrice).filter((price) => !isNaN(price));
    const months = data.map((_, index) => index).slice(0, prices.length);

    // Handle missing or NaN prices
    if (prices.length < 2) {
      return NaN;
    }

    // Perform linear regression to calculate the slope (price trend)
    const n = prices.length;
    const sumX = months.reduce((sum, x) => sum + x, 0);
    const sumY = prices.reduce((sum, y) => sum + y, 0);
    const sumXY = months.reduce((sum, x, i) => sum + x * prices[i], 0);
    const sumX2 = months.reduce((sum, x) => sum + x * x, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = n * sumX2 - sumX * sumX;

    if (denominator === 0) return NaN;

    const slope = numerator / denominator;
    return slope;
  }

  const priceTrend = calculatePriceTrend(timeSeriesData);

  // Extract metrics from regression analysis
  const moransI = spatialAutocorrelation.global?.moran_i;
  const spatialLagCoefficient = regressionAnalysis.model?.coefficients?.spatial_lag_price;
  const rSquared = regressionAnalysis.model?.r_squared;

  // Count the number of shocks
  const shocksCount = shocksData ? shocksData.length : 'NaN';

  return {
    priceTrend: isNaN(priceTrend) ? 'NaN' : priceTrend.toFixed(2),
    moransI: isNaN(moransI) ? 'NaN' : moransI.toFixed(4),
    spatialLagCoefficient: isNaN(spatialLagCoefficient) ? 'NaN' : spatialLagCoefficient.toFixed(4),
    rSquared: isNaN(rSquared) ? 'NaN' : rSquared.toFixed(4),
    shocksCount,
  };
}