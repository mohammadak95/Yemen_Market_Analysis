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

const ConflictCorrelationMatrix = ({ regionalCorrelations = [] }) => {
  const theme = useTheme();

  // Return early if no data
  if (!Array.isArray(regionalCorrelations) || regionalCorrelations.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Regional Correlation Matrix
          </Typography>
          <Box sx={{ height: 400, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No correlation data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Transform correlation data for visualization
  const { data, regions, maxCorrelation } = useMemo(() => {
    try {
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
    } catch (error) {
      console.error('Error processing correlation data:', error);
      return {
        data: [],
        regions: [],
        maxCorrelation: 0
      };
    }
  }, [regionalCorrelations]);

  // Return early if data processing failed
  if (!data.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Regional Correlation Matrix
          </Typography>
          <Box sx={{ height: 400, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Error processing correlation data
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

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
    if (!timeSeriesData) return [];
    
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

        {/* About This Visualization */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About This Visualization
              </Typography>
              <Typography variant="body2" paragraph>
                The Conflict Impact Analysis examines the relationship between conflict events and
                market dynamics in Yemen, helping understand how conflict affects market stability
                and price movements across different regions.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Analysis Features:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <li>Price-conflict correlation tracking</li>
                      <li>Regional impact assessment</li>
                      <li>Temporal relationship analysis</li>
                      <li>Market vulnerability indicators</li>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Visualization Tools:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <li>Time series relationship charts</li>
                      <li>Regional correlation matrix</li>
                      <li>Impact intensity mapping</li>
                      <li>Volatility indicators</li>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Key Metrics:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <li>Price-conflict correlation</li>
                      <li>Market volatility measures</li>
                      <li>Regional impact scores</li>
                      <li>Temporal response patterns</li>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                Interpretation Guide:
              </Typography>
              <Box>
                <Typography variant="body2">
                  The analysis provides multiple views of conflict impact on markets, from immediate
                  price responses to longer-term market stability effects. The correlation matrix
                  shows how different regions respond to conflict events.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                  Key aspects to monitor:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Immediate price responses to conflict</li>
                  <li>Regional variation in impact</li>
                  <li>Market recovery patterns</li>
                  <li>Cross-regional effects</li>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Understanding these patterns helps identify vulnerable markets and develop
                  targeted interventions to maintain market stability during periods of conflict.
                  It also aids in developing early warning systems and resilience strategies.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ConflictImpactDashboard;
