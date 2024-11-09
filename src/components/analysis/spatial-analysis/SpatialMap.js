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
import MarkerClusterGroup from 'react-leaflet-markercluster'; // Assuming this library is installed

// Constants
const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

// Custom Map Controls Component
const MapControls = ({ position, onZoomIn, onZoomOut, onReset }) => {
  const map = useMap();

  const handleZoomIn = () => {
    map.setZoom(map.getZoom() + 1);
    onZoomIn?.();
  };

  const handleZoomOut = () => {
    map.setZoom(map.getZoom() - 1);
    onZoomOut?.();
  };

  const handleReset = () => {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    onReset?.();
  };

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

MapControls.propTypes = {
  position: PropTypes.string,
  onZoomIn: PropTypes.func,
  onZoomOut: PropTypes.func,
  onReset: PropTypes.func
};

// Flow Lines Component
const FlowLines = React.memo(({ flows, getFlowStyle }) => {
  return flows.map((flow, idx) => {
    if (!flow.source_lat || !flow.source_lng || !flow.target_lat || !flow.target_lng) {
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
          <div>
            <strong>{flow.source} → {flow.target}</strong><br/>
            Flow Weight: {flow.flow_weight?.toFixed(2) || 'N/A'}<br/>
            Price Differential: {flow.price_differential?.toFixed(2) || 'N/A'}%
          </div>
        </LeafletTooltip>
      </Polyline>
    );
  });
});

FlowLines.propTypes = {
  flows: PropTypes.array.isRequired,
  getFlowStyle: PropTypes.func.isRequired
};

// Market Clusters Component
const MarketClusters = React.memo(({ clusters, getClusterStyle }) => {
  return clusters.map((cluster, idx) => (
    <CircleMarker
      key={`cluster-${idx}`}
      center={[cluster.lat, cluster.lng]}
      radius={Math.sqrt(cluster.size) * 5}
      {...getClusterStyle(cluster)}
    >
      <LeafletTooltip>
        <div>
          <strong>Market Cluster {index + 1}</strong><br/>
          Size: {cluster.size} markets<br/>
          Main Market: {cluster.mainMarket}<br/>
          Average Flow: {cluster.avgFlow?.toFixed(2)}
        </div>
      </LeafletTooltip>
    </CircleMarker>
  ));
});

MarketClusters.propTypes = {
  clusters: PropTypes.array.isRequired,
  getClusterStyle: PropTypes.func.isRequired
};

// Market Shocks Component
const MarketShocks = React.memo(({ shocks, getShockStyle }) => {
  return shocks.map((shock, idx) => (
    <CircleMarker
      key={`shock-${idx}`}
      center={[shock.lat, shock.lng]}
      radius={10 * shock.magnitude}
      {...getShockStyle(shock)}
    >
      <LeafletTooltip>
        <div>
          <strong>Market Shock</strong><br/>
          Region: {shock.region}<br/>
          Type: {shock.type}<br/>
          Magnitude: {(shock.magnitude * 100).toFixed(1)}%<br/>
          Severity: {shock.severity}
        </div>
      </LeafletTooltip>
    </CircleMarker>
  ));
});

MarketShocks.propTypes = {
  shocks: PropTypes.array.isRequired,
  getShockStyle: PropTypes.func.isRequired
};

const SpatialMap = ({
  geoData,
  flowMaps = [],
  selectedMonth,
  onMonthChange,
  availableMonths = [],
  spatialWeights = {},
  showFlows = true,
  onToggleFlows,
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

  // Style generators
  const getRegionStyle = useCallback((feature) => {
    if (!feature?.properties) return {};

    const baseStyle = {
      fillOpacity: 0.7,
      weight: 1,
      opacity: 1,
      color: theme.palette.divider,
      dashArray: ''
    };

    try {
      const color = colorScales.getColor(feature);
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
    const baseStyle = {
      weight: Math.max(1, Math.min(5, flow.flow_weight / 10)),
      opacity: 0.6,
      dashArray: null
    };

    // Style based on visualization mode
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

  // Shock style generator
  const getShockStyle = useCallback((shock) => ({
    color: shock.severity === 'high' ? 'red' : 'orange',
    fillColor: shock.severity === 'high' ? 'red' : 'orange',
    fillOpacity: 0.8,
    radius: 8
  }), []);

  // Cluster style generator
  const getClusterStyle = useCallback((cluster) => ({
    color: 'blue',
    fillColor: 'blue',
    fillOpacity: 0.6,
    radius: Math.sqrt(cluster.size) * 5
  }), []);

  // Event handlers
  const onEachFeature = useCallback((feature, layer) => {
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

    // Bind tooltip
    const tooltipContent = `
      <strong>${feature.properties.region || feature.properties.region_id}</strong><br/>
      Price: ${feature.properties.price?.toFixed(2) || 'N/A'} ${analysisResults?.units || ''}<br/>
      ${visualizationMode === 'market_integration' ? 
        `Residual: ${feature.properties.residual?.toFixed(3) || 'N/A'}<br/>` : ''}
      Connections: ${spatialWeights[feature.properties.region_id]?.neighbors?.length || 0}
    `;
    layer.bindTooltip(tooltipContent, { sticky: true });
  }, [getRegionStyle, onRegionSelect, analysisResults, visualizationMode, spatialWeights]);

  // Map initialization and updates
  useEffect(() => {
    if (mapRef.current && geoJsonRef.current) {
      geoJsonRef.current.clearLayers();
      if (geoData) {
        L.geoJSON(geoData, {
          style: getRegionStyle,
          onEachFeature
        }).addTo(geoJsonRef.current);
      }
    }
  }, [geoData, getRegionStyle, onEachFeature]);

  // Debounced map update to prevent excessive re-renders
  const debouncedMapUpdate = useMemo(() => debounce(() => {
    if (mapRef.current && geoJsonRef.current) {
      geoJsonRef.current.clearLayers();
      if (geoData) {
        L.geoJSON(geoData, {
          style: getRegionStyle,
          onEachFeature
        }).addTo(geoJsonRef.current);
      }
    }
  }, 300), [geoData, getRegionStyle, onEachFeature]);

  useEffect(() => {
    debouncedMapUpdate();
    return () => {
      debouncedMapUpdate.cancel();
    };
  }, [debouncedMapUpdate]);

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
        {/* Base Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* GeoJSON Layer */}
        <GeoJSON
          ref={geoJsonRef}
          data={geoData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />

        {/* Flow Lines with Marker Clustering */}
        {showFlows && (
          <MarkerClusterGroup>
            <FlowLines 
              flows={flowMaps} 
              getFlowStyle={getFlowStyle}
            />
          </MarkerClusterGroup>
        )}

        {/* Market Clusters */}
        {visualizationMode === 'clusters' && (
          <MarketClusters 
            clusters={marketClusters}
            getClusterStyle={getClusterStyle}
          />
        )}

        {/* Market Shocks */}
        {visualizationMode === 'shocks' && (
          <MarketShocks 
            shocks={detectedShocks}
            getShockStyle={getShockStyle}
          />
        )}

        {/* Controls */}
        <MapControls position="topleft" />
        <ScaleControl position="bottomleft" />
      </MapContainer>
    </Box>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object,
  flowMaps: PropTypes.array,
  selectedMonth: PropTypes.string.isRequired,
  onMonthChange: PropTypes.func,
  availableMonths: PropTypes.arrayOf(PropTypes.string),
  spatialWeights: PropTypes.object,
  showFlows: PropTypes.bool,
  onToggleFlows: PropTypes.func,
  analysisResults: PropTypes.object,
  selectedCommodity: PropTypes.string,
  marketClusters: PropTypes.array,
  detectedShocks: PropTypes.array,
  visualizationMode: PropTypes.string.isRequired,
  colorScales: PropTypes.object.isRequired,
  onRegionSelect: PropTypes.func
};

export default React.memo(SpatialMap);
