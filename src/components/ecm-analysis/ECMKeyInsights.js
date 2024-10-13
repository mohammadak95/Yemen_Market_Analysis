// src/components/ecm-analysis/ECMKeyInsights.js

import React from 'react';
import PropTypes from 'prop-types';
import Interpretation from '../common/Interpretation';

const ECMKeyInsights = ({ analysisResult }) => {
  const messages = [];

  if (analysisResult.model_name) {
    messages.push(
      `The ECM model for ${analysisResult.model_name} indicates significant findings in the relationship between USD Price and Conflict Intensity.`
    );
  }

  if (analysisResult.price_differential_description) {
    messages.push(`The price differential is ${analysisResult.price_differential_description}.`);
  }

  if (analysisResult.model_description) {
    messages.push(`The model suggests ${analysisResult.model_description}.`);
  }

  return <Interpretation title="Key Insights" messages={messages} />;
};

ECMKeyInsights.propTypes = {
  analysisResult: PropTypes.shape({
    model_name: PropTypes.string,
    price_differential_description: PropTypes.string,
    model_description: PropTypes.string,
  }).isRequired,
};

export default ECMKeyInsights;