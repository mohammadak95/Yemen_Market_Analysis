// src/components/analysis/spatial-analysis/components/autocorrelation/LISAMap.js

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { selectSpatialAutocorrelation, selectGeometryData } from '../../../selectors/optimizedSelectors';

const LISAMap = () => {
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const geometry = useSelector(selectGeometryData);

  const clusterTypes = {
    'high-high': '#d7191c',
    'low-low': '#2c7bb6',
    'high-low': '#fdae61',
    'low-high': '#abd9e9',
    'not significant': '#cccccc',
  };

  // Prepare GeoJSON data with cluster types
  const geoJsonData = useMemo(() => {
    if (!geometry || !spatialAutocorrelation?.local) return null;

    return {
      ...geometry.unified,
      features: geometry.unified.features.map((feature) => {
        const regionId = feature.properties.region_id.toLowerCase();
        const localStats = spatialAutocorrelation.local[regionId];
        return {
          ...feature,
          properties: {
            ...feature.properties,
            cluster_type: localStats ? localStats.cluster_type : 'not significant',
          },
        };
      }),
    };
  }, [geometry, spatialAutocorrelation]);

  // Define style for each region
  const getRegionStyle = (feature) => {
    const clusterType = feature.properties.cluster_type;
    const fillColor = clusterTypes[clusterType] || '#cccccc';

    return {
      fillColor,
      weight: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  // Handle tooltips
  const onEachFeature = (feature, layer) => {
    const regionName = feature.properties.region_id;
    const clusterType = feature.properties.cluster_type;

    const tooltipContent = `
      <strong>${regionName}</strong><br/>
      Cluster Type: ${clusterType}
    `;
    layer.bindTooltip(tooltipContent);

    layer.on('click', () => {
      // You can add interaction logic here if needed
    });
  };

  return (
    <MapContainer center={[15.3694, 44.191]} zoom={6} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {geoJsonData && (
        <GeoJSON data={geoJsonData} style={getRegionStyle} onEachFeature={onEachFeature} />
      )}
    </MapContainer>
  );
};

export default LISAMap;