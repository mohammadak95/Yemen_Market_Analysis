// src/hooks/useOptimizedWorker.js

import { useCallback, useEffect, useRef } from 'react';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const MAX_CONCURRENT_WORKERS = 4;

export const useOptimizedWorker = () => {
  const workersRef = useRef([]);
  const taskQueueRef = useRef([]);
  const activeTasksRef = useRef(new Map());

  // Initialize workers
  useEffect(() => {
    const initWorkers = () => {
      const workerScript = new Blob([
        `importScripts('${process.env.PUBLIC_URL}/optimizedSpatialWorker.js');`
      ], { type: 'application/javascript' });
      
      const workerUrl = URL.createObjectURL(workerScript);
      
      for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
        const worker = new Worker(workerUrl);
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        workersRef.current.push({
          worker,
          busy: false
        });
      }
      
      URL.revokeObjectURL(workerUrl);
    };

    initWorkers();
    return () => {
      workersRef.current.forEach(({ worker }) => worker.terminate());
      workersRef.current = [];
    };
  }, []);

  const handleWorkerMessage = useCallback((e) => {
    const { type, taskId, data, error } = e.data;
    const task = activeTasksRef.current.get(taskId);
    
    if (!task) return;

    switch (type) {
      case 'COMPLETE':
        task.resolve(data);
        break;
      case 'ERROR':
        task.reject(new Error(error));
        break;
      case 'PROGRESS':
        task.onProgress?.(data.progress);
        break;
    }

    if (type === 'COMPLETE' || type === 'ERROR') {
      activeTasksRef.current.delete(taskId);
      const workerInfo = workersRef.current.find(w => w.worker === e.target);
      if (workerInfo) {
        workerInfo.busy = false;
        processNextTask();
      }
    }
  }, []);

  const handleWorkerError = useCallback((error) => {
    console.error('Worker error:', error);
    backgroundMonitor.logError('worker-error', { error: error.message });
  }, []);

  const processNextTask = useCallback(() => {
    if (taskQueueRef.current.length === 0) return;
    
    const availableWorker = workersRef.current.find(w => !w.busy);
    if (!availableWorker) return;
    
    const task = taskQueueRef.current.shift();
    availableWorker.busy = true;
    
    try {
      availableWorker.worker.postMessage({
        type: task.type,
        payload: task.payload,
        taskId: task.id
      });
    } catch (error) {
      task.reject(error);
      availableWorker.busy = false;
      processNextTask();
    }
  }, []);

  const executeTask = useCallback((type, payload, onProgress) => {
    return new Promise((resolve, reject) => {
      const taskId = Math.random().toString(36).slice(2);
      
      const task = {
        id: taskId,
        type,
        payload,
        resolve,
        reject,
        onProgress,
        timestamp: Date.now()
      };
      
      activeTasksRef.current.set(taskId, task);
      taskQueueRef.current.push(task);
      processNextTask();
    });
  }, [processNextTask]);

  // Exposed API
  const computeClusters = useCallback((features, weights, flows) => {
    return executeTask('COMPUTE_CLUSTERS', { features, weights, flows });
  }, [executeTask]);

  const processTimeSeries = useCallback((features, startDate, endDate) => {
    return executeTask('PROCESS_TIME_SERIES', { features, startDate, endDate });
  }, [executeTask]);

  const detectShocks = useCallback((features, date, threshold) => {
    return executeTask('DETECT_SHOCKS', { features, date, threshold });
  }, [executeTask]);

  return {
    computeClusters,
    processTimeSeries,
    detectShocks
  };
};