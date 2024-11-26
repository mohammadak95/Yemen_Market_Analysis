import React, { useMemo, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON 
} from 'react-leaflet';
import { 
  Box, 
  ToggleButtonGroup, 
  ToggleButton, 
  Typography, 
  Paper 
} from '@mui/material';
import { scaleLinear } from 'd3-scale';
import SpatialErrorBoundary from '../../SpatialErrorBoundary';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { transformRegionName } from '../../utils/spatialUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SeasonalPriceMap = ({ 
  geometryData, 
  regionalPatterns 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(0);

  // Process GeoJSON with safe preprocessing
  const mapData = useMemo(() => {
    if (!geometryData?.features || !regionalPatterns) return null;

    const processedGeometry = safeGeoJSONProcessor(geometryData, 'seasonal');

    return {
      ...processedGeometry,
      features: processedGeometry.features.map(feature => {
        const originalName = feature.properties.originalName || 
                           feature.properties.region_id || 
                           feature.properties.name;
        const normalizedName = transformRegionName(originalName);
        const monthlyEffect = regionalPatterns[normalizedName]?.[selectedMonth] || 0;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            originalName,
            normalizedName,
            seasonalEffect: monthlyEffect
          }
        };
      })
    };
  }, [geometryData, regionalPatterns, selectedMonth]);

  // Color scale for seasonal effects
  const colorScale = useMemo(() => {
    const effects = mapData?.features?.map(f => f.properties.seasonalEffect) || [];
    const minEffect = Math.min(...effects);
    const maxEffect = Math.max(...effects);

    return scaleLinear()
      .domain([minEffect, 0, maxEffect])
      .range(['blue', 'white', 'red']);
  }, [mapData]);

  // Feature styling
  const getFeatureStyle = (feature) => {
    const effect = feature.properties.seasonalEffect;
    return {
      fillColor: colorScale(effect),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  // Tooltip for each feature
  const onEachFeature = (feature, layer) => {
    const displayName = feature.properties.originalName || feature.properties.normalizedName;
    const effect = feature.properties.seasonalEffect;
    
    layer.bindTooltip(`
      <strong>${displayName}</strong><br/>
      Seasonal Effect: ${(effect * 100).toFixed(1)}%
    `);
  };

  return (
    <SpatialErrorBoundary>
      <Box sx={{ height: '100%', position: 'relative' }}>
        <MapContainer
          center={[15.5, 48]} // Yemen's approximate center
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          {mapData && (
            <GeoJSON
              data={mapData}
              style={getFeatureStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

        {/* Month Selection */}
        <Paper 
          sx={{ 
            position: 'absolute', 
            bottom: 10, 
            left: 10, 
            p: 2, 
            zIndex: 1000 
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Select Month
          </Typography>
          <ToggleButtonGroup
            value={selectedMonth}
            exclusive
            onChange={(_, newMonth) => newMonth !== null && setSelectedMonth(newMonth)}
            orientation="horizontal"
            size="small"
          >
            {MONTHS.map((month, index) => (
              <ToggleButton key={month} value={index}>
                {month}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Paper>

        {/* Seasonal Effect Legend */}
        <Paper 
          sx={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10, 
            p: 2, 
            zIndex: 1000 
          }}
        >
          <Typography variant="subtitle2">
            Seasonal Price Effect
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">Low</Typography>
            <Box 
              sx={{ 
                width: 100, 
                height: 10, 
                background: `linear-gradient(to right, blue, white, red)` 
              }} 
            />
            <Typography variant="caption">High</Typography>
          </Box>
        </Paper>
      </Box>
    </SpatialErrorBoundary>
  );
};

export default React.memo(SeasonalPriceMap);
