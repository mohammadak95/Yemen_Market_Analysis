// Merged dataHooks.js

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchAllSpatialData, 
  fetchFlowData,
  selectSpatialData,
  selectFlowData,
  selectLoadingStatus,
  selectError,  // Now properly exported
  selectRegressionAnalysis, // Add this for useRegressionAnalysis
  selectModelStats,
  selectSpatialStats
} from '../slices/spatialSlice';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';
import { backgroundMonitor } from '../utils/backgroundMonitor';

export const useSpatialData = () => {
  const dispatch = useDispatch();
  const data = useSelector(selectSpatialData);
  const flowData = useSelector(selectFlowData);
  const loading = useSelector(selectLoadingStatus);
  const error = useSelector(selectError);
 
  const fetchData = useCallback(async (commodity, date) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    try {
      await Promise.all([
        dispatch(fetchAllSpatialData({ commodity, date })),
        dispatch(fetchFlowData({ commodity, date }))
      ]);
      metric.finish({ status: 'success' });
    } catch (err) {
      metric.finish({ status: 'error', error: err.message });
      console.error('Error fetching spatial data:', err);
    }
  }, [dispatch]);
 
  return { data, flowData, loading, error, fetchData };
 };
 
 export const usePrecomputedData = (commodity, date) => {
  const dispatch = useDispatch();
  const data = useSelector(selectSpatialData);
  const loading = useSelector(selectLoadingStatus);
  const error = useSelector(selectError);
  
  useEffect(() => {
    if (commodity) {
      dispatch(fetchAllSpatialData({ commodity, date }));
    }
  }, [commodity, date, dispatch]);
 
  return { data, loading, error };
 };

export const useTVMIIData = () => {
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

export const usePriceDifferentialData = (selectedCommodity) => {
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

export const useECMData = () => {
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

export const useData = () => {
  const spatialData = useSpatialData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await spatialData.fetchData();
        setLoading(false);
      } catch (err) {
        console.error('Error in useData:', err);
        setError(err.message);
        setLoading(false);
      }
    };
 
    fetchData();
  }, [spatialData]);
 
  return { 
    data: spatialData.data, 
    loading: loading || spatialData.loading, 
    error: error || spatialData.error 
  };
 };

 export const useRegressionAnalysis = (selectedCommodity) => {
  const dispatch = useDispatch();
  const regressionData = useSelector(state => state.spatial.data.regressionAnalysis) || DEFAULT_REGRESSION_DATA;
  const isLoading = useSelector(state => state.spatial.status.regressionLoading);
  const error = useSelector(state => state.spatial.status.regressionError);
 
  useEffect(() => {
    if (selectedCommodity) {
      dispatch(fetchAllSpatialData({ 
        commodity: selectedCommodity, 
        regressionOnly: true 
      }));
    }
  }, [selectedCommodity, dispatch]);
 
  const getResidualsForRegion = useCallback((regionId) => 
    regressionData.residuals?.byRegion?.[regionId] || [], 
    [regressionData]
  );
 
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

