// src/components/analysis/spatial-analysis/SpatialMap.js
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { getColorScale } from '../../../utils/colorScales';
import { MAP_SETTINGS } from '../../../constants';
import { safeGeoJSONProcessor } from '../../../utils/geoJSONProcessor';
import { transformRegionName } from './utils/spatialUtils';

const SpatialMap = ({ 
  visualizationData, 
  visualizationMode, 
  onRegionClick,
  mapSettings = MAP_SETTINGS 
}) => {
  // Process geometry with standardized naming
  const processedData = useMemo(() => {
    if (!visualizationData?.geometry) return null;
    
    const processedGeometry = safeGeoJSONProcessor(visualizationData.geometry, visualizationMode);
    
    // Apply consistent region name transformation
    if (processedGeometry?.features) {
      processedGeometry.features = processedGeometry.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          normalizedName: transformRegionName(feature.properties.region_id || 
                                            feature.properties.normalizedName || 
                                            feature.properties.name)
        }
      }));
    }

    return {
      ...visualizationData,
      geometry: processedGeometry
    };
  }, [visualizationData, visualizationMode]);

  const getFeatureStyle = (feature) => {
    const colorScale = getColorScale(visualizationMode);
    const value = feature?.properties?.[`${visualizationMode}_value`];
    
    return {
      fillColor: value != null ? colorScale(value) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  if (!processedData?.geometry?.features) return null;

  return (
    <MapContainer
      center={mapSettings.DEFAULT_CENTER}
      zoom={mapSettings.DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url={mapSettings.TILE_LAYER}
        attribution={mapSettings.ATTRIBUTION}
      />
      <GeoJSON
        data={processedData.geometry}
        style={getFeatureStyle}
        onEachFeature={(feature, layer) => {
          const normalizedName = feature.properties.normalizedName;
          const displayName = feature.properties.originalName || normalizedName;
          
          if (normalizedName) {
            layer.bindTooltip(displayName);
            layer.on({
              click: () => onRegionClick(normalizedName)
            });
          }
        }}
      />
    </MapContainer>
  );
};

export default React.memo(SpatialMap);
