// src/components/analysis/spatial-analysis/components/autocorrelation/SpatialAutocorrelationAnalysis.js

import React, { useMemo } from 'react';
import { Grid, Paper, Typography, Box, Alert, Stack } from '@mui/material';
import PropTypes from 'prop-types';
import { interpretMoranResults } from '../../utils/spatialAutocorrelationUtils';
import { LISAMap } from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';
import MetricCard from '../common/MetricCard';

const SpatialAutocorrelationAnalysis = ({ spatialData, geometryData }) => {
  // Process and validate spatial autocorrelation data
  const processedData = useMemo(() => {
    if (!spatialData?.spatialAutocorrelation) {
      return null;
    }

    const { global, local } = spatialData.spatialAutocorrelation;

    // Calculate cluster statistics without relying on p-values
    const stats = Object.values(local || {}).reduce((acc, region) => {
      const clusterType = region.cluster_type || 'not-significant';
      acc[clusterType] = (acc[clusterType] || 0) + 1;
      return acc;
    }, {});

    // Calculate pattern statistics
    const patternStats = {
      highHigh: stats['high-high'] || 0,
      lowLow: stats['low-low'] || 0,
      highLow: stats['high-low'] || 0,
      lowHigh: stats['low-high'] || 0,
      notSignificant: stats['not-significant'] || 0,
      total: Object.values(stats).reduce((sum, count) => sum + count, 0)
    };

    return {
      global: {
        moran_i: global?.moran_i ?? 0,
        p_value: global?.p_value ?? null,
        z_score: global?.z_score ?? null
      },
      local,
      stats: patternStats,
      geometry: geometryData?.unified,
      timeSeriesData: spatialData.timeSeriesData
    };
  }, [spatialData, geometryData]);

  if (!processedData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="subtitle1">
          Spatial Autocorrelation Analysis Unavailable
        </Typography>
        <Typography variant="body2">
          Required spatial analysis data is missing or invalid
        </Typography>
      </Alert>
    );
  }

  const { global, stats } = processedData;
  const interpretation = interpretMoranResults(global, stats);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Header Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Spatial Price Autocorrelation Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {interpretation}
            </Typography>
          </Paper>
        </Grid>

        {/* Main Content Section */}
        <Grid item xs={12} container spacing={2}>
          {/* Left Column - Metrics */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <MetricCard
                    title="Global Moran's I"
                    value={global.moran_i}
                    format="number"
                    description="Measure of overall spatial autocorrelation"
                    sx={{ height: 'auto' }}
                  />
                  <MetricCard
                    title="High-Price Clusters"
                    value={stats.highHigh}
                    format="integer"
                    description="Number of high-price clusters"
                    sx={{ height: 'auto' }}
                  />
                  <MetricCard
                    title="Low-Price Clusters"
                    value={stats.lowLow}
                    format="integer"
                    description="Number of low-price clusters"
                    sx={{ height: 'auto' }}
                  />
                  <MetricCard
                    title="Pattern Coverage"
                    value={stats.total > 0 ? 
                      ((stats.highHigh + stats.lowLow + stats.highLow + stats.lowHigh) / stats.total) * 100 : 0}
                    format="percentage"
                    description="Regions with spatial patterns"
                    sx={{ height: 'auto' }}
                  />
                </Stack>
              </Paper>

              {/* Analysis Notes */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Analysis Notes
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    • Global Moran's I: -1 (dispersion) to +1 (clustering)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • High-High: High prices near high prices
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Low-Low: Low prices near low prices
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Outliers: Price disparities between neighbors
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          {/* Right Column - Map */}
          <Grid item xs={12} md={8}>
            {processedData.geometry?.features ? (
              <Paper sx={{ p: 2, height: '100%' }}>
                <LISAMap 
                  localMorans={processedData.local}
                  geometry={processedData.geometry}
                />
              </Paper>
            ) : (
              <Alert severity="warning">
                <Typography variant="subtitle1">
                  Unable to display LISA map
                </Typography>
                <Typography variant="body2">
                  Geometry data is not properly formatted
                </Typography>
              </Alert>
            )}
          </Grid>
        </Grid>

        {/* Bottom Section - Scatter Plot */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <MoranScatterPlot 
              data={spatialData.spatialAutocorrelation}
              timeSeriesData={spatialData.timeSeriesData}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

SpatialAutocorrelationAnalysis.propTypes = {
  spatialData: PropTypes.shape({
    spatialAutocorrelation: PropTypes.shape({
      global: PropTypes.shape({
        moran_i: PropTypes.number,
        p_value: PropTypes.number,
        z_score: PropTypes.number
      }),
      local: PropTypes.object
    }),
    timeSeriesData: PropTypes.array
  }),
  geometryData: PropTypes.shape({
    unified: PropTypes.object,
    points: PropTypes.array,
    polygons: PropTypes.array
  })
};

export default SpatialAutocorrelationAnalysis;
