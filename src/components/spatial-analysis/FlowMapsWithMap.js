import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper } from '@mui/material';
import L from 'leaflet';
import yemenGeoJSON from '../../data/yemen_simple.geojson'; // Ensure this is in WGS84

// Initialize Leaflet marker icons to avoid missing icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const FlowMapsWithMap = ({ flowMaps }) => {
  // Convert flowMaps to GeoJSON for easy integration with Leaflet
  const flowGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: flowMaps
        .filter((flow) => flow.source_lat && flow.source_lng && flow.target_lat && flow.target_lng) // Ensure valid coordinates
        .map((flow) => ({
          type: 'Feature',
          properties: {
            source: flow.source,
            target: flow.target,
            weight: flow.weight,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [flow.source_lng, flow.source_lat],
              [flow.target_lng, flow.target_lat],
            ],
          },
        })),
    };
  }, [flowMaps]);

  // Log the GeoJSON structure to debug invalid structures
  console.log('Flow GeoJSON Data:', flowGeoJSON);

  // Styling for flow lines based on the weight
  const geoJsonOptions = useMemo(() => ({
    style: (feature) => ({
      color: '#0077ff', // Set a standard color for flow lines
      weight: Math.min(feature.properties.weight / 10, 8), // Control the line width based on weight
      opacity: 0.7, // Slightly transparent for better readability
    }),
    onEachFeature: (feature, layer) => {
      const { source, target, weight } = feature.properties;
      layer.bindPopup(`
        <strong>Flow:</strong> ${source} → ${target}<br/>
        <strong>Weight:</strong> ${weight}
      `);
    },
  }), []);

  // Central Yemen coordinates for the map view
  const mapCenter = [15.3694, 44.1910]; // Center of Yemen
  const mapZoom = 6; // Suitable zoom level

  // Markers for each unique region (source or target) in the flow data
  const regionMarkers = useMemo(() => {
    const uniqueRegions = new Set(flowMaps.flatMap(flow => [flow.source, flow.target]));
    return Array.from(uniqueRegions).map((region) => {
      const flow = flowMaps.find((f) => f.source === region || f.target === region);
      const lat = flow.source === region ? flow.source_lat : flow.target_lat;
      const lng = flow.source === region ? flow.source_lng : flow.target_lng;
      return (
        <Marker key={region} position={[lat, lng]}>
          <Popup>
            <strong>{region}</strong><br />
            Latitude: {lat.toFixed(4)}<br />
            Longitude: {lng.toFixed(4)}
          </Popup>
        </Marker>
      );
    });
  }, [flowMaps]);

  return (
    <Paper sx={{ p: 2, height: '600px', position: 'relative' }}>
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {/* Yemen Boundary GeoJSON */}
        <GeoJSON data={yemenGeoJSON} style={{ color: 'green', weight: 2, fillOpacity: 0.1 }} />

        {/* Flow Lines from Flow GeoJSON */}
        <GeoJSON data={flowGeoJSON} {...geoJsonOptions} />

        {/* Region Markers */}
        {regionMarkers}
      </MapContainer>
    </Paper>
  );
};

FlowMapsWithMap.propTypes = {
  flowMaps: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      source_lat: PropTypes.number.isRequired,
      source_lng: PropTypes.number.isRequired,
      target: PropTypes.string.isRequired,
      target_lat: PropTypes.number.isRequired,
      target_lng: PropTypes.number.isRequired,
      weight: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default FlowMapsWithMap;