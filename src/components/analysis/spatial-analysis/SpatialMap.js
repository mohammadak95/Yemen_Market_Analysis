// src/components/analysis/spatial-analysis/SpatialMap.js
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { getColorScale } from '../../../utils/colorScales';
import { MAP_SETTINGS } from '../../../constants';

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

  const geoJsonData = useMemo(() => ({
    ...visualizationData.geometry,
    features: visualizationData.geometry?.features?.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        [`${visualizationMode}_value`]: 
          visualizationMode === 'prices' ? feature.properties.avgUsdPrice :
          visualizationMode === 'integration' ? feature.properties.integrationScore :
          visualizationMode === 'conflicts' ? feature.properties.conflictIntensity :
          null
      }
    }))
  }), [visualizationData.geometry, visualizationMode]);

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
          layer.on({
            click: () => onRegionClick(feature.properties.region_id)
          });
        }}
      />
    </MapContainer>
  );
};

export default React.memo(SpatialMap);