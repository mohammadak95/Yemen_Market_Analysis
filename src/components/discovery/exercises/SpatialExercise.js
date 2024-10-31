// src/components/discovery/exercises/SpatialExercise.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Slider,
  Grid,
  Paper,
} from '@mui/material';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { BlockMath } from 'react-katex';
import { getEquation } from '../../../utils/appUtils';
import 'leaflet/dist/leaflet.css';

const SpatialExercise = ({ data }) => {
  const [distanceThreshold, setDistanceThreshold] = useState(50);

  // Sample spatial data (replace with actual data)
  const sampleData = [
    { id: 1, lat: 51.5, lng: -0.1, value: Math.random() * 100 },
    { id: 2, lat: 51.51, lng: -0.12, value: Math.random() * 100 },
    // Add more data points
  ];

  // Calculate Moran's I (simplified for demonstration)
  const calculateMoransI = () => {
    // Implement calculation based on distanceThreshold
    // For demonstration, we'll return a random value
    return Math.random() * 2 - 1; // Moran's I ranges from -1 to 1
  };

  const moransI = calculateMoransI();

  // Get equation from methodology
  const moransEquation = getEquation('spatial', 'moran');

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Analysis Interactive Exercise
      </Typography>

      <Typography variant="body1" paragraph>
        Adjust the distance threshold to define spatial relationships and observe changes in spatial autocorrelation.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <BlockMath>{moransEquation.latex}</BlockMath>
        <Typography variant="caption">{moransEquation.description}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography gutterBottom>
            Distance Threshold (km): {distanceThreshold}
          </Typography>
          <Slider
            value={distanceThreshold}
            onChange={(e, val) => setDistanceThreshold(val)}
            min={10}
            max={100}
            step={1}
            marks={[
              { value: 10, label: '10' },
              { value: 100, label: '100' },
            ]}
          />
          <Typography variant="caption">
            Adjust the threshold to change spatial weights.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Calculated Moran's I: {moransI.toFixed(3)}
            </Typography>
            <Typography variant="caption">
              Moran's I measures spatial autocorrelation.
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
          <MapContainer center={[51.5, -0.1]} zoom={13} style={{ height: '400px' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {sampleData.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lng]}
                radius={5}
                fillColor="blue"
                fillOpacity={0.5}
                stroke={false}
              />
            ))}
          </MapContainer>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1">
          Observe how changes in the distance threshold affect the spatial relationships between data points and the value of Moran's I. A higher Moran's I indicates stronger spatial autocorrelation.
        </Typography>
      </Box>
    </Paper>
  );
};

SpatialExercise.propTypes = {
  data: PropTypes.array, // Replace with actual data prop if needed
};

export default SpatialExercise
