// src/utils/leafletSetup.js

import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Clear existing icon settings
delete L.Icon.Default.prototype._getIconUrl;

// Set up default icon configurations
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

// Export a function to create custom colored icons
export const createCustomIcon = (color = 'blue') =>
  new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
    className: `custom-marker-icon-${color}`, // Optional: for additional styling
  });

// **New Controls Added Below**

/**
 * Custom Control for Managing Spatial Analysis Layers.
 */
L.Control.SpatialLayers = L.Control.extend({
  onAdd: function (map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

    container.style.backgroundColor = 'white';
    container.style.padding = '5px';

    const label = L.DomUtil.create('span', '', container);
    label.innerHTML = 'Spatial Layers';

    // Implement layer control logic here
    // For example, adding checkboxes to toggle different spatial layers

    return container;
  },

  onRemove: function (map) {
    // Cleanup if necessary
  },
});

/**
 * Custom Control for Displaying Spatial Metrics Legend.
 */
L.Control.SpatialLegend = L.Control.extend({
  onAdd: function (map) {
    const container = L.DomUtil.create('div', 'leaflet-control-spatial-legend');

    container.style.backgroundColor = 'white';
    container.style.padding = '10px';
    container.style.lineHeight = '1.5';
    container.style.fontSize = '12px';

    container.innerHTML = `
      <h4>Spatial Metrics</h4>
      <div>
        <span style="background-color: red; width: 10px; height: 10px; display: inline-block;"></span> High Significance<br/>
        <span style="background-color: yellow; width: 10px; height: 10px; display: inline-block;"></span> Medium Significance<br/>
        <span style="background-color: green; width: 10px; height: 10px; display: inline-block;"></span> Low Significance
      </div>
    `;

    return container;
  },

  onRemove: function (map) {
    // Cleanup if necessary
  },
});

// **Export Initialization Function (Optional)**
export const initializeLeafletControls = (map) => {
  const spatialLayersControl = new L.Control.SpatialLayers({ position: 'topright' });
  spatialLayersControl.addTo(map);

  const spatialLegendControl = new L.Control.SpatialLegend({ position: 'bottomright' });
  spatialLegendControl.addTo(map);
};
