import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Typography } from '@mui/material';
import CustomTooltip from './CustomTooltip';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'react-leaflet-markercluster/dist/styles.min.css';

const SpatialMap = ({ geoData }) => {
  if (!geoData) {
    return (
      <Typography variant="body1">
        No geographical data available.
      </Typography>
    );
  }

  // Calculate centroid for map center
  const centroid = useMemo(() => {
    if (geoData.features.length === 0) return [0, 0];
    const sum = geoData.features.reduce(
      (acc, feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        return { lng: acc.lng + lng, lat: acc.lat + lat };
      },
      { lng: 0, lat: 0 }
    );
    return [sum.lat / geoData.features.length, sum.lng / geoData.features.length];
  }, [geoData]);

  // Determine maximum residual for scaling
  const maxResidual = useMemo(() => {
    if (geoData.features.length === 0) return 1;
    return Math.max(...geoData.features.map(f => Math.abs(f.properties.residual)));
  }, [geoData]);

  const scaleFactor = 500 / maxResidual; // Adjust based on desired maximum radius

  return (
    <Paper sx={{ p: 2, height: '500px', position: 'relative' }}>
      <MapContainer center={centroid} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup>
          {geoData.features.map((feature) => {
            const { region_id, residual, date } = feature.properties;
            const [lng, lat] = feature.geometry.coordinates;
            const residualValue = residual;
            const color = residualValue > 0 ? 'red' : 'blue';
            const radius = Math.min(Math.abs(residualValue) * scaleFactor, 1000); // Set MAX_RADIUS as needed

            return (
              <Circle
                key={region_id}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{ color }}
              >
                <Tooltip>
                  <CustomTooltip
                    active={true}
                    payload={[{ payload: { region_id, date, residual: residualValue } }]}
                    label={`${region_id}`}
                  />
                </Tooltip>
              </Circle>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </Paper>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired,
};

export default SpatialMap;
