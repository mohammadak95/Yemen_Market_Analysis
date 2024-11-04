// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSpatialData } from '../../../slices/spatialSlice';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Box, Paper, Typography, Alert, Button, Tabs, Tab } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import SpatialErrorBoundary from './SpatialErrorBoundary';

const SpatialAnalysis = ({ selectedCommodity }) => {
  const dispatch = useDispatch();
  const {
    geoData,
    analysisResults,
    flowMaps,
    spatialWeights,
    status,
    error,
    loadingProgress,
    uniqueMonths,
  } = useSelector((state) => state.spatial);

  const [currentTab, setCurrentTab] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    if (selectedCommodity) {
      dispatch(fetchSpatialData(selectedCommodity));
    }
  }, [dispatch, selectedCommodity]);

  useEffect(() => {
    if (uniqueMonths?.length > 0) {
      setSelectedMonth(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths]);

  const analysisData = useMemo(() => {
    if (!analysisResults) return null;
    return analysisResults.find(
      (result) =>
        result.commodity?.toLowerCase() === selectedCommodity?.toLowerCase() &&
        result.regime === 'unified'
    );
  }, [analysisResults, selectedCommodity]);

  const currentFlowData = useMemo(() => {
    if (!flowMaps || !selectedMonth) return [];
    return flowMaps.filter((flow) => {
      const flowDate = new Date(flow.date).toISOString().split('T')[0];
      const selectedDate = new Date(selectedMonth).toISOString().split('T')[0];
      return flowDate === selectedDate;
    });
  }, [flowMaps, selectedMonth]);

  const currentGeoData = useMemo(() => {
    if (!geoData || !selectedMonth || !analysisData) return null;

    const residualsByRegion = analysisData.residual.reduce((acc, res) => {
      const resDate = new Date(res.date).toISOString().split('T')[0];
      if (resDate === new Date(selectedMonth).toISOString().split('T')[0]) {
        acc[res.region_id] = res.residual;
      }
      return acc;
    }, {});

    return {
      ...geoData,
      features: geoData.features.map((feature) => {
        const regionId = feature.properties.region_id;
        const residual = residualsByRegion[regionId] || null;
        const price = residual != null ? residual + analysisData.intercept : null;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            residual,
            price,
          },
        };
      }),
    };
  }, [geoData, selectedMonth, analysisData]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshCw size={16} />}
            onClick={() => dispatch(fetchSpatialData(selectedCommodity))}
          >
            Retry
          </Button>
        }
      >
        <Typography variant="subtitle1">Error Loading Data</Typography>
        <Typography variant="body2">{error?.message || 'Failed to load spatial data.'}</Typography>
      </Alert>
    );
  }

  return (
    <SpatialErrorBoundary onRetry={() => dispatch(fetchSpatialData(selectedCommodity))}>
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h5" gutterBottom>
            Spatial Analysis: {selectedCommodity}
          </Typography>

          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ mb: 2 }}
          >
            <Tab label="Price Distribution" />
            <Tab label="Residuals" />
            <Tab label="Flow Network" />
          </Tabs>

          {currentGeoData && (
            <Box sx={{ height: 500, mb: 3 }}>
              <SpatialMap
                geoData={currentGeoData}
                flowData={currentTab === 2 ? currentFlowData : []}
                variable={currentTab === 1 ? 'residual' : 'price'}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={uniqueMonths}
                spatialWeights={spatialWeights}
                showFlows={currentTab === 2}
              />
            </Box>
          )}

          {analysisData && (
            <>
              <SpatialDiagnostics data={analysisData} selectedMonth={selectedMonth} />
              <DynamicInterpretation
                data={analysisData}
                spatialWeights={spatialWeights}
                selectedMonth={selectedMonth}
              />
            </>
          )}
        </Paper>
      </Box>
    </SpatialErrorBoundary>
  );
};

export default SpatialAnalysis;
