// src/components/analysis/spatial-analysis/components/conflict/ConflictImpactDashboard.js

import React, { useMemo, useState } from 'react';
import { 
  Paper, Box, Typography, Grid, Card, CardContent, 
  ButtonGroup, Button, Slider, FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Rectangle 
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';

// Custom heatmap cell component using Recharts Rectangle
const HeatMapCell = ({ x, y, width, height, value, maxValue }) => {
  const colorScale = scaleSequential(interpolateRdYlBu)
    .domain([0, maxValue]);

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={colorScale(value)}
      fillOpacity={0.8}
    />
  );
};

const ConflictCorrelationMatrix = ({ regionalCorrelations }) => {
  const theme = useTheme();

  // Transform correlation data for visualization
  const { data, regions, maxCorrelation } = useMemo(() => {
    const uniqueRegions = [...new Set([
      ...regionalCorrelations.map(d => d.region1),
      ...regionalCorrelations.map(d => d.region2)
    ])].sort();

    const transformedData = [];
    const maxValue = Math.max(...regionalCorrelations.map(d => Math.abs(d.correlation)));

    uniqueRegions.forEach((region1, i) => {
      uniqueRegions.forEach((region2, j) => {
        const correlation = regionalCorrelations.find(
          d => (d.region1 === region1 && d.region2 === region2) ||
               (d.region1 === region2 && d.region2 === region1)
        );
        
        transformedData.push({
          x: i,
          y: j,
          region1,
          region2,
          value: correlation ? correlation.correlation : 0
        });
      });
    });

    return {
      data: transformedData,
      regions: uniqueRegions,
      maxCorrelation: maxValue
    };
  }, [regionalCorrelations]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Regional Correlation Matrix
        </Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          <ResponsiveContainer>
            <ScatterChart
              margin={{ top: 60, right: 60, bottom: 60, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, regions.length - 1]}
                tickFormatter={(value) => regions[value] || ''}
                interval={0}
                tick={{ angle: -45, textAnchor: 'end' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, regions.length - 1]}
                tickFormatter={(value) => regions[value] || ''}
                interval={0}
              />
              <RechartsTooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const { region1, region2, value } = payload[0].payload;
                  return (
                    <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1 }}>
                      <Typography variant="body2">
                        {region1} ↔ {region2}
                      </Typography>
                      <Typography variant="body2">
                        Correlation: {value.toFixed(3)}
                      </Typography>
                    </Box>
                  );
                }}
              />
              <Scatter
                data={data}
                shape={(props) => (
                  <HeatMapCell 
                    {...props} 
                    maxValue={maxCorrelation}
                  />
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const ConflictImpactDashboard = ({ 
  timeSeriesData, 
  spatialClusters, 
  timeWindow = '1M' 
}) => {
  const theme = useTheme();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [metricType, setMetricType] = useState('price'); // price, volatility, correlation

  // Transform time series data for charts
  const chartData = useMemo(() => {
    return timeSeriesData.map(d => ({
      date: d.month,
      price: d.avgUsdPrice,
      conflict: d.conflict_intensity,
      volatility: d.volatility
    }));
  }, [timeSeriesData]);

  const handleMetricTypeChange = (event) => {
    setMetricType(event.target.value);
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Conflict Impact Analysis
        </Typography>
        <FormControl size="small">
          <InputLabel>Metric Type</InputLabel>
          <Select value={metricType} onChange={handleMetricTypeChange}>
            <MenuItem value="price">Price Impact</MenuItem>
            <MenuItem value="volatility">Price Volatility</MenuItem>
            <MenuItem value="correlation">Conflict Correlation</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price-Conflict Relationship
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      stroke={theme.palette.primary.main}
                      name="Price"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="conflict"
                      stroke={theme.palette.error.main}
                      name="Conflict Intensity"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <ConflictCorrelationMatrix regionalCorrelations={spatialClusters} />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ConflictImpactDashboard;