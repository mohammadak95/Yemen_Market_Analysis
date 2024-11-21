// src/components/analysis/spatial-analysis/components/seasonal/SeasonalPriceMap.js

import React, { useMemo, useState } from 'react';
import { 
  Paper, Box, Typography, Grid, Card, CardContent,
  ToggleButtonGroup, ToggleButton, Slider 
} from '@mui/material';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Tooltip as RechartsTooltip 
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';
import SeasonalLegend from './SeasonalLegend';
import { useSeasonalAnalysis } from '../../hooks/useSeasonalAnalysis';

const SeasonalPriceMap = ({ seasonalAnalysis, geometry, timeSeriesData }) => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [seasonalityThreshold, setSeasonalityThreshold] = useState(0.1);

  const { 
    seasonalPatterns,
    regionalPatterns,
    seasonalStrength,
    monthlyAverages
  } = useSeasonalAnalysis(seasonalAnalysis, timeSeriesData);

  const colorScale = useMemo(() => 
    scaleSequential(interpolateRdYlBu)
      .domain([-1, 1])
  , []);

  const mapData = useMemo(() => {
    if (!geometry || !regionalPatterns) return null;

    return {
      ...geometry,
      features: geometry.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          seasonalEffect: regionalPatterns[feature.properties.region_id]?.[selectedMonth] || 0,
          seasonalStrength: seasonalStrength[feature.properties.region_id] || 0
        }
      }))
    };
  }, [geometry, regionalPatterns, seasonalStrength, selectedMonth]);

  const getFeatureStyle = (feature) => {
    const effect = feature.properties.seasonalEffect;
    const strength = feature.properties.seasonalStrength;

    return {
      fillColor: strength > seasonalityThreshold ? colorScale(effect) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Seasonal Price Patterns
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>
              Month Selection
            </Typography>
            <ToggleButtonGroup
              value={selectedMonth}
              exclusive
              onChange={(_, value) => value !== null && setSelectedMonth(value)}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                .map((month, index) => (
                  <ToggleButton key={month} value={index}>
                    {month}
                  </ToggleButton>
                ))}
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>
              Seasonality Threshold
            </Typography>
            <Slider
              value={seasonalityThreshold}
              onChange={(_, value) => setSeasonalityThreshold(value)}
              min={0}
              max={0.5}
              step={0.01}
              valueLabelDisplay="auto"
              valueLabelFormat={x => `${(x * 100).toFixed(0)}%`}
            />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Box sx={{ height: 500, width: '100%' }}>
            <MapContainer
              center={[15.3694, 44.191]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {mapData && (
                <GeoJSON
                  data={mapData}
                  style={getFeatureStyle}
                  onEachFeature={(feature, layer) => {
                    const effect = feature.properties.seasonalEffect;
                    const strength = feature.properties.seasonalStrength;
                    
                    layer.bindTooltip(`
                      <strong>${feature.properties.region_id}</strong><br/>
                      Seasonal Effect: ${(effect * 100).toFixed(1)}%<br/>
                      Seasonal Strength: ${(strength * 100).toFixed(1)}%
                    `);
                  }}
                />
              )}
            </MapContainer>
          </Box>
          <SeasonalLegend colorScale={colorScale} />
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Seasonal Pattern
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={monthlyAverages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(_, i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Price Effect (%)', 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="effect"
                      stroke={theme.palette.primary.main}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Peak Month: {seasonalAnalysis.peak_month}<br/>
                Trough Month: {seasonalAnalysis.trough_month}<br/>
                Overall Seasonal Strength: {(seasonalAnalysis.seasonal_strength * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SeasonalPriceMap;