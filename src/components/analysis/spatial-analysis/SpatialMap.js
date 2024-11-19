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
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedRegion } from '../../../slices/spatialSlice';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

const SpatialMap = ({
  geoJSON,
  flowMaps = [],
  showFlows = true,
  marketClusters = [],
  visualizationMode = 'prices',
  onRegionSelect,
  spatialViewConfig,
  onSpatialViewChange,
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const dispatch = useDispatch();
  const selectedRegion = useSelector((state) => state.spatial.ui.selectedRegion);

  const getRegionStyle = useCallback(
    (feature) => {
      const isSelected = selectedRegion === feature.properties.region_id;
      return {
        fillColor: getFillColor(feature),
        weight: isSelected ? 3 : 1,
        opacity: 1,
        color: isSelected ? theme.palette.secondary.main : '#666666',
        fillOpacity: 0.7,
      };
    },
    [selectedRegion, theme]
  );

  const getFillColor = (feature) => {
    if (visualizationMode === 'prices') {
      const price = feature.properties.usdprice;
      // Define a color scale for prices
      if (price != null) {
        // Example: Higher prices are darker red
        return price > 100 ? '#800026' :
               price > 80 ? '#BD0026' :
               price > 60 ? '#E31A1C' :
               price > 40 ? '#FC4E2A' :
               price > 20 ? '#FD8D3C' :
               price > 0 ? '#FEB24C' :
               '#FFEDA0';
      }
    } else if (visualizationMode === 'integration') {
      // Implement integration visualization coloring
      // Placeholder: All regions get the same color
      return '#41b6c4';
    } else if (visualizationMode === 'clusters') {
      // Color regions based on their cluster
      const clusterId = feature.properties.cluster_id;
      // Assign colors based on cluster ID
      const colors = ['#1f78b4', '#33a02c', '#e31a1c', '#ff7f00', '#6a3d9a'];
      return colors[clusterId % colors.length];
    } else if (visualizationMode === 'shocks') {
      // Highlight regions with shocks
      const hasShock = feature.properties.hasShock;
      return hasShock ? '#e31a1c' : '#cccccc';
    }
    // Default color
    return '#cccccc';
  };

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
        dispatch(setSelectedRegion(feature.properties.region_id));
        onRegionSelect(feature.properties.region_id);
      }
    },
    [onRegionSelect, dispatch]
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
      const { region_id, usdprice, conflict_intensity } = feature.properties;
      const content = `
        <strong>${region_id}</strong><br/>
        Price: $${usdprice != null ? usdprice.toFixed(2) : 'N/A'}<br/>
        Conflict Intensity: ${conflict_intensity != null ? conflict_intensity : 'N/A'}
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
    if (!geoJSON || !mapRef.current) return;

    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer.options && layer.options.pane === 'overlayPane') {
        mapRef.current.removeLayer(layer);
      }
    });

    // Add GeoJSON layer
    const geoJsonLayer = new L.GeoJSON(geoJSON, {
      style: getRegionStyle,
      onEachFeature: onEachFeature,
    }).addTo(mapRef.current);
  }, [geoJSON, getRegionStyle, onEachFeature]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(spatialViewConfig.center, spatialViewConfig.zoom);
    }
  }, [spatialViewConfig]);

  const handleMoveEnd = () => {
    const map = mapRef.current;
    if (map) {
      const newCenter = map.getCenter();
      const newZoom = map.getZoom();
      onSpatialViewChange({ center: [newCenter.lat, newCenter.lng], zoom: newZoom });
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      map.on('moveend', handleMoveEnd);
    }
    return () => {
      if (map) {
        map.off('moveend', handleMoveEnd);
      }
    };
  }, [onSpatialViewChange]);

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

  if (!geoJSON) {
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
        center={spatialViewConfig.center || DEFAULT_CENTER}
        zoom={spatialViewConfig.zoom || DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {geoJSON && (
          <GeoJSON
            data={geoJSON}
            style={getRegionStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {marketClusters && marketClusters.length > 0 && visualizationMode === 'clusters' && (
          <MarkerClusterGroup>
            {marketClusters.map((cluster) => {
              const clusterCenter = cluster.main_market_coordinates;
              if (!clusterCenter) return null;

              const marker = L.marker([clusterCenter.lat, clusterCenter.lng], {
                title: `Cluster ${cluster.cluster_id}`,
              });

              marker.bindPopup(`
                <strong>Cluster ${cluster.cluster_id}</strong><br/>
                Main Market: ${cluster.main_market}<br/>
                Markets: ${cluster.connected_markets.length}
              `);

              return marker;
            })}
          </MarkerClusterGroup>
        )}

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
  geoJSON: PropTypes.object.isRequired,
  flowMaps: PropTypes.array,
  showFlows: PropTypes.bool,
  marketClusters: PropTypes.array,
  visualizationMode: PropTypes.string,
  onRegionSelect: PropTypes.func,
  spatialViewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }).isRequired,
  onSpatialViewChange: PropTypes.func.isRequired,
};

export default React.memo(SpatialMap);