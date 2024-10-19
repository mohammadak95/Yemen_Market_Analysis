// src/utils/mergeSpatialDataWithMapping.js

// Function to merge spatial data with mapping and exclusion logic, handling time-series data
export const mergeSpatialDataWithMapping = (geoBoundariesData, enhancedData, regionMapping, excludedRegions) => {
  const mergedFeatures = [];
  const unmatchedRegions = new Set();

  // Create a map for geoBoundaries using mapped region_id
  const geoBoundariesMap = new Map();
  geoBoundariesData.features.forEach(feature => {
      const originalShapeName = feature.properties.shapeName;
      const mappedRegionId = regionMapping[originalShapeName]
          ? regionMapping[originalShapeName].toLowerCase()
          : originalShapeName.toLowerCase();

      if (!mappedRegionId) {
          console.warn(`Unable to determine region_id for region: "${originalShapeName}"`);
          return;
      }

      // Exclude specified regions
      if (excludedRegions.map(r => r.toLowerCase()).includes(mappedRegionId)) {
          console.info(`Excluding region: ${originalShapeName}`);
          return;
      }

      geoBoundariesMap.set(mappedRegionId, feature);
  });

  // Iterate over enhancedData features and create separate features per region, commodity, date
  enhancedData.features.forEach((enhancedFeature, index) => {
      const region_id = enhancedFeature.properties.region_id
          ? enhancedFeature.properties.region_id.toLowerCase()
          : null;
      const commodity = enhancedFeature.properties.commodity
          ? enhancedFeature.properties.commodity.toLowerCase()
          : 'unknown';
      const date = enhancedFeature.properties.date
          ? enhancedFeature.properties.date.split('T')[0] // Extract date in YYYY-MM-DD
          : null;

      if (!region_id) {
          console.warn(`Enhanced data feature missing region_id:`, enhancedFeature);
          return;
      }

      if (!geoBoundariesMap.has(region_id)) {
          console.warn(`No geoBoundaries data for region_id: "${region_id}"`);
          unmatchedRegions.add(region_id);
          return;
      }

      const geoBoundaryFeature = geoBoundariesMap.get(region_id);

      // Create a new feature combining geoBoundary properties and enhancedFeature properties
      const mergedProperties = {
          ...geoBoundaryFeature.properties, // Original properties from geoBoundariesData
          ...enhancedFeature.properties, // Properties from enhancedData
          region_id, // Ensure region_id is present and mapped
          commodity, // Ensure commodity is present and mapped
          date, // Ensure date is present and mapped
      };

      // Assign a unique ID if not present
      const uniqueId = `${region_id}_${commodity}_${date}_${index}`;

      mergedFeatures.push({
          type: 'Feature',
          properties: {
              ...mergedProperties,
              id: uniqueId, // Assign unique ID
          },
          geometry: geoBoundaryFeature.geometry, // Use the geometry from geoBoundariesData
      });
  });

  // For regions in geoBoundariesMap that have no enhancedData, create features with empty properties
  geoBoundariesMap.forEach((geoFeature, region_id) => {
      // Check if any enhancedData exists for this region
      const hasData = enhancedData.features.some(feature =>
          feature.properties.region_id &&
          feature.properties.region_id.toLowerCase() === region_id
      );

      if (!hasData) {
          console.warn(`No enhanced data found for region_id: "${region_id}"`);

          // Create a feature with geoBoundary properties and null values for enhanced data
          const uniqueId = `${region_id}_no_data`;

          mergedFeatures.push({
              type: 'Feature',
              properties: {
                  ...geoFeature.properties,
                  region_id,
                  commodity: 'unknown',
                  date: null,
                  usdprice: null,
                  conflict_intensity: null,
                  residual: null,
                  id: uniqueId,
              },
              geometry: geoFeature.geometry,
          });
      }
  });

  console.warn('Unmatched regions:', Array.from(unmatchedRegions));

  return {
      type: 'FeatureCollection',
      features: mergedFeatures,
  };
};