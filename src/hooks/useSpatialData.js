// src/hooks/useSpatialData.js

import { useDispatch, useSelector } from 'react-redux';
import { loadSpatialData } from '../slices/spatialSlice';
import { useEffect } from 'react';

const useSpatialData = () => {
  const dispatch = useDispatch();
  const spatialState = useSelector((state) => state.spatial);

  const { selectedCommodity, selectedDate } = spatialState.ui;

  useEffect(() => {
    if (selectedCommodity && selectedDate) {
      dispatch(loadSpatialData({ selectedCommodity, selectedDate }));
    }
  }, [dispatch, selectedCommodity, selectedDate]);

  return spatialState;
};

export default useSpatialData;