// src/hooks/useDiscoveryIntegration.js

import { useCallback, useState } from 'react';
import { useDiscovery } from '../context/DiscoveryContext';
import { getDiscoveryPath } from '../config/discoveryConfig';
import { discoveryPaths } from '../config/discoveryConfig';


export const useDiscoveryIntegration = () => {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const { updateProgress } = useDiscovery();

  const openDiscovery = useCallback((type, id) => {
    const path = getDiscoveryPath(type, id);
    if (path) {
      setCurrentPath(path);
      setIsDiscoveryOpen(true);
      updateProgress(type, id);
    }
  }, [updateProgress]);

  const closeDiscovery = useCallback(() => {
    setIsDiscoveryOpen(false);
    setCurrentPath(null);
  }, []);

  const launchContextHelp = useCallback((contextKey) => {
    const paths = Object.values(discoveryPaths.analysis);
    const path = paths.find(p => p.contextKey === contextKey);
    if (path) {
      openDiscovery('analysis', path.contextKey);
    }
  }, [openDiscovery]);

  return {
    isDiscoveryOpen,
    currentPath,
    openDiscovery,
    closeDiscovery,
    launchContextHelp,
  };
};