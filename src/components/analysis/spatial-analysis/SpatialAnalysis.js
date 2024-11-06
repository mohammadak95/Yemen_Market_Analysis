// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateLoadingProgress } from '../../../slices/spatialSlice';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Box, Alert, AlertTitle } from '@mui/material';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';
import { useSpatialData } from '../../../context/SpatialDataContext';

const SpatialAnalysis = ({ selectedCommodity }) => {
  const dispatch = useDispatch();
  const { loadingProgress } = useSelector(state => state.spatial);
  const { loading, error, data, fetchSpatialData } = useSpatialData();

  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    if (!selectedCommodity) return;

    const loadData = async () => {
      dispatch(updateLoadingProgress(10));
      await fetchSpatialData(selectedCommodity);
      dispatch(updateLoadingProgress(100));
    };

    loadData();

    return () => {
      dispatch(updateLoadingProgress(0));
    };
  }, [selectedCommodity, fetchSpatialData, dispatch]);

  useEffect(() => {
    // Set initial selected month when data is loaded
    if (data && data.uniqueMonths?.length > 0) {
      setSelectedMonth(data.uniqueMonths[data.uniqueMonths.length - 1]);
    }
  }, [data]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error Loading Data</AlertTitle>
        {error || 'An unexpected error occurred while loading spatial data.'}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <AlertTitle>No Data Available</AlertTitle>
        Please select a commodity to view spatial analysis.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ p: 2, mt: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <h2>Spatial Analysis: {selectedCommodity}</h2>

        {/* Map Section */}
        <Box sx={{ height: 500, mb: 3 }}>
          <SpatialMap
            geoData={data.geoData}
            flowData={data.flowMaps}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={data.uniqueMonths}
            spatialWeights={data.spatialWeights}
          />
        </Box>

        {/* Analysis Results */}
        {data.analysisResults && (
          <>
            <SpatialDiagnostics 
              data={data.analysisResults} 
              selectedMonth={selectedMonth} 
            />
            <DynamicInterpretation
              data={data.analysisResults}
              spatialWeights={data.spatialWeights}
              selectedMonth={selectedMonth}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default SpatialAnalysis;