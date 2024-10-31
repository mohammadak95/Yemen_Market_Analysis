//src/hooks/uiHooks.js

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getMethodologyInfo, getMethodologySection } from '../utils/appUtils';

/**
 * Custom hook to handle processing tasks using a Web Worker.
 */
const useWorkerProcessor = () => {
  const workerRef = useRef(null);
  const taskCallbacksRef = useRef(new Map());
  
  const [workerStatus, setWorkerStatus] = useState({
    isActive: false,
    currentTask: null,
    progress: 0,
  });

  // Initialize the Web Worker
  useEffect(() => {
    // Define the worker's code as a string
    const workerCode = `
      self.onmessage = (event) => {
        const { type, data, taskId } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'PROCESS_GEOJSON':
              result = processGeoJSON(data);
              break;
            case 'PROCESS_FLOW_DATA':
              result = processFlowData(data);
              break;
            case 'GENERATE_CSV':
              result = generateCSV(data);
              break;
            case 'CALCULATE_STATISTICS':
              result = calculateStatistics(data);
              break;
            default:
              throw new Error(\`Unknown message type: \${type}\`);
          }
          
          self.postMessage({ type, data: result, taskId });
        } catch (error) {
          self.postMessage({ type: 'ERROR', error: error.message, taskId });
        }
      };

      // Worker utility functions
      function processGeoJSON(data) {
        // TODO: Implement GeoJSON processing logic
        return data;
      }

      function processFlowData(data) {
        // TODO: Implement flow data processing logic
        return data;
      }

      function generateCSV(data) {
        // TODO: Implement CSV generation logic
        return data;
      }

      function calculateStatistics(data) {
        // TODO: Implement statistics calculation logic
        return data;
      }
    `;

    // Create a Blob from the worker code
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerURL);

    // Handle messages received from the worker
    workerRef.current.onmessage = (event) => {
      const { type, data, error, taskId } = event.data;

      if (type === 'PROGRESS') {
        setWorkerStatus((prev) => ({
          ...prev,
          progress: data.progress,
        }));
        return;
      }

      const callback = taskCallbacksRef.current.get(taskId);
      if (callback) {
        if (error) {
          callback.reject(new Error(error));
        } else {
          callback.resolve(data);
        }
        taskCallbacksRef.current.delete(taskId);
      }

      // Update worker status if no pending tasks
      if (taskCallbacksRef.current.size === 0) {
        setWorkerStatus({
          isActive: false,
          currentTask: null,
          progress: 0,
        });
      }
    };

    // Cleanup: Terminate the worker when the component unmounts
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      URL.revokeObjectURL(workerURL);
    };
  }, []);

  /**
   * Sends data to the worker for processing.
   *
   * @param {string} type - The type of processing task.
   * @param {any} data - The data to be processed.
   * @returns {Promise<any>} - A promise that resolves with the processed data.
   */
  const processData = useCallback(async (type, data) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    const taskId = uuidv4();
    setWorkerStatus((prev) => ({
      ...prev,
      isActive: true,
      currentTask: type,
      progress: 0,
    }));

    const promise = new Promise((resolve, reject) => {
      taskCallbacksRef.current.set(taskId, { resolve, reject });
    });

    workerRef.current.postMessage({
      type,
      data,
      taskId,
    });

    return promise;
  }, []);

  // Specific processing functions
  const processGeoJSON = useCallback(
    (data) => processData('PROCESS_GEOJSON', data),
    [processData]
  );

  const processFlowData = useCallback(
    (data) => processData('PROCESS_FLOW_DATA', data),
    [processData]
  );

  const generateCSV = useCallback(
    (data) => processData('GENERATE_CSV', data),
    [processData]
  );

  const calculateStatistics = useCallback(
    (data) => processData('CALCULATE_STATISTICS', data),
    [processData]
  );

  return {
    workerStatus,
    processGeoJSON,
    processFlowData,
    generateCSV,
    calculateStatistics,
  };
};

/**
 * Custom hook to get the current window size.
 *
 * @returns {{ width: number | undefined, height: number | undefined }}
 */
function useWindowSize() {
  const isClient = typeof window === 'object';

  const getSize = () => ({
    width: isClient ? window.innerWidth : undefined,
    height: isClient ? window.innerHeight : undefined,
  });

  const [windowSize, setWindowSize] = useState(getSize);

  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      setWindowSize(getSize());
    };

    window.addEventListener('resize', handleResize);
    
    // Initialize with the current window size
    handleResize();

    // Cleanup: Remove event listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  return windowSize;
}

/**
 * Custom hook to provide technical help utilities based on component type.
 *
 * @param {string} componentType - The type of the component.
 * @returns {object} - An object containing methods to get tooltips, equations, concepts, and methodology.
 */
const useTechnicalHelp = (componentType) => {
  const getTechnicalTooltip = useCallback(
    (element) => {
      const info = getMethodologyInfo(componentType);
      return info?.tooltips?.[element] || null;
    },
    [componentType]
  );

  const getTechnicalEquation = useCallback(
    (equationType) => {
      const info = getMethodologyInfo(componentType);
      return info?.equations?.[equationType] || null;
    },
    [componentType]
  );

  const getTechnicalConcept = useCallback(
    (conceptKey) => {
      const info = getMethodologyInfo(componentType);
      return info?.concepts?.[conceptKey] || null;
    },
    [componentType]
  );

  const getMethodology = useCallback(() => {
    return getMethodologySection(componentType);
  }, [componentType]);

  return {
    getTechnicalTooltip,
    getTechnicalEquation,
    getTechnicalConcept,
    getMethodology,
  };
};

/**
 * Custom hook to lock or unlock body scroll.
 *
 * @param {boolean} isLocked - Whether to lock the body scroll.
 */
const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup: Reset overflow when component unmounts or isLocked changes
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLocked]);
};

// Export all custom hooks
export {
  useWorkerProcessor,
  useWindowSize,
  useTechnicalHelp,
  useBodyScrollLock,
};