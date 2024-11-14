// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  ScaleControl,
  Polyline,
} from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import L from 'leaflet';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

const SpatialMap = ({
  geoData,
  flowMaps = [],
  selectedDate,
  showFlows = true,
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

  const getRegionStyle = useCallback(
    (feature) => {
      return {
        fillColor: colorScales?.getColor(feature) || '#cccccc',
        weight: 1,
        opacity: 1,
        color: '#666666',
        fillOpacity: 0.7,
      };
    },
    [colorScales]
  );

  const highlightFeature = useCallback(
    (e) => {
      const layer = e.target;
      if (layer.setStyle) {
        layer.setStyle({
          weight: 3,
          color: theme.palette.primary.main,
          dashArray: '',
          fillOpacity: 0.9,
        });
        layer.bringToFront();
      }
    },
    [theme]
  );

  const resetHighlight = useCallback(
    (e, feature) => {
      const layer = e.target;
      if (layer.setStyle) {
        layer.setStyle(getRegionStyle(feature));
      }
    },
    [getRegionStyle]
  );

  const onFeatureClick = useCallback(
    (feature) => {
      if (onRegionSelect && feature.properties?.region_id) {
        onRegionSelect(feature.properties.region_id);
      }
    },
    [onRegionSelect]
  );

  const onEachFeature = useCallback(
    (feature, layer) => {
      if (!feature?.properties) return;

      layer.on({
        mouseover: highlightFeature,
        mouseout: (e) => resetHighlight(e, feature),
        click: () => onFeatureClick(feature),
      });

      // Tooltip content
      const { region, region_id, priceData } = feature.properties;
      const content = `
        <strong>${region || region_id || 'Unknown Region'}</strong>
        ${priceData ? `<br/>Price: $${priceData.avgUsdPrice?.toFixed(2) || 'N/A'}` : ''}
      `;

      layer.bindTooltip(content, {
        sticky: true,
        direction: 'top',
        offset: [0, -10],
      });
    },
    [highlightFeature, resetHighlight, onFeatureClick]
  );

  useEffect(() => {
    if (!geoData || !geoJsonRef.current) return;

    geoJsonRef.current.clearLayers();

    L.geoJSON(geoData, {
      style: getRegionStyle,
      onEachFeature,
    }).addTo(geoJsonRef.current);
  }, [geoData, getRegionStyle, onEachFeature]);

  const getFlowStyle = useCallback(
    (flow) => {
      if (!flow?.flow_weight) return null;

      return {
        color: theme.palette.primary.main,
        weight: Math.max(1, flow.flow_weight * 2),
        opacity: 0.6,
        dashArray: null,
        lineCap: 'round',
        lineJoin: 'round',
      };
    },
    [theme]
  );

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

        {showFlows && flowMaps && flowMaps.length > 0 && (
          <>
            {flowMaps.map((flow, idx) => {
              const coordinates = [
                [flow.source_lat, flow.source_lng],
                [flow.target_lat, flow.target_lng],
              ];

              const style = getFlowStyle(flow);

              return (
                <Polyline
                  key={`flow-${idx}-${flow.source}-${flow.target}`}
                  positions={coordinates}
                  pathOptions={style}
                />
              );
            })}
          </>
        )}

        <ScaleControl position="bottomleft" />
      </MapContainer>
    </Box>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired,
  flowMaps: PropTypes.array,
  selectedDate: PropTypes.string,
  showFlows: PropTypes.bool,
  selectedCommodity: PropTypes.string,
  marketClusters: PropTypes.array,
  detectedShocks: PropTypes.array,
  visualizationMode: PropTypes.string,
  colorScales: PropTypes.object,
  onRegionSelect: PropTypes.func,
};

export default React.memo(SpatialMap);