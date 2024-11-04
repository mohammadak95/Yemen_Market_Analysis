// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues, interpolateReds } from 'd3-scale-chromatic';
import L from 'leaflet';
import { Box, Slider } from '@mui/material';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import 'leaflet/dist/leaflet.css';

const SpatialMap = ({
  geoData,
  flowData,
  variable,
  selectedMonth,
  onMonthChange,
  availableMonths,
  spatialWeights,
  showFlows,
}) => {
  const colorScale = useMemo(() => {
    if (!geoData?.features) return null;

    const values = geoData.features
      .map((f) => f.properties[variable])
      .filter((v) => v != null && !isNaN(v));

    if (values.length === 0) return null;

    return scaleSequential()
      .domain([Math.min(...values), Math.max(...values)])
      .interpolator(
        variable === 'residual' ? interpolateReds : interpolateBlues
      );
  }, [geoData, variable]);

  const style = (feature) => {
    const value = feature.properties?.[variable];

    return {
      fillColor: value != null && colorScale ? colorScale(value) : '#ccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const popupContent = `
      <div style="min-width: 200px;">
        <h4>${props.shapeName || 'Unknown Region'}</h4>
        <p><strong>${variable.charAt(0).toUpperCase() + variable.slice(1)}:</strong> ${
      props[variable] != null ? props[variable].toFixed(2) : 'N/A'
    }</p>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[15.552727, 48.516388]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => {
          if (geoData?.features?.length > 0) {
            const bounds = L.geoJSON(geoData).getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {geoData && (
          <GeoJSON
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}

        <MapControls />
      </MapContainer>

      {colorScale && (
        <MapLegend
          colorScale={colorScale}
          variable={
            variable === 'price' ? 'Price (YER)' : 'Residuals'
          }
          position="bottomright"
        />
      )}

      {availableMonths?.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 2,
            zIndex: 1000,
          }}
        >
          <Slider
            value={availableMonths.indexOf(selectedMonth)}
            min={0}
            max={availableMonths.length - 1}
            step={1}
            onChange={(_, newValue) =>
              onMonthChange(availableMonths[newValue])
            }
            valueLabelDisplay="auto"
            valueLabelFormat={(value) =>
              new Date(availableMonths[value]).toLocaleDateString(
                'en-US',
                {
                  month: 'long',
                  year: 'numeric',
                }
              )
            }
            marks={availableMonths.map((date, index) => ({
              value: index,
              label: new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                year: '2-digit',
              }),
            }))}
          />
        </Box>
      )}
    </Box>
  );
};

export default SpatialMap;
