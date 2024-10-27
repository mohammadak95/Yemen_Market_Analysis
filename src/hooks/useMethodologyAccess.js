// src/hooks/useMethodologyAccess.js

import { useState, useCallback } from 'react';
import { getMethodologySection } from '../utils/methodologyRegistry';

export const useMethodologyAccess = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openMethodologySection = useCallback((componentType) => {
    const section = getMethodologySection(componentType);
    if (section) {
      setActiveSection(section);
      setIsDialogOpen(true);
    }
  }, []);

  const closeMethodology = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return {
    activeSection,
    isDialogOpen,
    openMethodologySection,
    closeMethodology
  };
};