// Merged dataHooks.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDataPath } from '../utils/dataUtils';
import { processRegressionData } from '../utils/dataProcessingUtils';
import { DEFAULT_REGRESSION_DATA, isValidRegressionData } from '../types/dataTypes';


/**
 * Custom hook to fetch and manage TV-MII data.
 *
 * @returns {Object} - Contains tvmiiData, marketPairsData, status, and error.
 */
const useTVMIIData = () => {
  const [tvmiiData, setTvmiiData] = useState(null);
  const [marketPairsData, setMarketPairsData] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  /**
   * Fetches and processes TV-MII data.
   */
  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');

      try {
        const tvmiiPath = getDataPath('tv_mii_results.json');
        const marketPairsPath = getDataPath('tv_mii_market_results.json');

        const [tvmiiResponse, marketPairsResponse] = await Promise.all([
          fetch(tvmiiPath),
          fetch(marketPairsPath),
        ]);

        if (!tvmiiResponse.ok)
          throw new Error(`HTTP error! status: ${tvmiiResponse.status}`);
        if (!marketPairsResponse.ok)
          throw new Error(`HTTP error! status: ${marketPairsResponse.status}`);

        const fetchedTvmiiData = await tvmiiResponse.json();
        const fetchedMarketPairsData = await marketPairsResponse.json();

        // Process and normalize data
        const processedTvmiiData = fetchedTvmiiData.map((item) => ({
          ...item,
          date: new Date(item.date),
          tvmii: item.tv_mii || item.tvmii || item.value,
        }));

        const processedMarketPairsData = fetchedMarketPairsData.map((item) => ({
          ...item,
          date: new Date(item.date),
          tvmii: item.tv_mii || item.tvmii || item.value,
        }));

        // Update state with fetched data
        setTvmiiData(processedTvmiiData);
        setMarketPairsData(processedMarketPairsData);
        setStatus('succeeded');
      } catch (err) {
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, []);

  return { tvmiiData, marketPairsData, status, error };
};

/**
 * Custom hook to fetch and manage Price Differential data.
 *
 * @param {string} selectedCommodity - The commodity selected by the user.
 * @returns {Object} - Contains data, markets, commodities, status, and error.
 */
const usePriceDifferentialData = (selectedCommodity) => {
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  /**
   * Processes and filters price differential data based on the selected commodity.
   *
   * @param {Object} jsonData - The raw JSON data fetched from the API.
   * @param {string} commodity - The selected commodity to filter data.
   * @returns {Object} - Contains filtered data and list of markets.
   */
  const processPriceDifferentialData = useCallback((jsonData, commodity) => {
    const marketsData = jsonData.markets || {};
    const marketsList = Object.keys(marketsData);

    // Filter data for the selected commodity
    const filteredData = {};
    marketsList.forEach((market) => {
      const commodityResults = marketsData[market].commodity_results[commodity];
      if (commodityResults) {
        filteredData[market] = {
          ...marketsData[market],
          commodity_results: {
            [commodity]: commodityResults,
          },
        };
      }
    });

    return { data: filteredData, markets: Object.keys(filteredData) };
  }, []);

  /**
   * Fetches and processes Price Differential data.
   */
  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const path = getDataPath('price_diff_results/price_differential_results.json');
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const jsonData = await response.json();

        // Extract commodities
        const commoditiesSet = new Set();
        Object.values(jsonData.markets || {}).forEach((marketData) => {
          const commodityResults = marketData.commodity_results || {};
          Object.keys(commodityResults).forEach((commodity) => {
            commoditiesSet.add(commodity);
          });
        });

        setCommodities(Array.from(commoditiesSet));

        // Process and filter data based on the selected commodity
        const filteredData = processPriceDifferentialData(jsonData, selectedCommodity);

        setData(filteredData.data);
        setMarkets(filteredData.markets);
        setStatus('succeeded');
      } catch (err) {
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, [selectedCommodity, processPriceDifferentialData]);

  return { data, markets, commodities, status, error };
};

/**
 * Custom hook to fetch and manage ECM (Error Correction Model) data.
 *
 * @returns {Object} - Contains unifiedData, directionalData, statuses, and errors.
 */
const useECMData = () => {
  const [unifiedData, setUnifiedData] = useState(null);
  const [unifiedStatus, setUnifiedStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [unifiedError, setUnifiedError] = useState(null);

  const [directionalData, setDirectionalData] = useState(null);
  const [directionalStatus, setDirectionalStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [directionalError, setDirectionalError] = useState(null);

  const fetchInProgress = useRef(false);

  /**
   * Fetches JSON data from a given URL.
   * Replaces 'NaN' strings with null to ensure JSON validity.
   *
   * @param {string} url - The URL to fetch data from.
   * @returns {Promise<Object>} - The parsed JSON data.
   */
  const fetchData = useCallback(async (url) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return JSON.parse(text.replace(/NaN/g, 'null'));
  }, []);

  /**
   * Processes unified ECM data by extracting necessary fields,
   * including alpha, beta, and gamma coefficients.
   *
   * @param {Object} data - The raw ECM analysis data.
   * @returns {Array<Object>} - The processed unified ECM data.
   */
  const processUnifiedData = useCallback((data) => {
    return data.ecm_analysis.map((item) => ({
      ...item,
      diagnostics: {
        Variable_1: item.diagnostics?.Variable_1 || 'N/A',
        Variable_2: item.diagnostics?.Variable_2 || 'N/A',
      },
      irf: Array.isArray(item.irf?.impulse_response?.irf) ? item.irf.impulse_response.irf : [],
      granger_causality: item.granger_causality || 'N/A',
      spatial_autocorrelation: item.spatial_autocorrelation
        ? {
            Variable_1: {
              Moran_I: item.spatial_autocorrelation.Variable_1?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_1?.Moran_p_value || null,
            },
            Variable_2: {
              Moran_I: item.spatial_autocorrelation.Variable_2?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_2?.Moran_p_value || null,
            },
          }
        : null,
      residuals: Array.isArray(item.residuals) ? item.residuals : [],
      fittedValues: Array.isArray(item.fittedValues) ? item.fittedValues : [],
      alpha: item.alpha !== undefined ? item.alpha : null,
      beta: item.beta !== undefined ? item.beta : null,
      gamma: item.gamma !== undefined ? item.gamma : null,
    }));
  }, []);

  /**
   * Processes directional ECM data by extracting necessary fields,
   * including alpha, beta, and gamma coefficients.
   *
   * @param {Array<Object>} data - The raw directional ECM data.
   * @returns {Array<Object>} - The processed directional ECM data.
   */
  const processDirectionalData = useCallback((data) => {
    return data.map((item) => ({
      ...item,
      diagnostics: {
        Variable_1: item.diagnostics?.Variable_1 || 'N/A',
        Variable_2: item.diagnostics?.Variable_2 || 'N/A',
      },
      irf: Array.isArray(item.irf?.impulse_response?.irf) ? item.irf.impulse_response.irf : [],
      granger_causality: item.granger_causality || 'N/A',
      spatial_autocorrelation: item.spatial_autocorrelation
        ? {
            Variable_1: {
              Moran_I: item.spatial_autocorrelation.Variable_1?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_1?.Moran_p_value || null,
            },
            Variable_2: {
              Moran_I: item.spatial_autocorrelation.Variable_2?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_2?.Moran_p_value || null,
            },
          }
        : null,
      residuals: Array.isArray(item.residuals) ? item.residuals : [],
      fittedValues: Array.isArray(item.fittedValues) ? item.fittedValues : [],
      alpha: item.alpha !== undefined ? item.alpha : null,
      beta: item.beta !== undefined ? item.beta : null,
      gamma: item.gamma !== undefined ? item.gamma : null,
    }));
  }, []);

  /**
   * useEffect to fetch ECM data on component mount.
   * Ensures that data fetching happens only once at a time.
   */
  useEffect(() => {
    if (fetchInProgress.current) return;

    const fetchAllData = async () => {
      fetchInProgress.current = true;
      setUnifiedStatus('loading');
      setDirectionalStatus('loading');

      try {
        const unifiedPath = getDataPath('ecm/ecm_analysis_results.json');
        const northToSouthPath = getDataPath('ecm/ecm_results_north_to_south.json');
        const southToNorthPath = getDataPath('ecm/ecm_results_south_to_north.json');

        const [unifiedJsonData, northToSouthData, southToNorthData] = await Promise.all([
          fetchData(unifiedPath),
          fetchData(northToSouthPath),
          fetchData(southToNorthPath),
        ]);

        // Process unified data to include alpha, beta, gamma
        const processedUnifiedData = processUnifiedData(unifiedJsonData);
        setUnifiedData(processedUnifiedData);
        setUnifiedStatus('succeeded');

        // Process directional data to include alpha, beta, gamma
        const processedDirectionalData = {
          northToSouth: processDirectionalData(northToSouthData),
          southToNorth: processDirectionalData(southToNorthData),
        };
        setDirectionalData(processedDirectionalData);
        setDirectionalStatus('succeeded');
      } catch (err) {
        console.error('Error fetching ECM data:', err);
        setUnifiedError(err.message);
        setDirectionalError(err.message);
        setUnifiedStatus('failed');
        setDirectionalStatus('failed');
      } finally {
        fetchInProgress.current = false;
      }
    };

    fetchAllData();
  }, [fetchData, processUnifiedData, processDirectionalData]);

  return {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  };
};

/**
 * Aggregates GeoJSON features by date, regime, and commodity.
 *
 * @param {Array<Object>} features - The GeoJSON features to aggregate.
 * @returns {Array<Object>} - The aggregated data sorted by date, regime, and commodity.
 */
function aggregateDataByDateRegimeCommodity(features) {
  const aggregationMap = {};

  features.forEach((feature) => {
    const properties = feature.properties;
    const dateStr = properties.date;
    const date = new Date(dateStr);
    // Use exchange_rate_regime instead of regime
    const regime = (properties.exchange_rate_regime || '').trim().toLowerCase();
    const commodity = (properties.commodity || '').trim().toLowerCase();

    if (isNaN(date.getTime())) {
      console.warn(`Invalid date encountered: ${dateStr}`);
      return;
    }

    // Skip entries with empty regime or commodity
    if (!regime || !commodity) {
      console.warn('Skipping feature with missing regime or commodity:', properties);
      return;
    }

    const dateKey = date.toISOString().split('T')[0];
    const key = `${dateKey}_${regime}_${commodity}`;

    if (!aggregationMap[key]) {
      aggregationMap[key] = {
        date: dateKey, // Store as ISO string for consistency
        regime: regime,
        commodity: commodity,
        price: 0,
        usdprice: 0,
        conflict_intensity: 0,
        count: 0,
      };
    }

    // Safely parse numeric values with fallback to 0
    const price = parseFloat(properties.price) || 0;
    const usdprice = parseFloat(properties.usdprice) || 0;
    const conflict_intensity = parseFloat(properties.conflict_intensity) || 0;

    aggregationMap[key].price += price;
    aggregationMap[key].usdprice += usdprice;
    aggregationMap[key].conflict_intensity += conflict_intensity;
    aggregationMap[key].count += 1;
  });

  // Calculate averages for regular data
  const aggregatedData = Object.values(aggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
  }));

  // Create unified data
  const unifiedAggregationMap = {};

  aggregatedData.forEach((item) => {
    const key = `${item.date}_${item.commodity}_unified`;

    if (!unifiedAggregationMap[key]) {
      unifiedAggregationMap[key] = {
        date: item.date,
        regime: 'unified',
        commodity: item.commodity,
        price: 0,
        usdprice: 0,
        conflict_intensity: 0,
        count: 0,
      };
    }

    unifiedAggregationMap[key].price += item.price;
    unifiedAggregationMap[key].usdprice += item.usdprice;
    unifiedAggregationMap[key].conflict_intensity += item.conflict_intensity;
    unifiedAggregationMap[key].count += 1;
  });

  // Calculate averages for unified data
  const unifiedData = Object.values(unifiedAggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
  }));

  // Combine and sort all data
  const finalAggregatedData = [...aggregatedData, ...unifiedData].sort((a, b) => {
    // Sort by date first
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;

    // Then by regime
    const regimeCompare = a.regime.localeCompare(b.regime);
    if (regimeCompare !== 0) return regimeCompare;

    // Finally by commodity
    return a.commodity.localeCompare(b.commodity);
  });

  return finalAggregatedData;
}

/**
 * Custom hook to fetch and aggregate unified spatial data.
 *
 * @returns {Object} - Contains aggregated data, loading status, and error.
 */
const useData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  /**
   * Fetches and processes unified GeoJSON data.
   */
  const fetchData = useCallback(async () => {
    try {
      const path = getDataPath('unified_data.geojson');
      console.log('Fetching data from:', path);

      const response = await fetch(path, {
        headers: {
          Accept: 'application/geo+json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const geojsonData = await response.json();
      console.log('GeoJSON data loaded, features count:', geojsonData.features.length);

      if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
        throw new Error("Invalid GeoJSON structure: 'features' array is missing");
      }

      const aggregatedData = aggregateDataByDateRegimeCommodity(geojsonData.features);

      if (aggregatedData.length === 0) {
        throw new Error('No valid data after aggregation');
      }

      // Extract unique values and ensure they're sorted
      const uniqueCommodities = [...new Set(aggregatedData.map((d) => d.commodity))].sort();
      const uniqueRegimes = [...new Set(aggregatedData.map((d) => d.regime))].sort();

      // Find min and max dates
      const dates = aggregatedData.map((d) => new Date(d.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      setData({
        features: aggregatedData,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: {
          min: minDate,
          max: maxDate,
        },
      });

      console.log('Data processed successfully:', {
        featureCount: aggregatedData.length,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: { min: minDate, max: maxDate },
      });
    } catch (err) {
      console.error('Error in useData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * useEffect to fetch data on component mount.
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
};

/**
 * Custom hook to fetch and process regression analysis data.
 * 
 * @param {string} selectedCommodity - The currently selected commodity
 * @returns {Object} - Contains processed regression data, loading state, and error
 */
const useRegressionAnalysis = (selectedCommodity) => {
  const dispatch = useDispatch();
  const regressionData = useSelector(selectRegressionAnalysis) || DEFAULT_REGRESSION_DATA;
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  useEffect(() => {
    if (selectedCommodity && !isValidRegressionData(regressionData)) {
      dispatch(fetchRegressionAnalysis({ selectedCommodity }));
    }
  }, [selectedCommodity, dispatch, regressionData]);

  const getResidualsForRegion = useCallback((regionId) => 
    regressionData.residuals?.byRegion?.[regionId] || [], [regressionData]);

  const getModelFitStatistics = useCallback(() => ({
    r_squared: regressionData.model?.r_squared || 0,
    adj_r_squared: regressionData.model?.adj_r_squared || 0,
    mse: regressionData.model?.mse || 0,
    observations: regressionData.model?.observations || 0
  }), [regressionData]);

  const getSpatialStatistics = useCallback(() => ({
    moran_i: regressionData.spatial?.moran_i || { I: 0, 'p-value': 1 },
    vif: regressionData.spatial?.vif || []
  }), [regressionData]);

  return {
    data: regressionData,
    isLoading,
    error,
    utils: {
      getResidualsForRegion,
      getModelFitStatistics,
      getSpatialStatistics
    }
  };
};

// Add to exports
export {
  useTVMIIData,
  usePriceDifferentialData,
  useECMData,
  useData,
  useRegressionAnalysis,
};
