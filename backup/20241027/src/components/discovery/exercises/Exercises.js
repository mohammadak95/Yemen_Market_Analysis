// src/components/discovery/exercises/Exercises.js

import React from 'react';
import PropTypes from 'prop-types';
import ECMExercise from './ECMExercise';
import PriceDifferentialExercise from './PriceDifferentialExercise';
import SpatialExercise from './SpatialExercise';
import TVMIIExercise from './TVMIIExercise';

const Exercises = ({ exerciseType }) => {
  const renderExercise = () => {
    switch (exerciseType) {
      case 'ecm':
        return <ECMExercise />;
      case 'priceDiff':
        return <PriceDifferentialExercise />;
      case 'spatial':
        return <SpatialExercise />;
      case 'tvmii':
        return <TVMIIExercise />;
      default:
        return <div>Invalid exercise type</div>;
    }
  };

  return <>{renderExercise()}</>;
};

Exercises.propTypes = {
  exerciseType: PropTypes.oneOf(['ecm', 'priceDiff', 'spatial', 'tvmii']).isRequired,
};

export default Exercises;
