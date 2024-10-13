import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Typography } from '@mui/material';
import CustomTooltip from './CustomTooltip';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'react-leaflet-markercluster/dist/styles.min.css';

const FlowMapsWithMap = ({ flowMaps, geoCoordinates }) => {
  // Function to get coordinates for a region
  const getCoordinates = (regionId) => {
    const coord = geoCoordinates[regionId];
    if (coord) {
      return [coord.lat, coord.lng];
    }
    return null;
  };

  // Calculate bounds for map view
  const bounds = useMemo(() => {
    const latlngs = flowMaps.flatMap(flow => {
      const source = getCoordinates(flow.source_region_id);
      const target = getCoordinates(flow.target_region_id);
      return source && target ? [source, target] : [];
    });
    return latlngs.length > 0 ? latlngs : [[0, 0]];
  }, [flowMaps, geoCoordinates]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Flow Maps
      </Typography>
      <MapContainer bounds={bounds} style={{ height: '500px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup>
          {flowMaps.map((flow, index) => {
            const sourceCoord = getCoordinates(flow.source_region_id);
            const targetCoord = getCoordinates(flow.target_region_id);
            if (sourceCoord && targetCoord) {
              return (
                <Polyline
                  key={`${flow.source_region_id}-${flow.target_region_id}-${index}`}
                  positions={[sourceCoord, targetCoord]}
                  color="blue"
                  weight={2}
                  opacity={0.6}
                >
                  <Tooltip>
                    <CustomTooltip
                      active={true}
                      payload={[{ payload: { flow } }]}
                      label={`Flow from ${flow.source_region_id} to ${flow.target_region_id}`}
                    />
                  </Tooltip>
                </Polyline>
              );
            }
            console.warn(`Missing coordinates for flow from ${flow.source_region_id} to ${flow.target_region_id}`);
            return null;
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </Paper>
  );
};

FlowMapsWithMap.propTypes = {
  flowMaps: PropTypes.arrayOf(
    PropTypes.shape({
      source_region_id: PropTypes.string.isRequired,
      target_region_id: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  geoCoordinates: PropTypes.object.isRequired,
};

export default FlowMapsWithMap;
