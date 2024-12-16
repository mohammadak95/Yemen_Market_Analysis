// Merged dataHooks.js

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchAllSpatialData, 
  fetchFlowData,
  selectSpatialData,
  selectFlowData,
  selectLoadingStatus as selectSpatialLoadingStatus,
  selectError as selectSpatialError,
  selectRegressionAnalysis,
  selectModelStats,
  selectSpatialStats
} from '../slices/spatialSlice';
import {
  fetchECMData,
  selectUnifiedData,
  selectDirectionalData,
  selectLoadingStatus,
  selectError,
  selectECMMetrics,
  setSelectedCommodity
} from '../slices/ecmSlice';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { getDataPath, enhancedFetchJson } from '../utils/dataUtils';
import { dataCache } from '../utils/dataCache';

export const useSpatialData = () => {
  const dispatch = useDispatch();
  const data = useSelector(selectSpatialData);
  const flowData = useSelector(selectFlowData);
  const loading = useSelector(selectSpatialLoadingStatus);
  const error = useSelector(selectSpatialError);
 
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

export const usePrecomputedData = (commodity, date, options = {}) => {
  const dispatch = useDispatch();
  const abortControllerRef = useRef(null);
  const loadingMetricRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!commodity || !date) return;

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Start loading metric
    loadingMetricRef.current = backgroundMonitor.startMetric('data-load', {
      commodity,
      date
    });

    try {
      // Check cache first
      const cachedData = dataCache.get(commodity, date);
      if (cachedData) {
        dispatch({ type: 'data/loaded', payload: cachedData });
        loadingMetricRef.current?.finish({ status: 'cache-hit' });
        return;
      }

      // Load essential data first
      const essentialData = await loadEssentialData(commodity, date, 
        abortControllerRef.current.signal);
      dispatch({ type: 'data/essentialLoaded', payload: essentialData });

      // Load visualization and analysis data in parallel
      const [visualData, analysisData] = await Promise.all([
        loadVisualizationData(commodity, date, abortControllerRef.current.signal),
        loadAnalysisData(commodity, date, abortControllerRef.current.signal)
      ]);

      dispatch({ 
        type: 'data/loaded', 
        payload: { ...essentialData, ...visualData, ...analysisData }
      });

      // Cache the complete data
      dataCache.set(commodity, date, {
        ...essentialData,
        ...visualData,
        ...analysisData
      });

      loadingMetricRef.current?.finish({ status: 'success' });

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Data loading failed:', error);
        loadingMetricRef.current?.finish({ 
          status: 'error',
          error: error.message 
        });
      }
    }
  }, [commodity, date, dispatch]);

  useEffect(() => {
    loadData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);
};


export const useTVMIIData = () => {
  const [tvmiiData, setTvmiiData] = useState(null);
  const [marketPairsData, setMarketPairsData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

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
  const [data, setData] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const processPriceDifferentialData = useCallback((jsonData, commodity) => {
    const marketsData = jsonData.markets || {};
    const results = [];

    for (const baseMarket in marketsData) {
      const commodityResults = marketsData[baseMarket].commodity_results || {};
      const marketCommodityResults = commodityResults[commodity];

      if (marketCommodityResults) {
        marketCommodityResults.forEach((result) => {
          // Include only necessary fields or all fields as needed
          results.push(result);
        });
      }
    }

    return results;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const path = getDataPath('price_diff_results/price_differential_results.json');
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const jsonData = await response.json();

        // Collect commodities
        const commoditiesSet = new Set();
        Object.values(jsonData.markets || {}).forEach((marketData) => {
          const commodityResults = marketData.commodity_results || {};
          Object.keys(commodityResults).forEach((commodity) => {
            commoditiesSet.add(commodity);
          });
        });
        setCommodities(Array.from(commoditiesSet));

        // Process data for selected commodity
        if (selectedCommodity) {
          const results = processPriceDifferentialData(jsonData, selectedCommodity);
          setData(results);

          // Collect markets involved
          const marketsSet = new Set();
          results.forEach((result) => {
            marketsSet.add(result.base_market);
            marketsSet.add(result.other_market);
          });
          setMarkets(Array.from(marketsSet));
        } else {
          setData([]);
          setMarkets([]);
        }

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

export const useECMData = (selectedCommodity) => {
  const dispatch = useDispatch();
  const unifiedData = useSelector(selectUnifiedData);
  const directionalData = useSelector(selectDirectionalData);
  const loading = useSelector(selectLoadingStatus);
  const error = useSelector(selectError);
  const metrics = useSelector(selectECMMetrics);

  const fetchInProgress = useRef(false);
  const initialFetch = useRef(false);

  // Set selected commodity in Redux state
  useEffect(() => {
    if (selectedCommodity) {
      dispatch(setSelectedCommodity(selectedCommodity));
    }
  }, [selectedCommodity, dispatch]);

  // Handle initial data fetch
  useEffect(() => {
    if (fetchInProgress.current || initialFetch.current || !selectedCommodity) return;

    const fetchAllData = async () => {
      fetchInProgress.current = true;
      try {
        await dispatch(fetchECMData({ commodity: selectedCommodity })).unwrap();
        initialFetch.current = true;
      } catch (err) {
        console.error('Error fetching ECM data:', err);
      } finally {
        fetchInProgress.current = false;
      }
    };

    fetchAllData();
  }, [dispatch, selectedCommodity]);

  // Filter and process data
  const filteredData = useMemo(() => {
    if (!selectedCommodity) return null;

    const commodityLower = selectedCommodity.toLowerCase();

    const unifiedFiltered = unifiedData.filter(item => 
      item.commodity?.toLowerCase() === commodityLower
    );

    const northToSouthFiltered = directionalData.northToSouth.filter(item => 
      item.commodity?.toLowerCase() === commodityLower
    );

    const southToNorthFiltered = directionalData.southToNorth.filter(item => 
      item.commodity?.toLowerCase() === commodityLower
    );

    return {
      unified: unifiedFiltered[0] || null,
      directional: {
        northToSouth: northToSouthFiltered[0] || null,
        southToNorth: southToNorthFiltered[0] || null
      }
    };
  }, [selectedCommodity, unifiedData, directionalData]);

  const loadingStatus = !initialFetch.current ? 'idle' : loading ? 'loading' : error ? 'failed' : 'succeeded';

  return {
    // Return single matching records instead of arrays
    unifiedData: filteredData?.unified || null,
    unifiedStatus: loadingStatus,
    unifiedError: error,
    directionalData: filteredData?.directional || { northToSouth: null, southToNorth: null },
    directionalStatus: loadingStatus,
    directionalError: error,
    metrics: selectedCommodity ? metrics : null,
    isLoading: loading,
    isInitialized: initialFetch.current
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
