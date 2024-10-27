// src/components/discovery/demos/Demos.js

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Slider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';


// Error Correction Model Demo Component
const ECMDemo = ({ onComplete }) => {
  const [adjustmentSpeed, setAdjustmentSpeed] = useState(-0.5);

  const chartData = useMemo(() => {
    const data = [];
    const periods = 100;
    const longRunEquilibrium = (t) => 100 + 0.5 * t;
    let y1 = 100;

    for (let t = 0; t < periods; t++) {
      const shock = t === 30 ? 20 : 0;
      const shortRunEffect = Math.sin(t / 10) * 5;
      const equilibrium = longRunEquilibrium(t);
      const deviation = y1 - equilibrium;
      y1 += adjustmentSpeed * deviation + shortRunEffect + shock;

      data.push({
        time: t,
        price: y1,
        equilibrium,
      });
    }
    return data;
  }, [adjustmentSpeed]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Error Correction Model Demonstration
      </Typography>
      <Typography variant="body1" paragraph>
        Adjust the speed of adjustment to observe how quickly prices return to equilibrium after a shock.
      </Typography>
      <BlockMath>
        {`\\Delta y_t = \\alpha(y_{t-1} - \\beta x_{t-1}) + \\gamma\\Delta x_t + \\epsilon_t`}
      </BlockMath>
      <Box sx={{ mt: 4 }}>
        <Typography gutterBottom>
          Adjustment Speed: {adjustmentSpeed.toFixed(1)}
        </Typography>
        <Slider
          value={adjustmentSpeed}
          onChange={(_, value) => setAdjustmentSpeed(value)}
          min={-1}
          max={-0.1}
          step={0.1}
          marks
          valueLabelDisplay="auto"
          aria-label="Adjustment Speed Slider"
        />
      </Box>
      <Box sx={{ height: 400, mt: 4 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#8884d8" name="Price" />
            <Line
              type="monotone"
              dataKey="equilibrium"
              stroke="#82ca9d"
              strokeDasharray="5 5"
              name="Equilibrium"
            />
            <ReferenceLine x={30} stroke="red" label="Shock" />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {onComplete && (
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={onComplete}>
            Complete Demo
          </Button>
        </Box>
      )}
    </Box>
  );
};

ECMDemo.propTypes = {
  onComplete: PropTypes.func,
};

// Price Differential Demo Component
const PriceDiffDemo = ({ onComplete }) => {
  const chartData = useMemo(() => {
    return Array.from({ length: 52 }, (_, i) => {
      const baseDeviation = 10;
      const trend = -i * 0.1;
      const seasonal = Math.sin((i * 2 * Math.PI) / 52) * 5;
      const random = Math.random() * 3;
      const shock = i === 26 ? 20 : 0;

      return {
        week: `Week ${i + 1}`,
        differential: baseDeviation + trend + seasonal + random + shock,
        transportCost: 5 + Math.sin((i * 2 * Math.PI) / 52) * 1,
      };
    });
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Price Differential Analysis
      </Typography>
      <Typography variant="body1" paragraph>
        Explore how price differentials fluctuate over time due to various factors.
      </Typography>
      <Box sx={{ height: 400, mt: 4 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="differential"
              stroke="#8884d8"
              name="Price Differential"
            />
            <Line
              type="monotone"
              dataKey="transportCost"
              stroke="#82ca9d"
              name="Transport Cost"
              strokeDasharray="5 5"
            />
            <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {onComplete && (
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={onComplete}>
            Complete Demo
          </Button>
        </Box>
      )}
    </Box>
  );
};

PriceDiffDemo.propTypes = {
  onComplete: PropTypes.func,
};

// Spatial Analysis Demo Component
const SpatialDemo = ({ onComplete }) => {
  const sampleLocations = [
    { id: 1, lat: 15.3694, lng: 44.191, value: 85, name: 'Market A' },
    { id: 2, lat: 15.3547, lng: 44.207, value: 82, name: 'Market B' },
    { id: 3, lat: 15.3822, lng: 44.175, value: 88, name: 'Market C' },
  ];

  const moranIFormula = `I = \\frac{n}{W} \\frac{\\sum_i \\sum_j w_{ij}(x_i - \\bar{x})(x_j - \\bar{x})}{\\sum_i (x_i - \\bar{x})^2}`;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Analysis Demonstration
      </Typography>
      <Typography variant="body1" paragraph>
        Visualize spatial data and understand spatial autocorrelation using Moran's I.
      </Typography>
      <Box sx={{ height: 400, mt: 4 }}>
        <MapContainer
          center={[15.3694, 44.191]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {sampleLocations.map((location) => (
            <CircleMarker
              key={location.id}
              center={[location.lat, location.lng]}
              radius={10}
              fillColor="#3388ff"
              color="#fff"
              weight={1}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                {location.name}: {location.value}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Box>
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Moran's I Formula
        </Typography>
        <BlockMath>{moranIFormula}</BlockMath>
      </Box>
      {onComplete && (
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={onComplete}>
            Complete Demo
          </Button>
        </Box>
      )}
    </Box>
  );
};

SpatialDemo.propTypes = {
  onComplete: PropTypes.func,
};

// Time-Varying Market Integration Index Demo Component
const TVMIIDemo = ({ onComplete }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const theme = useTheme();

  const chartData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      month: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
      tvmii: 0.6 + Math.sin(i / 4) * 0.2 + Math.random() * 0.1,
      marketIntegration: 0.7 + Math.cos(i / 3) * 0.15 + Math.random() * 0.05,
    }));
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Time-Varying Market Integration Index
      </Typography>
      <Typography variant="body1" paragraph>
        Analyze how market integration changes over time.
      </Typography>
      <FormControl sx={{ mt: 2, mb: 4, minWidth: 200 }}>
        <InputLabel id="period-select-label">Time Period</InputLabel>
        <Select
          labelId="period-select-label"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          label="Time Period"
        >
          <MenuItem value="all">All Time</MenuItem>
          <MenuItem value="12">Last 12 Months</MenuItem>
          <MenuItem value="6">Last 6 Months</MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 1]} />
            <RechartsTooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="tvmii"
              stroke={theme.palette.primary.main}
              name="TV-MII"
            />
            <Line
              type="monotone"
              dataKey="marketIntegration"
              stroke={theme.palette.secondary.main}
              name="Market Integration"
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {onComplete && (
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={onComplete}>
            Complete Demo
          </Button>
        </Box>
      )}
    </Box>
  );
};

TVMIIDemo.propTypes = {
  onComplete: PropTypes.func,
};

// Exporting components
export { ECMDemo, PriceDiffDemo, SpatialDemo, TVMIIDemo };