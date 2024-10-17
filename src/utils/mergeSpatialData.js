// src/utils/mergeSpatialData.js

// Function to merge spatial data with mapping and exclusion logic
export const mergeSpatialDataWithMapping = (geoBoundariesData, enhancedData, regionMapping, excludedRegions) => {

  const enhancedDataMap = new Map(
    enhancedData.features.map((feature) => {
      const regionName = feature.properties.region_id;
      return [regionName, feature];
    })
  );

  const mergedFeatures = [];
  const unmatchedRegions = new Set();

  // Filter out excluded regions first
  const filteredGeoBoundariesData = geoBoundariesData.features.filter((feature) => {
    const originalShapeName = feature.properties.shapeName;
    const mappedShapeName = regionMapping[originalShapeName] || originalShapeName;
    if (excludedRegions.includes(mappedShapeName)) {
      console.info(`Excluding region: ${originalShapeName}`);
      return false;
    }
    return true;
  });

  filteredGeoBoundariesData.forEach((feature) => {
    const originalShapeName = feature.properties.shapeName;
    const mappedShapeName = regionMapping[originalShapeName] || originalShapeName;

    const enhancedFeature = enhancedDataMap.get(mappedShapeName);

    if (enhancedFeature) {
      mergedFeatures.push({
        type: 'Feature',
        properties: { ...feature.properties, ...enhancedFeature.properties },
        geometry: feature.geometry,
      });
    } else {
      unmatchedRegions.add(originalShapeName);
      console.warn(`No enhanced data found for mapped region: ${mappedShapeName}`);
    }
  });

  console.warn('Unmatched regions:', Array.from(unmatchedRegions));

  return {
    type: 'FeatureCollection',
    features: mergedFeatures,
  };
};