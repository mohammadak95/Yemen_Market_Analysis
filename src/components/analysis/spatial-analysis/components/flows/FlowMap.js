import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import SpatialErrorBoundary from '../../SpatialErrorBoundary';

const FlowMap = ({ 
  geometry, 
  flows, 
  markets, 
  metricType = 'totalFlow',
  marketCoordinates 
}) => {
  const theme = useTheme();

  const regionStyle = {
    fillColor: theme.palette.background.default,
    weight: 1,
    opacity: 0.7,
    color: theme.palette.divider,
    fillOpacity: 0.3
  };

  // Process GeoJSON with safe preprocessing
  const processedGeometry = useMemo(() => {
    return geometry ? safeGeoJSONProcessor(geometry, 'flows') : null;
  }, [geometry]);

  // Calculate flow line properties
  const flowLines = useMemo(() => {
    if (!flows || !marketCoordinates) return [];

    return flows
      .filter(flow => flow[metricType] > 0)
      .map(flow => {
        const sourceCoords = marketCoordinates[flow.source];
        const targetCoords = marketCoordinates[flow.target];

        if (!sourceCoords || !targetCoords) return null;

        return {
          ...flow,
          sourceCoords,
          targetCoords
        };
      })
      .filter(Boolean);
  }, [flows, marketCoordinates, metricType]);

  // Render flow lines
  const renderFlowLines = () => {
    return flowLines.map((flow, index) => {
      const lineWidth = Math.log(flow[metricType] + 1) * 2;
      
      return (
        <React.Fragment key={index}>
          <CircleMarker
            center={flow.sourceCoords}
            radius={3}
            color={theme.palette.primary.main}
            fillColor={theme.palette.primary.light}
            fillOpacity={0.7}
          />
          <CircleMarker
            center={flow.targetCoords}
            radius={3}
            color={theme.palette.secondary.main}
            fillColor={theme.palette.secondary.light}
            fillOpacity={0.7}
          />
          <svg>
            <line
              x1={flow.sourceCoords[0]}
              y1={flow.sourceCoords[1]}
              x2={flow.targetCoords[0]}
              y2={flow.targetCoords[1]}
              stroke={theme.palette.primary.main}
              strokeWidth={lineWidth}
              strokeOpacity={0.6}
            />
          </svg>
        </React.Fragment>
      );
    });
  };

  return (
    <SpatialErrorBoundary>
      <MapContainer
        center={[15.5, 48]} // Yemen's approximate center
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        
        {processedGeometry && (
          <GeoJSON 
            data={processedGeometry} 
            style={() => regionStyle} 
          />
        )}
        
        {renderFlowLines()}
      </MapContainer>
    </SpatialErrorBoundary>
  );
};

export default React.memo(FlowMap);
