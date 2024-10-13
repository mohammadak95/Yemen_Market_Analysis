// src/components/ecm-analysis/ECMInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import Interpretation from '../common/Interpretation';

const ECMInterpretation = ({ analysisResult }) => {
  const messages = [];

  if (analysisResult.alpha !== undefined) {
    messages.push(
      `The Error Correction Term (α) is ${
        analysisResult.alpha < 0 ? 'negative' : 'positive'
      }, indicating that the system ${
        analysisResult.alpha < 0 ? 'adjusts towards' : 'diverges from'
      } equilibrium after a shock.`
    );
  }

  if (analysisResult.beta !== undefined) {
    messages.push(
      `The long-run relationship coefficient (β) is ${analysisResult.beta.toFixed(
        4
      )}, suggesting a ${
        analysisResult.beta > 0 ? 'positive' : 'negative'
      } long-term relationship between the variables.`
    );
  }

  if (analysisResult.gamma !== undefined) {
    messages.push(
      `The short-term dynamics coefficient (γ) is ${analysisResult.gamma.toFixed(
        4
      )}, indicating the immediate impact of changes in the independent variable on the dependent variable.`
    );
  }

  return <Interpretation title="Interpretation" messages={messages} />;
};

ECMInterpretation.propTypes = {
  analysisResult: PropTypes.shape({
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
  }).isRequired,
};

export default ECMInterpretation;