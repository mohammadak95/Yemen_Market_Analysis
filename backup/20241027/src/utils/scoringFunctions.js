// src/utils/scoringFunctions.js

export const calculateECMScore = (answers) => {
    let score = 0;
    if (answers.speedOfAdjustment.trim().length > 50) score += 33;
    if (answers.equilibriumInterpretation.trim().length > 50) score += 33;
    if (answers.errorCorrection.trim().length > 50) score += 34;
    return score;
  };
  
  export const calculatePriceDiffScore = (answers) => {
    let score = 0;
    if (answers.trendType === 'convergence' || answers.trendType === 'divergence' || answers.trendType === 'stable') score += 30;
    if (answers.interpretation.trim().length > 50) score += 35;
    if (answers.marketEfficiency.trim().length > 50) score += 35;
    return score;
  };
  
  export const calculateSpatialScore = (answers) => {
    let score = 0;
    if (answers.patternType === 'clustered' || answers.patternType === 'dispersed' || answers.patternType === 'random') score += 30;
    if (answers.moranI.trim().length > 50) score += 35;
    if (answers.spatialDependence.trim().length > 50) score += 35;
    return score;
  };
  
  export const calculateTVMIIScore = (answers) => {
    let score = 0;
    if (answers.integrationLevel === 'high' || answers.integrationLevel === 'moderate' || answers.integrationLevel === 'low') score += 30;
    if (answers.timeVaryingNature.trim().length > 50) score += 35;
    if (answers.implications.trim().length > 50) score += 35;
    return score;
  };
  