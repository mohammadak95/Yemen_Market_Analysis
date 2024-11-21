// spatialWorker.js
const processGeoData = (data) => {
    // Heavy processing logic moved from spatialHandler
    const features = data.features || [];
    const commodities = new Set();
    
    features.forEach(feature => {
      if (feature?.properties?.commodity) {
        commodities.add(feature.properties.commodity.toLowerCase().trim());
      }
    });
  
    return {
      commodities: [...commodities].sort(),
      processedFeatures: features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          commodity: f.properties.commodity?.toLowerCase?.()
        }
      }))
    };
  };
  
  self.onmessage = async (e) => {
    const { type, payload } = e.data;
  
    switch (type) {
      case 'PROCESS_GEO_DATA':
        try {
          const result = processGeoData(payload);
          self.postMessage({ type: 'PROCESS_COMPLETE', payload: result });
        } catch (error) {
          self.postMessage({ type: 'PROCESS_ERROR', error: error.message });
        }
        break;
  
      case 'PROCESS_COMMODITY_DATA':
        try {
          // Process commodity specific data
          const processed = payload.data.map(item => ({
            ...item,
            processed: true
          }));
          self.postMessage({ 
            type: 'COMMODITY_PROCESS_COMPLETE', 
            payload: processed 
          });
        } catch (error) {
          self.postMessage({ 
            type: 'PROCESS_ERROR', 
            error: error.message 
          });
        }
        break;
    }
  };