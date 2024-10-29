// src/components/analysis/spatial-analysis/index.js

import React from 'react';
import ErrorBoundary from '../../common/ErrorBoundary';
import SpatialAnalysis from './SpatialAnalysis';
import { WorkerProvider } from '../../../context/WorkerContext';
import { SpatialDataProvider } from '../../../context/SpatialDataContext';

const SpatialAnalysisWrapper = (props) => {
  return (
    <ErrorBoundary>
      <WorkerProvider>
        <SpatialDataProvider>
          <SpatialAnalysis {...props} />
        </SpatialDataProvider>
      </WorkerProvider>
    </ErrorBoundary>
  );
};

export default SpatialAnalysisWrapper;