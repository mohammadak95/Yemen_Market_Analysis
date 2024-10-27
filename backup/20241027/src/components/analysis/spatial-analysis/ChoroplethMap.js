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

  // Calculate statistics
  const getMeanValue = useCallback((variable) => {
    const values = enhancedData.features
      .map(f => f.properties[variable])
      .filter(v => v !== null && !isNaN(v));
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }, [enhancedData.features]);

  // Generate color scales
  const getColor = useCallback((value, variable) => {
    if (value === null || value === undefined) return '#CCCCCC'; // Default color for no data

    const scales = {
      usdprice: {
        sequential: (val) => {
          return val > 10 ? '#800026' :
                 val > 8  ? '#BD0026' :
                 val > 6  ? '#E31A1C' :
                 val > 4  ? '#FC4E2A' :
                 val > 2  ? '#FD8D3C' :
                 val > 1  ? '#FEB24C' :
                 val > 0  ? '#FED976' :
                          '#FFEDA0';
        },
        diverging: (val) => {
          const mean = getMeanValue('usdprice');
          const diff = val - mean;
          return diff > 2  ? '#2166AC' :
                 diff > 1  ? '#4393C3' :
                 diff > 0  ? '#92C5DE' :
                 diff === 0 ? '#F7F7F7' :
                 diff > -1 ? '#F4A582' :
                 diff > -2 ? '#D6604D' :
                          '#B2182B';
        }
      },
      conflict_intensity: {
        sequential: (val) => {
          return val > 0.8 ? '#8B0000' :
                 val > 0.6 ? '#B22222' :
                 val > 0.4 ? '#CD5C5C' :
                 val > 0.2 ? '#F08080' :
                          '#FFB6C1';
        },
        diverging: (val) => {
          const mean = getMeanValue('conflict_intensity');
          const diff = val - mean;
          return diff > 0.4 ? '#8B0000' :
                 diff > 0.2 ? '#B22222' :
                 diff > 0   ? '#CD5C5C' :
                 diff === 0 ? '#F7F7F7' :
                 diff > -0.2? '#4682B4' :
                 diff > -0.4? '#1E90FF' :
                          '#00BFFF';
        }
      },
      residual: {
        sequential: () => '#CCCCCC', // Not applicable
        diverging: (val) => {
          return val > 2  ? '#2166AC' :
                 val > 1  ? '#4393C3' :
                 val > 0  ? '#92C5DE' :
                 val === 0 ? '#F7F7F7' :
                 val > -1 ? '#F4A582' :
                 val > -2 ? '#D6604D' :
                          '#B2182B';
        }
      }
    };

    // Fallback to sequential if diverging not selected
    return scales[variable][colorScale](value);
  }, [colorScale, getMeanValue]);

  // Style function for GeoJSON
  const style = useCallback((feature) => {
    const value = feature.properties[mapVariable];
    return {
      fillColor: getColor(value, mapVariable),
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  }, [getColor, mapVariable]);

  // Highlight style for hover
  const highlightStyle = useMemo(() => ({
    weight: 3,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.9
  }), []);

  // Event handlers
  const onEachFeature = useCallback((feature, layer) => {
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        Object.assign(layer.options, highlightStyle);
        layer.redraw();
        setSelectedRegion(feature.properties);
      },
      mouseout: (e) => {
        const layer = e.target;
        Object.assign(layer.options, style(feature));
        layer.redraw();
        setSelectedRegion(null);
      }
    });

    // Bind tooltip
    const value = feature.properties[mapVariable];
    const tooltipContent = `
      <strong>${feature.properties.region_name || 'Unknown Region'}</strong><br/>
      ${mapVariable === 'usdprice' ? 'Price (USD): ' : 
        mapVariable === 'conflict_intensity' ? 'Conflict Intensity: ' : 'Residual: '}
      ${value !== null && value !== undefined ? 
        (mapVariable === 'usdprice' ? `$${value.toFixed(2)}` : value.toFixed(2)) 
        : 'N/A'}
    `;
    layer.bindTooltip(tooltipContent);
  }, [highlightStyle, style, mapVariable]);

  // Legend component
  const Legend = useMemo(() => {
    const getLegendItems = () => {
      if (mapVariable === 'residual' || colorScale === 'diverging') {
        return [
          { color: getColor(3, mapVariable), label: 'High +' },
          { color: getColor(1.5, mapVariable), label: 'Medium +' },
          { color: getColor(0, mapVariable), label: 'Neutral' },
          { color: getColor(-1.5, mapVariable), label: 'Medium -' },
          { color: getColor(-3, mapVariable), label: 'High -' },
        ];
      } else {
        const values = {
          usdprice: [10, 8, 6, 4, 2, 1, 0],
          conflict_intensity: [0.8, 0.6, 0.4, 0.2, 0]
        };
        return values[mapVariable].map(value => ({
          color: getColor(value, mapVariable),
          label: mapVariable === 'usdprice' ? `$${value}` : value.toFixed(1)
        }));
      }
    };

    const legendItems = getLegendItems();

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          boxShadow: '0 0 10px rgba(0,0,0,0.2)'
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {mapVariable === 'usdprice' ? 'Price (USD)' :
           mapVariable === 'conflict_intensity' ? 'Conflict Intensity' :
           'Residuals'}
        </Typography>
        {legendItems.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: item.color
              }}
            />
            <Typography variant="caption">
              {item.label}
            </Typography>
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
                {mapVariable === 'usdprice' && `Price: $${selectedRegion.usdprice?.toFixed(2) || 'N/A'}`}<br/>
                {mapVariable === 'conflict_intensity' && `Conflict Intensity: ${selectedRegion.conflict_intensity?.toFixed(2) || 'N/A'}`}<br/>
                {mapVariable === 'residual' && `Residual: ${selectedRegion.residual?.toFixed(2) || 'N/A'}`}
              </Typography>
            </Alert>
          )}

          <Box sx={{ height: '500px', position: 'relative' }}>
            <MapContainer
              center={[15.5527, 48.5164]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              preferCanvas={true} // Use Canvas renderer for better performance
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              />
              {enhancedData && enhancedData.features && (
                <MemoizedGeoJSON
                  data={enhancedData}
                  style={style}
                  onEachFeature={onEachFeature}
                />
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
        <TimeSlider
          months={uniqueMonths}
          selectedDate={selectedDate}
          onChange={onDateChange}
        />
      </Paper>
    </Box>
  );
};

ChoroplethMap.propTypes = {
  enhancedData: PropTypes.shape({
    features: PropTypes.arrayOf(PropTypes.object).isRequired
  }).isRequired,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onDateChange: PropTypes.func.isRequired,
  uniqueMonths: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default React.memo(ChoroplethMap);
