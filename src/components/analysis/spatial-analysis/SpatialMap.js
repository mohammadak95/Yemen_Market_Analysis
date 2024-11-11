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
  Polyline
} from 'react-leaflet';
import { Box, Paper, ButtonGroup, IconButton, Tooltip } from '@mui/material';
import {
  LayersOutlined,
  Map,
  Timeline,
  Hub,
  Warning,
  ZoomIn,
  ZoomOut,
  Refresh
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { interpolateBlues, interpolateReds } from 'd3-scale-chromatic';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import debounce from 'lodash/debounce';

// Constants moved to component scope for immediate initialization
const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

// Map Controls Component
const MapControls = ({ position = 'topleft', onZoomIn, onZoomOut, onReset }) => {
  const map = useMap();

  const handleZoomIn = useCallback(() => {
    map.setZoom(Math.min(map.getZoom() + 1, MAX_ZOOM));
    onZoomIn?.();
  }, [map, onZoomIn]);

  const handleZoomOut = useCallback(() => {
    map.setZoom(Math.max(map.getZoom() - 1, MIN_ZOOM));
    onZoomOut?.();
  }, [map, onZoomOut]);

  const handleReset = useCallback(() => {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    onReset?.();
  }, [map, onReset]);

  return (
    <Paper
      sx={{
        position: 'absolute',
        [position]: 10,
        zIndex: 1000,
        p: 0.5
      }}
    >
      <ButtonGroup orientation="vertical" size="small">
        <IconButton onClick={handleZoomIn}>
          <ZoomIn />
        </IconButton>
        <IconButton onClick={handleZoomOut}>
          <ZoomOut />
        </IconButton>
        <IconButton onClick={handleReset}>
          <Refresh />
        </IconButton>
      </ButtonGroup>
    </Paper>
  );
};

// Flow Lines Component
const FlowLines = React.memo(({ flows, getFlowStyle }) => {
  if (!flows?.length) return null;

  return flows.map((flow, idx) => {
    if (!flow?.source_lat || !flow?.source_lng || !flow?.target_lat || !flow?.target_lng) {
      return null;
    }

    const style = getFlowStyle(flow);
    if (!style) return null;

    return (
      <Polyline
        key={`flow-${idx}`}
        positions={[
          [flow.source_lat, flow.source_lng],
          [flow.target_lat, flow.target_lng]
        ]}
        pathOptions={style}
      >
        <LeafletTooltip sticky>
          {`${flow.source} → ${flow.target}\nFlow: ${flow.flow_weight?.toFixed(2) || 'N/A'}`}
        </LeafletTooltip>
      </Polyline>
    );
  });
});

const SpatialMap = ({
  geoData,
  flowMaps = [],
  selectedMonth,
  onMonthChange,
  availableMonths = [],
  spatialWeights = {},
  showFlows = true,
  analysisResults = null,
  selectedCommodity,
  marketClusters = [],
  detectedShocks = [],
  visualizationMode,
  colorScales,
  onRegionSelect
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const geoJsonRef = useRef(null);

  // Style generators with proper initialization checks
  const getRegionStyle = useCallback((feature) => {
    if (!feature?.properties) {
      return {
        fillColor: theme.palette.grey[300],
        weight: 1,
        opacity: 1,
        color: theme.palette.divider,
        fillOpacity: 0.7
      };
    }

    const baseStyle = {
      fillOpacity: 0.7,
      weight: 1,
      opacity: 1,
      color: theme.palette.divider,
      dashArray: ''
    };

    try {
      const color = colorScales?.getColor?.(feature) || theme.palette.grey[300];
      return {
        ...baseStyle,
        fillColor: color
      };
    } catch (error) {
      console.error('Error computing region style:', error);
      return baseStyle;
    }
  }, [colorScales, theme]);

  const getFlowStyle = useCallback((flow) => {
    if (!flow) return null;

    const baseStyle = {
      weight: Math.max(1, Math.min(5, flow.flow_weight / 10)),
      opacity: 0.6,
      dashArray: null
    };

    switch (visualizationMode) {
      case 'market_integration':
        return {
          ...baseStyle,
          color: interpolateBlues(flow.flow_weight / 100),
          dashArray: flow.flow_weight > 50 ? null : '5,5'
        };
      case 'clusters':
        const cluster = marketClusters.find(c => 
          c.connectedMarkets.has(flow.source) && 
          c.connectedMarkets.has(flow.target)
        );
        return {
          ...baseStyle,
          color: cluster ? cluster.color : theme.palette.action.disabled
        };
      case 'shocks':
        const hasShock = detectedShocks.some(s => 
          s.region === flow.source || s.region === flow.target
        );
        return {
          ...baseStyle,
          color: hasShock ? interpolateReds(0.7) : theme.palette.action.disabled,
          dashArray: hasShock ? '5,5' : null
        };
      default:
        return {
          ...baseStyle,
          color: theme.palette.primary.main
        };
    }
  }, [visualizationMode, marketClusters, detectedShocks, theme]);

  const onEachFeature = useCallback((feature, layer) => {
    if (!feature?.properties) return;

    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          dashArray: '',
          fillOpacity: 0.9
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(getRegionStyle(feature));
      },
      click: (e) => {
        const region = feature.properties.region_id || feature.properties.region;
        onRegionSelect?.(region);
      }
    });

    const tooltipContent = `
      <strong>${feature.properties.region || feature.properties.region_id || 'Unknown Region'}</strong>
      ${feature.properties.price ? `<br/>Price: ${feature.properties.price.toFixed(2)} ${analysisResults?.units || ''}` : ''}
      ${visualizationMode === 'market_integration' && feature.properties.residual ? 
        `<br/>Residual: ${feature.properties.residual.toFixed(3)}` : ''}
      <br/>Connections: ${spatialWeights[feature.properties.region_id]?.neighbors?.length || 0}
    `;
    layer.bindTooltip(tooltipContent, { sticky: true });
  }, [getRegionStyle, onRegionSelect, analysisResults, visualizationMode, spatialWeights]);

  // Debounced map update
  const debouncedMapUpdate = useMemo(() => 
    debounce(() => {
      if (mapRef.current && geoJsonRef.current && geoData) {
        geoJsonRef.current.clearLayers();
        L.geoJSON(geoData, {
          style: getRegionStyle,
          onEachFeature
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
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          attribution='&copy; OpenStreetMap contributors'
        />

        <GeoJSON
          ref={geoJsonRef}
          data={geoData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />

        {showFlows && (
          <MarkerClusterGroup>
            <FlowLines 
              flows={flowMaps} 
              getFlowStyle={getFlowStyle}
            />
          </MarkerClusterGroup>
        )}

        <MapControls position="topleft" />
        <ScaleControl position="bottomleft" />
      </MapContainer>
    </Box>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object,
  flowMaps: PropTypes.array,
  selectedMonth: PropTypes.string,
  onMonthChange: PropTypes.func,
  availableMonths: PropTypes.arrayOf(PropTypes.string),
  spatialWeights: PropTypes.object,
  showFlows: PropTypes.bool,
  analysisResults: PropTypes.object,
  selectedCommodity: PropTypes.string,
  marketClusters: PropTypes.array,
  detectedShocks: PropTypes.array,
  visualizationMode: PropTypes.string,
  colorScales: PropTypes.object,
  onRegionSelect: PropTypes.func
};

export default React.memo(SpatialMap);