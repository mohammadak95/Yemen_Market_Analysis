// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
} from 'react-leaflet';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import L from 'leaflet';
import { Box } from '@mui/material';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import { Slider, Typography } from '@mui/material';

const MapContent = ({
  geoData,
  flowData,
  variable,
  selectedMonth,
  colorScale,
  spatialWeights,
  showFlows,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const style = useMemo(
    () => (feature) => {
      const value = feature.properties?.[variable];
      const isHighlighted = hoveredRegion === feature.properties.region_id;

      return {
        fillColor: value != null && colorScale ? colorScale(value) : '#ccc',
        weight: isHighlighted ? 3 : 1,
        opacity: 1,
        color: isHighlighted ? '#666' : 'white',
        fillOpacity: isHighlighted ? 0.9 : 0.7,
      };
    },
    [colorScale, variable, hoveredRegion]
  );

  const onEachFeature = useMemo(
    () => (feature, layer) => {
      const props = feature.properties || {};
      const neighbors = spatialWeights?.[props.region_id]?.neighbors || [];

      const popupContent = `
        <div style="min-width: 200px;">
          <h4>${props.shapeName || 'Unknown Region'}</h4>
          <p><strong>${variable.charAt(0).toUpperCase() + variable.slice(1)}:</strong> 
             ${props[variable] != null ? props[variable].toFixed(2) : 'N/A'}</p>
          <p><strong>Connected Regions:</strong> ${neighbors.join(', ') || 'None'}</p>
        </div>
      `;

      layer.bindPopup(popupContent);

      layer.on({
        mouseover: () => setHoveredRegion(props.region_id),
        mouseout: () => setHoveredRegion(null),
      });
    },
    [variable, spatialWeights]
  );

  const flowLines = useMemo(() => {
    if (!showFlows || !flowData) return null;

    const currentFlows = flowData.filter(
      (flow) =>
        new Date(flow.date).toISOString().slice(0, 10) ===
        new Date(selectedMonth).toISOString().slice(0, 10)
    );

    if (!currentFlows.length) return null;

    const maxValue = Math.max(...currentFlows.map((f) => f.flow_weight));

    return currentFlows.map((flow, idx) => {
      const coordinates = [
        [flow.source_lat, flow.source_lng],
        [flow.target_lat, flow.target_lng],
      ];

      return (
        <GeoJSON
          key={`flow-${idx}`}
          data={{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
            properties: flow,
          }}
          style={() => ({
            color: '#2196f3',
            weight: Math.max(1, (flow.flow_weight / maxValue) * 5),
            opacity: 0.6,
          })}
        />
      );
    });
  }, [showFlows, flowData, selectedMonth]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {geoData && (
        <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />
      )}

      {flowLines}
      <MapControls />
    </>
  );
};

const SpatialMap = ({
  geoData,
  flowData,
  variable = 'price',
  selectedMonth,
  onMonthChange,
  availableMonths,
  spatialWeights,
  showFlows = false,
}) => {
  const colorScale = useMemo(() => {
    if (!geoData?.features) return null;

    const values = geoData.features
      .map((f) => f.properties[variable])
      .filter((v) => v != null && !isNaN(v));

    if (values.length === 0) return null;

    return scaleSequential()
      .domain([Math.min(...values), Math.max(...values)])
      .interpolator(interpolateBlues);
  }, [geoData, variable]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
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
        <MapContent
          geoData={geoData}
          flowData={flowData}
          variable={variable}
          selectedMonth={selectedMonth}
          colorScale={colorScale}
          spatialWeights={spatialWeights}
          showFlows={showFlows}
        />
      </MapContainer>

      {colorScale && (
        <MapLegend
          colorScale={colorScale}
          variable={variable}
          title={variable === 'price' ? 'Price (YER)' : 'Value'}
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
          <Typography variant="body2" gutterBottom>
            Time Period
          </Typography>
          <Slider
            value={availableMonths.indexOf(selectedMonth)}
            min={0}
            max={availableMonths.length - 1}
            step={1}
            onChange={(_, newValue) =>
              onMonthChange(availableMonths[newValue])
            }
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatDate(availableMonths[value])}
            marks={availableMonths.map((date, index) => ({
              value: index,
              label: formatDate(date),
            }))}
          />
        </Box>
      )}
    </Box>
  );
};

export default SpatialMap;
