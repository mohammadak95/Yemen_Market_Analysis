// src/components/spatial-analysis/ChoroplethMap.js

import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { regionMapping, excludedRegions } from '../../utils/regionMapping';

const ChoroplethMap = ({ selectedCommodity, enhancedData, geoBoundaries, selectedDate }) => {
  const [mapData, setMapData] = useState(null);
  const [processingError, setProcessingError] = useState(null);

  // Memoize the mergeSpatialData function
  const mergeSpatialData = useCallback((adminData, enhancedData, selectedCommodity, selectedDate) => {
    const normalizeName = (name) => {
      if (typeof name !== 'string') {
        console.warn('Invalid name:', name);
        return '';
      }
      return name
        .trim()
        .toLowerCase()
        .replace(/governorate/g, "")
        .replace(/['']/g, "")
        .replace(/\s+/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    };

    const relevantFeatures = enhancedData.features.filter(feature => 
      feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
      new Date(feature.properties.date) <= selectedDate
    );

    const enhancedDataNameMap = new Map(
      relevantFeatures.map(feature => [
        normalizeName(feature.properties.admin1),
        feature.properties.admin1
      ])
    );

    const latestPrices = relevantFeatures.reduce((acc, feature) => {
      const regionId = feature.properties.admin1;
      if (!regionId) return acc; // Skip if admin1 is undefined

      const date = new Date(feature.properties.date);

      if (!acc[regionId] || date > acc[regionId].date) {
        acc[regionId] = {
          date: date,
          price: feature.properties.price
        };
      }

      return acc;
    }, {});

    const processedFeatures = adminData.features
      .map((feature) => {
        let originalShapeName = feature.properties.shapeName;

        // Validate shapeName
        if (typeof originalShapeName !== 'string') {
          console.warn('Invalid shapeName:', originalShapeName);
          return null; // Skip invalid entries
        }

        let normalizedShapeName = normalizeName(originalShapeName);
        let mappedShapeName = regionMapping[originalShapeName] || normalizedShapeName;

        const enhancedDataName = enhancedDataNameMap.get(mappedShapeName);

        if (excludedRegions.includes(mappedShapeName)) {
          console.info(`Excluding region: ${originalShapeName}`);
          return null;
        }

        if (!enhancedDataName) {
          console.warn(`No enhanced data found for mapped region: ${mappedShapeName}`);
          return null; // Skip if no data found
        }

        const latestPriceData = latestPrices[enhancedDataName];

        if (!latestPriceData) {
          console.warn(`No matching price data found for region: ${originalShapeName} (mapped: ${mappedShapeName}, enhanced: ${enhancedDataName || 'Not found'})`);
        }

        const latestPrice = latestPriceData ? latestPriceData.price : 0;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            latestPrice,
          },
        };
      })
      .filter(feature => feature !== null);

    return {
      ...adminData,
      features: processedFeatures,
    };
  }, []);

  useEffect(() => {
    if (!selectedCommodity || !enhancedData || !geoBoundaries || !selectedDate) {
      return;
    }

    const processSpatialData = () => {
      if (!geoBoundaries || !geoBoundaries.features) {
        setProcessingError('GeoBoundaries data format invalid or empty.');
        return;
      }

      if (!enhancedData || !enhancedData.features) {
        setProcessingError('Enhanced data format invalid or empty.');
        return;
      }

      try {
        const processedData = mergeSpatialData(geoBoundaries, enhancedData, selectedCommodity, selectedDate);
        if (processedData && processedData.features.length > 0) {
          setMapData(processedData);
        } else {
          setProcessingError(`No data available for ${selectedCommodity}`);
        }
      } catch (error) {
        setProcessingError(error.message);
      }
    };

    processSpatialData();
  }, [geoBoundaries, enhancedData, selectedCommodity, selectedDate, mergeSpatialData]);

  const getColor = (value) => {
    return value > 10 ? '#800026' :
      value > 8  ? '#BD0026' :
      value > 6  ? '#E31A1C' :
      value > 4  ? '#FC4E2A' :
      value > 2  ? '#FD8D3C' :
      value > 1  ? '#FEB24C' :
      value > 0  ? '#FED976' :
                  '#FFEDA0';
  };

  const style = (feature) => ({
    fillColor: getColor(feature.properties.latestPrice),
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
  });

  const onEachFeature = (feature, layer) => {
    layer.bindPopup(`
      <strong>${feature.properties.shapeName}</strong><br />
      Latest Price: $${feature.properties.latestPrice.toFixed(2)}
    `);
  };

  if (processingError) {
    return <div>Error processing map data: {processingError}</div>;
  }

  if (!mapData) {
    return <div>No data available for {selectedCommodity}</div>;
  }

  return (
    <MapContainer center={[15.3694, 44.1910]} zoom={6} style={{ height: '500px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={mapData} style={style} onEachFeature={onEachFeature} />
    </MapContainer>
  );
};

ChoroplethMap.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  enhancedData: PropTypes.object.isRequired,
  geoBoundaries: PropTypes.object.isRequired,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
};

export default ChoroplethMap;