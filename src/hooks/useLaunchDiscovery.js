// src/hooks/useLaunchDiscovery.js

import { useCallback } from 'react';
import { useDiscovery } from '../context/DiscoveryContext';

export const useLaunchDiscovery = () => {
  const { openDiscovery } = useDiscovery();

  const launchTutorial = useCallback((componentType) => {
    // Map component types to tutorial sections
    const tutorialMap = {
      'price-differential': { path: 'marketAnalysis', section: 'price-differential' },
      'ecm': { path: 'marketAnalysis', section: 'ecm-analysis' },
      'spatial': { path: 'marketAnalysis', section: 'spatial-analysis' },
      'tvmii': { path: 'marketAnalysis', section: 'tvmii-analysis' },
    };

    const tutorialSection = tutorialMap[componentType];
    if (tutorialSection) {
      openDiscovery(tutorialSection.path, tutorialSection.section);
    }
  }, [openDiscovery]);

  return launchTutorial;
};