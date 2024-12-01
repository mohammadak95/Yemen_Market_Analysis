import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

// Yemen bounds - adjusted to be tighter around the country
const YEMEN_BOUNDS = [
  [12.7, 42.6], // Southwest - adjusted north and east
  [18.5, 53.2]  // Northeast - adjusted south and west
];

const YEMEN_CENTER = [15.3694, 47.8]; // Adjusted longitude east
const DEFAULT_ZOOM = 7; // Increased zoom level

// Map bounds enforcer component
const BoundsEnforcer = () => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      // Set max bounds
      map.setMaxBounds(YEMEN_BOUNDS);
      // Restrict zoom levels
      map.setMinZoom(7);  // Increased minimum zoom
      map.setMaxZoom(9);  // Increased maximum zoom
      // Disable keyboard navigation
      map.keyboard.disable();
      // Disable scroll wheel zoom
      map.scrollWheelZoom.disable();
      // Disable drag outside bounds
      map.on('drag', () => {
        map.panInsideBounds(YEMEN_BOUNDS, { animate: false });
      });
    }
  }, [map]);

  return null;
};

const BaseMap = ({ children, height = '100%' }) => {
  return (
    <MapContainer
      center={YEMEN_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height, width: '100%' }}
      zoomControl={false} // We'll add custom zoom controls
      attributionControl={false} // Remove attribution control
    >
      <TileLayer
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
      />
      <BoundsEnforcer />
      {children}
    </MapContainer>
  );
};

BaseMap.propTypes = {
  children: PropTypes.node,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default BaseMap;
