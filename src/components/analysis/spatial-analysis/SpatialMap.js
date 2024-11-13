// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
  ScaleControl,
  Polyline,
} from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import L from 'leaflet';
import debounce from 'lodash.debounce';

// Constants
const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

// Flow Lines Component
const FlowLines = React.memo(({ flows, getFlowStyle }) => {
  if (!flows?.length) return null;

  return flows.map((flow, idx) => {
    if (
      !flow?.source_lat ||
      !flow?.source_lng ||
      !flow?.target_lat ||
      !flow?.target_lng
    ) {
      return null;
    }

    const style = getFlowStyle(flow);
    if (!style) return null;

    return (
      <Polyline
        key={`flow-${idx}`}
        positions={[
          [flow.source_lat, flow.source_lng],
          [flow.target_lat, flow.target_lng],
        ]}
        pathOptions={style}
      >
        <LeafletTooltip sticky>
          {`${flow.source} → ${flow.target}\nFlow: ${
            flow.flow_weight?.toFixed(2) || 'N/A'
          }`}
        </LeafletTooltip>
      </Polyline>
    );
  });
});

const SpatialMap = ({
  geoData,
  flowMaps = [],
  selectedDate,
  spatialWeights = {},
  showFlows = true,
  analysisResults = null,
  selectedCommodity,
  marketClusters = [],
  detectedShocks = [],
  visualizationMode,
  colorScales,
  onRegionSelect,
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const geoJsonRef = useRef(null);

  // Style generator for regions
  const getRegionStyle = useCallback((feature) => {
    return {
      fillColor: colorScales?.getColor(feature) || '#cccccc',
      weight: 1,
      opacity: 1,
      color: '#666666',
      fillOpacity: 0.7,
    };
  }, [colorScales]);

  // Feature click handler
  const onFeatureClick = useCallback((feature) => {
    if (onRegionSelect && feature.properties?.region_id) {
      onRegionSelect(feature.properties.region_id);
    }
  }, [onRegionSelect]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      if (!feature?.properties) return;

      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            dashArray: '',
            fillOpacity: 0.9,
          });
          layer.bringToFront();
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle(getRegionStyle(feature));
        },
        click: () => {
          onFeatureClick(feature);
        },
      });

      // Tooltip content
      const tooltipContent = `
        <strong>${
          feature.properties.region || feature.properties.region_id || 'Unknown Region'
        }</strong>
      `;
      layer.bindTooltip(tooltipContent, { sticky: true });
    },
    [getRegionStyle, onFeatureClick]
  );

  // Debounced map update to optimize performance
  const debouncedMapUpdate = useMemo(
    () =>
      debounce(() => {
        if (mapRef.current && geoJsonRef.current && geoData) {
          geoJsonRef.current.clearLayers();
          L.geoJSON(geoData, {
            style: getRegionStyle,
            onEachFeature,
          }).addTo(geoJsonRef.current);
        }
      }, 300),
    [geoData, getRegionStyle, onEachFeature]
  );

  useEffect(() => {
    debouncedMapUpdate();
    return () => {
      debouncedMapUpdate.cancel();
    };
  }, [debouncedMapUpdate]);

  if (!geoData) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography>No spatial data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <GeoJSON
          ref={geoJsonRef}
          data={geoData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />

        {showFlows && (
          <FlowLines flows={flowMaps} getFlowStyle={getRegionStyle} />
        )}

        <ScaleControl position="bottomleft" />
      </MapContainer>
    </Box>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired, // Ensure geoData is provided
  flowMaps: PropTypes.array,
  selectedDate: PropTypes.string,
  spatialWeights: PropTypes.object,
  showFlows: PropTypes.bool,
  analysisResults: PropTypes.object,
  selectedCommodity: PropTypes.string,
  marketClusters: PropTypes.array,
  detectedShocks: PropTypes.array,
  visualizationMode: PropTypes.string,
  colorScales: PropTypes.object,
  onRegionSelect: PropTypes.func,
};

export default React.memo(SpatialMap);
