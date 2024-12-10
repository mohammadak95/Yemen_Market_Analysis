/**
 * Base Map Component
 * 
 * Provides a consistent map base for all spatial visualizations with:
 * - Enforced bounds for Yemen
 * - Custom view settings
 * - Automatic bounds fitting
 * - Consistent styling
 */

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

// Yemen bounds - adjusted to be tighter around the country
const YEMEN_BOUNDS = [
  [12.7, 42.6], // Southwest - adjusted north and east
  [18.5, 53.2]  // Northeast - adjusted south and west
];

const DEFAULT_VIEW = {
  center: [15.3694, 47.8], // Adjusted longitude east
  zoom: 5.5 // Default zoom for overview
};

// Map view controller component
const MapController = ({ defaultView, defaultBounds }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      // Set max bounds
      map.setMaxBounds(YEMEN_BOUNDS);
      
      // Set zoom constraints
      map.setMinZoom(5);  // Allow more zoom out for overview
      map.setMaxZoom(9);  // Keep max zoom consistent
      
      // Disable keyboard navigation
      map.keyboard.disable();
      
      // Disable scroll wheel zoom
      map.scrollWheelZoom.disable();
      
      // Enforce bounds on drag
      map.on('drag', () => {
        map.panInsideBounds(YEMEN_BOUNDS, { animate: false });
      });

      // Handle default bounds if provided
      if (defaultBounds) {
        try {
          map.fitBounds(defaultBounds, {
            padding: [20, 20],
            maxZoom: 8,
            animate: true,
            duration: 1
          });
        } catch (error) {
          console.warn('Error fitting to bounds:', error);
          // Fallback to default view
          map.setView(
            defaultView?.center || DEFAULT_VIEW.center,
            defaultView?.zoom || DEFAULT_VIEW.zoom,
            { animate: true }
          );
        }
      }
      // Use default view if no bounds provided
      else if (defaultView && defaultView.center && defaultView.zoom) {
        map.setView(defaultView.center, defaultView.zoom, { animate: true });
      }
    }
  }, [map, defaultView, defaultBounds]);

  return null;
};

const BaseMap = ({ 
  children, 
  height = '100%',
  defaultView = DEFAULT_VIEW,
  defaultBounds = null
}) => {
  return (
    <MapContainer
      center={defaultView.center}
      zoom={defaultView.zoom}
      style={{ 
        height, 
        width: '100%',
        backgroundColor: '#f8f9fa' // Light background
      }}
      zoomControl={false} // We'll add custom zoom controls
      attributionControl={false} // Remove attribution control
    >
      <TileLayer
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
      />
      <MapController 
        defaultView={defaultView} 
        defaultBounds={defaultBounds}
      />
      {children}
    </MapContainer>
  );
};

BaseMap.propTypes = {
  children: PropTypes.node,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultView: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number),
    zoom: PropTypes.number
  }),
  defaultBounds: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  )
};

export default BaseMap;
