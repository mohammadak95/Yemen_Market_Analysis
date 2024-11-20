// src/context/SpatialDataContext.js

import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { 
 fetchAllSpatialData,
 fetchFlowData,
 selectSpatialData,
 selectFlowData, 
 selectLoadingStatus,
 selectError
} from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const SpatialDataContext = createContext(null);

export const SpatialDataProvider = ({ children }) => {
 const dispatch = useDispatch();
 const data = useSelector(selectSpatialData);
 const flowData = useSelector(selectFlowData);
 const loading = useSelector(selectLoadingStatus);
 const error = useSelector(selectError);

 const fetchData = React.useCallback(async (commodity, date) => {
   const metric = backgroundMonitor.startMetric('spatial-data-fetch');
   try {
     await Promise.all([
       dispatch(fetchAllSpatialData({ commodity, date })),
       dispatch(fetchFlowData({ commodity, date }))
     ]);
     metric.finish({ status: 'success' });
   } catch (err) {
     metric.finish({ status: 'error', error: err.message });
   }
 }, [dispatch]);

 const value = React.useMemo(() => ({
   data,
   flowData,
   loading,
   error,
   fetchData
 }), [data, flowData, loading, error, fetchData]);

 return (
   <SpatialDataContext.Provider value={value}>
     {children}
   </SpatialDataContext.Provider>
 );
};

SpatialDataProvider.propTypes = {
 children: PropTypes.node.isRequired,
};

export const useSpatialData = () => {
 const context = useContext(SpatialDataContext);
 if (!context) {
   throw new Error('useSpatialData must be used within a SpatialDataProvider');
 }
 return context;
};

