// src/components/analysis/spatial-analysis/components/autocorrelation/SpatialAutocorrelationAnalysis.js

import React, { useMemo } from 'react';
import { Grid, Paper, Typography, Box, Alert } from '@mui/material';
import PropTypes from 'prop-types';
import { interpretMoranResults } from '../../utils/spatialAutocorrelationUtils';
import { LISAMap } from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';
import MetricCard from '../common/MetricCard';

const SpatialAutocorrelationAnalysis = ({ spatialData, geometryData }) => {
  // Debug log to verify data
  console.log('SpatialAutocorrelationAnalysis received:', { 
    spatialData, 
    geometryData,
    hasUnified: Boolean(geometryData?.unified)
  });

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
      geometry: geometryData?.unified, // Use the unified geometry
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

  // Debug log for LISA map data
  console.log('Preparing LISA map data:', {
    localMorans: processedData.local,
    geometry: processedData.geometry,
    hasFeatures: processedData.geometry?.features?.length > 0
  });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Spatial Price Autocorrelation Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {interpretation}
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <MetricCard
          title="Global Moran's I"
          value={global.moran_i}
          format="number"
          description="Measure of overall spatial autocorrelation"
        />
        <MetricCard
          title="High-Price Clusters"
          value={stats.highHigh}
          format="integer"
          description="Number of high-price clusters"
        />
        <MetricCard
          title="Low-Price Clusters"
          value={stats.lowLow}
          format="integer"
          description="Number of low-price clusters"
        />
        <MetricCard
          title="Spatial Pattern Coverage"
          value={stats.total > 0 ? 
            ((stats.highHigh + stats.lowLow + stats.highLow + stats.lowHigh) / stats.total) * 100 : 0}
          format="percentage"
          description="Percentage of regions showing spatial patterns"
        />
      </Grid>

      <Grid item xs={12} md={8}>
        {processedData.geometry?.features ? (
          <LISAMap 
            localMorans={processedData.local}
            geometry={processedData.geometry}
          />
        ) : (
          <Alert severity="warning" sx={{ m: 2 }}>
            <Typography variant="subtitle1">
              Unable to display LISA map
            </Typography>
            <Typography variant="body2">
              Geometry data is not properly formatted
            </Typography>
          </Alert>
        )}
      </Grid>

      <Grid item xs={12}>
        <MoranScatterPlot 
          data={spatialData.spatialAutocorrelation}
          timeSeriesData={spatialData.timeSeriesData}
        />
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Analysis Notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Global Moran's I ranges from -1 (perfect dispersion) to +1 (perfect clustering)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • High-High clusters indicate areas with high prices surrounded by other high-price areas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Low-Low clusters show areas with low prices surrounded by other low-price areas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Outliers (High-Low or Low-High) indicate price disparities between neighboring regions
          </Typography>
        </Paper>
      </Grid>
    </Grid>
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
