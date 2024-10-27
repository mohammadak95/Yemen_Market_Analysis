// src/components/spatial-analysis/ChoroplethMap.js

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  IconButton,
  Stack,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import TimeSlider from './TimeSlider';
import L from 'leaflet';
import chroma from 'chroma-js';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Memoized GeoJSON Component
const MemoizedGeoJSON = React.memo(function MemoizedGeoJSON({ data, style, onEachFeature }) {
  return <GeoJSON data={data} style={style} onEachFeature={onEachFeature} renderer={L.canvas()} />;
});

MemoizedGeoJSON.propTypes = {
  data: PropTypes.object.isRequired,
  style: PropTypes.func.isRequired,
  onEachFeature: PropTypes.func.isRequired,
};

const ChoroplethMap = ({
  enhancedData,
  selectedDate,
  onDateChange,
  uniqueMonths,
  isMobile,
}) => {
  const [mapVariable, setMapVariable] = useState('usdprice');
  const [colorScale, setColorScale] = useState('sequential');
  const [selectedRegion, setSelectedRegion] = useState(null);

  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Filter data by selected date
  const filteredData = useMemo(() => {
    if (!enhancedData || !selectedDate) return null;
    const dateString = selectedDate.toISOString().slice(0, 10);
    return {
      ...enhancedData,
      features: enhancedData.features.filter(
        (feature) => feature.properties.date.toISOString().slice(0, 10) === dateString
      ),
    };
  }, [enhancedData, selectedDate]);

  // Calculate statistics
  const getMeanValue = useCallback(
    (variable) => {
      const values = filteredData.features
        .map((f) => f.properties[variable])
        .filter((v) => v !== null && !isNaN(v));
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    },
    [filteredData.features]
  );

  // Generate color scales
  const getColor = useCallback(
    (value, variable) => {
      if (value === null || value === undefined) return '#CCCCCC'; // Default color for no data

      const scales = {
        usdprice: {
          sequential: chroma.scale('YlGnBu').domain([0, 10]),
          diverging: chroma.scale('RdYlBu').domain([-5, 0, 5]),
        },
        conflict_intensity: {
          sequential: chroma.scale('Reds').domain([0, 1]),
          diverging: chroma.scale('PuOr').domain([-0.5, 0, 0.5]),
        },
        residual: {
          sequential: chroma.scale('Greys').domain([-5, 5]),
          diverging: chroma.scale('RdBu').domain([-5, 0, 5]),
        },
      };

      const scale = scales[variable][colorScale];
      return scale(value).hex();
    },
    [colorScale]
  );

  // Style function for GeoJSON
  const style = useCallback(
    (feature) => {
      const value = feature.properties[mapVariable];
      return {
        fillColor: getColor(value, mapVariable),
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
      };
    },
    [getColor, mapVariable]
  );

  // Event handlers
  const onEachFeature = useCallback(
    (feature, layer) => {
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#333',
            fillOpacity: 0.9,
          });
          setSelectedRegion(feature.properties);
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle(style(feature));
          setSelectedRegion(null);
        },
      });

      // Bind tooltip
      const value = feature.properties[mapVariable];
      const tooltipContent = `
        <strong>${feature.properties.region_name || 'Unknown Region'}</strong><br/>
        ${
          mapVariable === 'usdprice'
            ? 'Price (USD): '
            : mapVariable === 'conflict_intensity'
            ? 'Conflict Intensity: '
            : 'Residual: '
        }
        ${
          value !== null && value !== undefined
            ? mapVariable === 'usdprice'
              ? `$${value.toFixed(2)}`
              : value.toFixed(2)
            : 'N/A'
        }
      `;
      layer.bindTooltip(tooltipContent);
    },
    [style, mapVariable]
  );

  // Legend component
  const Legend = useMemo(() => {
    const legendItems = [];

    const scaleDomain =
      mapVariable === 'usdprice'
        ? [0, 2, 4, 6, 8, 10]
        : mapVariable === 'conflict_intensity'
        ? [0, 0.2, 0.4, 0.6, 0.8, 1]
        : [-5, -3, -1, 1, 3, 5];

    scaleDomain.forEach((value) => {
      legendItems.push({
        color: getColor(value, mapVariable),
        label: value.toFixed(1),
      });
    });

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {mapVariable === 'usdprice'
            ? 'Price (USD)'
            : mapVariable === 'conflict_intensity'
            ? 'Conflict Intensity'
            : 'Residuals'}
        </Typography>
        {legendItems.map((item, index) => (
          <Box
            key={index}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: item.color,
              }}
            />
            <Typography variant="caption">{item.label}</Typography>
          </Box>
        ))}
      </Box>
    );
  }, [mapVariable, colorScale, getColor]);

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Paper elevation={3} sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Spatial Distribution
            <Tooltip title={getTechnicalTooltip('choropleth')}>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>

          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Variable</InputLabel>
              <Select
                value={mapVariable}
                onChange={(e) => setMapVariable(e.target.value)}
                label="Variable"
              >
                <MenuItem value="usdprice">Price (USD)</MenuItem>
                <MenuItem value="conflict_intensity">Conflict Intensity</MenuItem>
                <MenuItem value="residual">Residuals</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Color Scale</InputLabel>
              <Select
                value={colorScale}
                onChange={(e) => setColorScale(e.target.value)}
                label="Color Scale"
                disabled={mapVariable === 'residual'}
              >
                <MenuItem value="sequential">Sequential</MenuItem>
                <MenuItem value="diverging">Diverging</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {selectedRegion && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                {selectedRegion.region_name || 'Unknown Region'}
              </Typography>
              <Typography variant="body2">
                {mapVariable === 'usdprice' &&
                  `Price: $${selectedRegion.usdprice?.toFixed(2) || 'N/A'}`}
                {mapVariable === 'conflict_intensity' &&
                  `Conflict Intensity: ${
                    selectedRegion.conflict_intensity?.toFixed(2) || 'N/A'
                  }`}
                {mapVariable === 'residual' &&
                  `Residual: ${selectedRegion.residual?.toFixed(2) || 'N/A'}`}
              </Typography>
            </Alert>
          )}

          {/* Educational Content */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              The choropleth map visualizes spatial patterns of{' '}
              {mapVariable === 'usdprice' ? 'prices' : 'conflict intensity'}. It helps identify
              spatial dependencies and clustering, as explained in the methodology.
            </Typography>
            {mapVariable === 'usdprice' && (
              <>
                <BlockMath>
                  {`I = \\frac{N}{\\sum_{i=1}^{N} \\sum_{j=1}^{N} w_{ij}} \\cdot \\frac{\\sum_{i=1}^{N} \\sum_{j=1}^{N} w_{ij}(P_i - \\bar{P})(P_j - \\bar{P})}{\\sum_{i=1}^{N} (P_i - \\bar{P})^2}`}
                </BlockMath>
                <Typography variant="caption">
                  Moran's I formula measuring spatial autocorrelation in prices.
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ height: '500px', position: 'relative' }}>
            <MapContainer
              center={[15.5527, 48.5164]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              renderer={L.canvas()}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              />
              {filteredData && filteredData.features && (
                <MemoizedGeoJSON data={filteredData} style={style} onEachFeature={onEachFeature} />
              )}
              {Legend}
            </MapContainer>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Time Selection
        </Typography>
        <TimeSlider months={uniqueMonths} selectedDate={selectedDate} onChange={onDateChange} />
      </Paper>
    </Box>
  );
};

ChoroplethMap.propTypes = {
  enhancedData: PropTypes.shape({
    features: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onDateChange: PropTypes.func.isRequired,
  uniqueMonths: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default React.memo(ChoroplethMap);
