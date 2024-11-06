// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // Added useSelector
import { updateLoadingProgress } from '../../../slices/spatialSlice';
import { useSpatialDataService } from '../../../services/spatialDataService';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Box, Alert, AlertTitle } from '@mui/material';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';

const SpatialAnalysis = ({ selectedCommodity }) => {
  const spatialService = useSpatialDataService();
  const dispatch = useDispatch();
  
  // Get loading progress from Redux state
  const loadingProgress = useSelector(state => state.spatial.loadingProgress);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!selectedCommodity) return;

      try {
        setLoading(true);
        setError(null);
        dispatch(updateLoadingProgress(50));

        const processedData = await spatialService.processSpatialData(selectedCommodity);
        
        if (mounted) {
          setData(processedData);
          // Set initial selected month to the latest month
          if (processedData.uniqueMonths?.length > 0) {
            setSelectedMonth(processedData.uniqueMonths[processedData.uniqueMonths.length - 1]);
          }
          dispatch(updateLoadingProgress(100));
        }
      } catch (error) {
        if (mounted) {
          setError(error);
          dispatch(updateLoadingProgress(0));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [selectedCommodity, spatialService, dispatch]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error"
        sx={{ mt: 2 }}
      >
        <AlertTitle>Error Loading Data</AlertTitle>
        {error.message || 'An unexpected error occurred while loading spatial data.'}
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
