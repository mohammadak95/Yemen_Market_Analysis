// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useMemo, useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Tooltip as LeafletTooltip,
  useMap,
} from 'react-leaflet';

import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import L from 'leaflet';
import { Box } from '@mui/material';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import { Slider, Typography } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import '../../../styles/leaflet.css';
import '../../../styles/leaflet-overrides.css';
import '../../../utils/leafletSetup';
import { createCustomIcon } from '../../../utils/leafletSetup'; // Import the function
import { Layers } from '@mui/icons-material';

const MapContent = ({
  geoData,
  flowData,
  variable,
  selectedMonth,
  colorScale,
  spatialWeights,
  showFlows,
  createIcon, // Pass the createIcon function
}) => {
  const map = useMap();
  const [hoveredRegion, setHoveredRegion] = useState(null);

  useEffect(() => {
    if (geoData?.features?.length > 0) {
      const bounds = L.geoJSON(geoData).getBounds();
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoData, map]);

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
            color: '#FF5722', // A distinct color for flows
            weight: Math.max(1, (flow.flow_weight / maxValue) * 5),
            opacity: 0.6,
            dashArray: '5, 5', // Optional: Adds dashed lines for flows
          })}
          onEachFeature={(feature, layer) => {
            const props = feature.properties;
            layer.bindTooltip(
              `From: ${props.source} (${props.source_price})<br/>To: ${props.target} (${props.target_price})<br/>Differential: ${props.price_differential.toFixed(2)}`,
              { sticky: true }
            );
          }}
        />
      );
    });
  }, [showFlows, flowData, selectedMonth]);

  // Extract marker positions if needed
  const markers = useMemo(() => {
    if (!geoData?.features) return [];

    return geoData.features.map((feature) => {
      const { latitude, longitude, region_id, shapeName, [variable]: varValue } = feature.properties;
      if (latitude == null || longitude == null) return null;

      return (
        <Marker
          key={region_id}
          position={[latitude, longitude]}
          icon={createIcon('blue')} // You can change color as needed
        >
          <LeafletTooltip direction="top" offset={[0, -20]} opacity={1} permanent>
            {shapeName || 'Unknown Region'}
          </LeafletTooltip>
        </Marker>
      );
    });
  }, [geoData, variable, createIcon]);

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

      {markers.length > 0 && <>{markers}</>}

      <MapControls
        availableLayers={[
          {
            id: 'flows',
            name: 'Show Flows',
            icon: <Layers />, // Ensure Layers is correctly imported in MapControls.js
            active: showFlows,
          },
        ]}
        onLayerToggle={(layerId) => {
          if (layerId === 'flows') {
            setShowFlows((prev) => !prev);
          }
        }}
      />
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
}) => {
  const [showFlows, setShowFlows] = useState(true); // Manage showFlows state

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
      month: 'short',
      year: 'numeric',
    });
  };

  const handleLayerToggle = (layerId) => {
    if (layerId === 'flows') {
      setShowFlows((prev) => !prev);
    }
    // Handle other layers if added in the future
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[15.552727, 48.516388]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <MapContent
          geoData={geoData}
          flowData={flowData}
          variable={variable}
          selectedMonth={selectedMonth}
          colorScale={colorScale}
          spatialWeights={spatialWeights}
          showFlows={showFlows}
          createIcon={createCustomIcon} // Pass the createIcon function
        />
      </MapContainer>

      {colorScale && (
        <MapLegend
          colorScale={colorScale}
          variable={variable}
          position="bottomright"
          unit={variable === 'price' ? ' YER' : ''}
          description={`Color scale representing ${variable} levels across regions.`}
        />
      )}

      {availableMonths?.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: showFlows ? 80 : 20, // Adjust bottom position if flows are toggled
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: '90%', sm: '80%', md: '60%' }, // Responsive width
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 2,
            zIndex: 1000,
          }}
        >
          <Typography variant="body2" gutterBottom>
            Time Period: {formatDate(selectedMonth)}
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
            aria-labelledby="time-period-slider"
          />
        </Box>
      )}
    </Box>
  );
};

export default SpatialMap;