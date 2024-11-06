import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { fetchSpatialData, updateLoadingProgress } from '../../../slices/spatialSlice';
import useSpatialData from '../../../hooks/useSpatialData';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Box, Alert, AlertTitle } from '@mui/material';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';

const SpatialAnalysis = ({ selectedCommodity }) => {
  const dispatch = useDispatch();
  const { 
    geoData, 
    analysis, 
    flows, 
    weights, 
    uniqueMonths, 
    status, 
    error, 
    loadingProgress 
  } = useSpatialData(selectedCommodity);

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showFlows, setShowFlows] = useState(true);

  useEffect(() => {
    if (uniqueMonths?.length > 0) {
      setSelectedMonth(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths]);

  useEffect(() => {
    if (selectedCommodity) {
      dispatch(updateLoadingProgress(0));
      dispatch(fetchSpatialData());
    }
  }, [dispatch, selectedCommodity]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error Loading Data</AlertTitle>
        {error || 'An unexpected error occurred while loading spatial data.'}
      </Alert>
    );
  }

  if (!geoData) {
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
        
        <Box sx={{ height: 500, mb: 3 }}>
          <SpatialMap
            geoData={geoData}
            flowMaps={flows}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={uniqueMonths}
            spatialWeights={weights}
            showFlows={showFlows}
            onToggleFlows={() => setShowFlows(prev => !prev)}
            analysisResults={analysis}
            selectedCommodity={selectedCommodity}
          />
        </Box>

        {analysis && (
          <>
            <SpatialDiagnostics 
              data={analysis} 
              selectedMonth={selectedMonth} 
            />
            <DynamicInterpretation
              data={analysis}
              spatialWeights={weights}
              selectedMonth={selectedMonth}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default SpatialAnalysis;