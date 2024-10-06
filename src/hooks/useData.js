// src/hooks/useData.js
import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

const useData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const path = getDataPath('enhanced_unified_data_with_residual.geojson');
        console.log("Fetching data from:", path);
        const response = await fetch(path, {
          headers: {
            'Accept': 'application/geo+json',
          },
        });
        
        console.log("Response status:", response.status);
        console.log("Response headers:", JSON.stringify([...response.headers]));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/geo+json')) {
          console.warn(`Unexpected content type: ${contentType}. Expected application/geo+json.`);
        }

        const geojsonData = await response.json();
        console.log("GeoJSON data loaded, features count:", geojsonData.features.length);

        if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
          throw new Error("Invalid GeoJSON structure: 'features' array is missing");
        }

        // Process the GeoJSON data more efficiently
        const commodities = new Set();
        const regimes = new Set();
        const regions = new Set();
        let minDate = new Date();
        let maxDate = new Date(0);

        const processedData = geojsonData.features.reduce((acc, feature) => {
          const { properties, geometry } = feature;
          const date = new Date(properties.date);
          
          commodities.add(properties.commodity);
          regimes.add(properties.regime);
          regions.add(properties.region_id);
          
          if (date < minDate) minDate = date;
          if (date > maxDate) maxDate = date;

          acc.push({
            region_id: properties.region_id,
            date,
            usdprice: parseFloat(properties.usdprice),
            conflict_intensity: parseFloat(properties.conflict_intensity),
            residual: parseFloat(properties.residual),
            commodity: properties.commodity,
            regime: properties.regime,
            geometry
          });

          return acc;
        }, []);

        setData({
          features: processedData,
          commodities: Array.from(commodities),
          regimes: Array.from(regimes),
          regions: Array.from(regions),
          dateRange: { min: minDate, max: maxDate }
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

export default useData;