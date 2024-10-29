// src/hooks/useWorkerProcessor.js

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const useWorkerProcessor = () => {
  const workerRef = useRef(null);
  const taskCallbacksRef = useRef(new Map());
  const [workerStatus, setWorkerStatus] = useState({
    isActive: false,
    currentTask: null,
    progress: 0
  });

  // Initialize worker
  useEffect(() => {
    // Create a new worker using URL.createObjectURL
    const workerCode = `
      // Worker implementation
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
        // Implementation
        return data;
      }

      function processFlowData(data) {
        // Implementation
        return data;
      }

      function generateCSV(data) {
        // Implementation
        return data;
      }

      function calculateStatistics(data) {
        // Implementation
        return data;
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));

    workerRef.current.onmessage = (event) => {
      const { type, data, error, taskId } = event.data;

      if (type === 'PROGRESS') {
        setWorkerStatus(prev => ({
          ...prev,
          progress: data.progress
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

      if (taskCallbacksRef.current.size === 0) {
        setWorkerStatus(prev => ({
          ...prev,
          isActive: false,
          currentTask: null,
          progress: 0
        }));
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const processData = useCallback(async (type, data) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    const taskId = uuidv4();
    setWorkerStatus(prev => ({
      ...prev,
      isActive: true,
      currentTask: type,
      progress: 0
    }));

    const promise = new Promise((resolve, reject) => {
      taskCallbacksRef.current.set(taskId, { resolve, reject });
    });

    workerRef.current.postMessage({
      type,
      data,
      taskId
    });

    return promise;
  }, []);

  const processGeoJSON = useCallback((data) => {
    return processData('PROCESS_GEOJSON', data);
  }, [processData]);

  const processFlowData = useCallback((data) => {
    return processData('PROCESS_FLOW_DATA', data);
  }, [processData]);

  const generateCSV = useCallback((data) => {
    return processData('GENERATE_CSV', data);
  }, [processData]);

  const calculateStatistics = useCallback((data) => {
    return processData('CALCULATE_STATISTICS', data);
  }, [processData]);

  return {
    workerStatus,
    processGeoJSON,
    processFlowData,
    generateCSV,
    calculateStatistics
  };
};