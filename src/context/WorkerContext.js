// src/context/WorkerContext.js

import React, { createContext, useContext } from 'react';
import { useWorkerProcessor } from '@/hooks';;

const WorkerContext = createContext(null);

export const WorkerProvider = ({ children }) => {
  const workerProcessor = useWorkerProcessor();
  
  return (
    <WorkerContext.Provider value={workerProcessor}>
      {children}
    </WorkerContext.Provider>
  );
};

export const useWorker = () => {
  const context = useContext(WorkerContext);
  if (!context) {
    throw new Error('useWorker must be used within a WorkerProvider');
  }
  return context;
};