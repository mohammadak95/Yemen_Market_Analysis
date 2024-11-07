// src/hooks/useSpatialData.js

import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchSpatialData,
  selectSpatialData,
  selectAnalysisData,
  selectFlowsForPeriod
} from '../slices/spatialSlice';

export const useSpatialData = (selectedCommodity, selectedDate) => {
  const dispatch = useDispatch();
  const spatialData = useSelector(selectSpatialData);
  const analysisData = useSelector(state => selectAnalysisData(state, selectedCommodity));
  const flowsData = useSelector(state => selectFlowsForPeriod(state, selectedDate));
  
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized && selectedCommodity) {
      dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))
        .then(() => setIsInitialized(true))
        .catch(error => console.error('Error initializing spatial data:', error));
    }
  }, [dispatch, selectedCommodity, selectedDate, isInitialized]);

  const refreshData = useCallback(() => {
    if (selectedCommodity) {
      return dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
    }
    return Promise.reject(new Error('No commodity selected'));
  }, [dispatch, selectedCommodity, selectedDate]);

  const filterDataByDate = useCallback((date) => {
    if (!spatialData.geoData) return null;

    return {
      ...spatialData,
      geoData: {
        ...spatialData.geoData,
        features: spatialData.geoData.features.filter(
          feature => feature.properties.date?.startsWith(date)
        )
      },
      flows: spatialData.flows.filter(
        flow => flow.date === date
      )
    };
  }, [spatialData]);

  const getRegionData = useCallback((regionId) => {
    if (!spatialData.geoData) return null;

    const features = spatialData.geoData.features.filter(
      feature => feature.properties.region_id === regionId ||
                 feature.properties.region === regionId
    );

    const flows = spatialData.flows.filter(
      flow => flow.source === regionId || flow.target === regionId
    );

    return {
      features,
      flows,
      weights: spatialData.weights[regionId]
    };
  }, [spatialData]);

  return {
    ...spatialData,
    analysisData,
    flowsData,
    isInitialized,
    refreshData,
    filterDataByDate,
    getRegionData
  };
};

// Add default export
export default useSpatialData;