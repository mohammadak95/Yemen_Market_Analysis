// src/components/analysis/spatial-analysis/components/autocorrelation/MoranScatterPlot.js

import React, { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import chroma from 'chroma-js';
import {
  selectTimeSeriesData,
  selectSpatialAutocorrelation,
  selectGeometryData,
} from '../../../../../selectors/optimizedSelectors';
import { calculateSpatialLag } from '../../utils/spatialAnalysis';
import { createWeightsMatrix } from '../../utils/spatialUtils';
import { normalizeCoordinates } from '../../utils/coordinateHandler';

const MoranScatterPlot = React.memo(() => {
  const theme = useTheme();
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const moranResults = useSelector(selectSpatialAutocorrelation);
  const geometryData = useSelector(selectGeometryData);

  // Generate dynamic color scale using chroma.js
  const clusterColors = useMemo(() => ({
    'high-high': chroma.scale(['#fdd49e', '#d7301f'])(0.8).hex(),
    'low-low': chroma.scale(['#a6bddb', '#045a8d'])(0.8).hex(),
    'high-low': chroma.scale(['#fed976', '#fd8d3c'])(0.8).hex(),
    'low-high': chroma.scale(['#c7e9b4', '#31a354'])(0.8).hex(),
    'not-significant': '#dddddd',
  }), []);

  const scatterData = useMemo(() => {
    if (!timeSeriesData?.length || !moranResults || !geometryData?.unified) return [];

    const unifiedGeoJSON = geometryData.unified;

    // Ensure consistent properties in GeoJSON features
    const featuresWithDefaults = unifiedGeoJSON.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        population: feature.properties.population || 0,
        data: feature.properties.data || {},
        // Use 'normalizedName' instead of 'region_id'
        center: normalizeCoordinates(feature, feature.properties.normalizedName) || null,
      }
    }));

    const updatedGeoJSON = { ...unifiedGeoJSON, features: featuresWithDefaults };

    // Create weights matrix
    const weights = createWeightsMatrix(updatedGeoJSON);

    // Calculate standardized prices
    const prices = timeSeriesData.map(d => d.usdPrice);
    const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdPrice = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p - meanPrice, 2), 0) / prices.length
    );
    const standardizedPrices = prices.map(p => (p - meanPrice) / stdPrice);

    // Calculate spatial lags using the weights matrix
    const spatialLags = calculateSpatialLag(timeSeriesData, weights);
    const meanLag = spatialLags.reduce((a, b) => a + b, 0) / spatialLags.length;
    const stdLag = Math.sqrt(
      spatialLags.reduce((sum, l) => sum + Math.pow(l - meanLag, 2), 0) / spatialLags.length
    );
    const standardizedLags = spatialLags.map(l => (l - meanLag) / stdLag);

    // Create scatter plot data
    return timeSeriesData.map((d, i) => ({
      name: d.region,
      x: standardizedPrices[i],
      y: standardizedLags[i],
      // Use 'normalizedName' to match the keys in moranResults.local
      cluster: moranResults.local[d.normalizedName]?.cluster_type || 'not-significant',
      price: d.usdPrice,
      spatialLag: spatialLags[i],
      significance: moranResults.local[d.normalizedName]?.['p-value'] < 0.05,
    }));
  }, [timeSeriesData, moranResults, geometryData]);

  const quadrantLabels = useMemo(() => ({
    'high-high': 'Q1: High-High (Market Hotspots)',
    'low-low': 'Q3: Low-Low (Market Cold Spots)',
    'high-low': 'Q4: High-Low (Market Outliers)',
    'low-high': 'Q2: Low-High (Market Outliers)',
  }), []);

  const CustomTooltip = useCallback(({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const point = payload[0].payload;
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 1,
          boxShadow: theme.shadows[2],
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          <strong>{point.name}</strong>
        </Typography>
        <Typography variant="body2">
          Price: ${point.price.toFixed(2)}
        </Typography>
        <Typography variant="body2">
          Spatial Lag: ${point.spatialLag.toFixed(2)}
        </Typography>
        <Typography variant="body2">
          Pattern: {quadrantLabels[point.cluster] || 'Not Significant'}
        </Typography>
        {point.significance && (
          <Typography variant="body2" color="primary">
            Statistically Significant
          </Typography>
        )}
      </Box>
    );
  }, [theme, quadrantLabels]);

  const renderQuadrantLabels = useCallback(() => {
    if (!scatterData.length) return null;

    return (
      <>
        <text
          x="75%"
          y="10%"
          textAnchor="middle"
          fill={theme.palette.text.secondary}
        >
          {quadrantLabels['high-low']}
        </text>
        <text
          x="25%"
          y="10%"
          textAnchor="middle"
          fill={theme.palette.text.secondary}
        >
          {quadrantLabels['high-high']}
        </text>
        <text
          x="25%"
          y="90%"
          textAnchor="middle"
          fill={theme.palette.text.secondary}
        >
          {quadrantLabels['low-low']}
        </text>
        <text
          x="75%"
          y="90%"
          textAnchor="middle"
          fill={theme.palette.text.secondary}
        >
          {quadrantLabels['low-high']}
        </text>
      </>
    );
  }, [scatterData, quadrantLabels, theme.palette.text.secondary]);

  const interpretMoranScatter = useCallback((moranI, dataPoints) => {
    const significantPoints = dataPoints.filter(d => d.significance);
    const hotspots = significantPoints.filter(d => d.cluster === 'high-high').length;
    const coldspots = significantPoints.filter(d => d.cluster === 'low-low').length;
    const outliers = significantPoints.filter(
      d => d.cluster === 'high-low' || d.cluster === 'low-high'
    ).length;

    if (moranI > 0.3) {
      return `Strong spatial clustering is observed with ${hotspots} price hotspots and ${coldspots} cold spots, indicating distinct market regions.`;
    } else if (moranI > 0) {
      return `Moderate spatial patterns show ${hotspots + coldspots} clustered markets and ${outliers} outliers, suggesting partial market integration.`;
    } else if (moranI > -0.3) {
      return `Weak spatial patterns with ${outliers} market outliers indicate limited price transmission between regions.`;
    }
    return `Strong negative spatial patterns suggest market fragmentation with ${outliers} distinct price outliers.`;
  }, []);

  if (!scatterData.length || !moranResults) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography variant="body1" color="text.secondary">
          Insufficient data for Moran's I analysis
        </Typography>
      </Paper>
    );
  }

  const moranI = moranResults.global?.moran_i || 0;
  const interpretation = interpretMoranScatter(moranI, scatterData);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Moran Scatter Plot
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Standardized Price" 
            label={{ value: 'Standardized Price', position: 'insideBottomRight', offset: -10 }} 
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Standardized Spatial Lag" 
            label={{ value: 'Standardized Spatial Lag', angle: -90, position: 'insideLeft', offset: 10 }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} y={0} stroke={theme.palette.text.secondary} />
          <Scatter 
            name="Regions" 
            data={scatterData} 
            fill="#8884d8" 
            shape="circle"
          >
            {scatterData.map((entry, index) => (
              <circle
                key={`circle-${index}`}
                cx={0}
                cy={0}
                r={5}
                fill={clusterColors[entry.cluster] || '#8884d8'}
                stroke={entry.significance ? '#000' : 'none'}
                strokeWidth={entry.significance ? 1 : 0}
              />
            ))}
          </Scatter>
          {renderQuadrantLabels()}
        </ScatterChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1">
          {interpretation}
        </Typography>
      </Box>
    </Paper>
  );
});

export default MoranScatterPlot;