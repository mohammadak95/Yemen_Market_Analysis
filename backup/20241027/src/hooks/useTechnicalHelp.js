// src/hooks/useTechnicalHelp.js

import { useCallback } from 'react';
import { getMethodologyInfo, getMethodologySection } from '../utils/methodologyRegistry';

export const useTechnicalHelp = (componentType) => {
  const getTechnicalTooltip = useCallback((element) => {
    const info = getMethodologyInfo(componentType);
    return info?.tooltips?.[element] || null;
  }, [componentType]);

  const getTechnicalEquation = useCallback((equationType) => {
    const info = getMethodologyInfo(componentType);
    return info?.equations?.[equationType] || null;
  }, [componentType]);

  const getTechnicalConcept = useCallback((conceptKey) => {
    const info = getMethodologyInfo(componentType);
    return info?.concepts?.[conceptKey] || null;
  }, [componentType]);

  const getMethodology = useCallback(() => {
    return getMethodologySection(componentType);
  }, [componentType]);

  return {
    getTechnicalTooltip,
    getTechnicalEquation,
    getTechnicalConcept,
    getMethodology,
  };
};
