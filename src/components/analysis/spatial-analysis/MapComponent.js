// src/components/analysis/spatial-analysis/MapComponent.js

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import FlowLayer from './FlowLayer';
import ClusterLayer from './ClusterLayer';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({
  geoJSON,
  marketClusters,
  flowMaps,
  spatialViewConfig,
  onSpatialViewChange,
  onRegionClick,
  selectedRegion,
}) => {
  const { center, zoom } = spatialViewConfig;
  const mapRef = useRef();

  // Update map view when spatialViewConfig changes
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      map.setView(center, zoom);
    }
  }, [center, zoom]);

  // Handle map move events to update spatialViewConfig
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const handleMoveEnd = () => {
        const newCenter = map.getCenter();
        const newZoom = map.getZoom();
        onSpatialViewChange({ center: [newCenter.lat, newCenter.lng], zoom: newZoom });
      };
      map.on('moveend', handleMoveEnd);
      return () => {
        map.off('moveend', handleMoveEnd);
      };
    }
  }, [onSpatialViewChange]);

  // Function to style GeoJSON features
  const geoJSONStyle = (feature) => ({
    fillColor:
      selectedRegion === feature.properties.region_id
        ? '#FFD700' // Highlight selected region
        : feature.properties.isMainMarket
        ? '#ff7800'
        : '#3388ff',
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7,
  });

  // Function to handle feature clicks
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        if (onRegionClick) {
          onRegionClick(feature.properties.region_id);
        }
      },
    });
    layer.bindPopup(
      `<strong>${feature.properties.region_id}</strong><br/>
       Price: ${feature.properties.usdprice || 'N/A'}<br/>
       Conflict Intensity: ${feature.properties.conflict_intensity || 'N/A'}`
    );
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '600px', width: '100%' }}
      whenCreated={(mapInstance) => {
        mapRef.current = mapInstance;
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {geoJSON && (
        <GeoJSON
          data={geoJSON}
          style={geoJSONStyle}
          onEachFeature={onEachFeature}
        />
      )}
      {marketClusters && marketClusters.length > 0 && (
        <ClusterLayer clusters={marketClusters} />
      )}
      {flowMaps && flowMaps.length > 0 && (
        <FlowLayer flowData={flowMaps} />
      )}
      {/* Add other layers or components as needed */}
    </MapContainer>
  );
};

MapComponent.propTypes = {
  geoJSON: PropTypes.object.isRequired,
  marketClusters: PropTypes.array,
  flowMaps: PropTypes.array,
  spatialViewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }).isRequired,
  onSpatialViewChange: PropTypes.func.isRequired,
  onRegionClick: PropTypes.func,
  selectedRegion: PropTypes.string,
};

export default MapComponent;