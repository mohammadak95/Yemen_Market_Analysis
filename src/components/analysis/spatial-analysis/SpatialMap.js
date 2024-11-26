// src/components/analysis/spatial-analysis/SpatialMap.js
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { getColorScale } from '../../../utils/colorScales';
import { MAP_SETTINGS } from '../../../constants';
import { safeGeoJSONProcessor } from '../../../utils/geoJSONProcessor';

const SpatialMap = ({ 
  visualizationData, 
  visualizationMode, 
  onRegionClick,
  mapSettings = MAP_SETTINGS 
}) => {
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

  const geoJsonData = useMemo(() => {
    if (!visualizationData?.geometry) return null;
    
    return safeGeoJSONProcessor(
      visualizationData.geometry, 
      visualizationMode
    );
  }, [visualizationData.geometry, visualizationMode]);

  if (!geoJsonData?.features) return null;

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
        data={geoJsonData}
        style={getFeatureStyle}
        onEachFeature={(feature, layer) => {
          const regionId = feature.properties.region_id;
          if (regionId) {
            layer.on({
              click: () => onRegionClick(regionId)
            });
          }
        }}
      />
    </MapContainer>
  );
};

export default React.memo(SpatialMap);
