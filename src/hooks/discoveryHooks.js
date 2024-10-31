// src/hooks/discoveryHooks.js

import { useState, useCallback, useEffect } from 'react';
import { getMethodologySection } from '../utils/appUtils';
import { useDiscovery } from '../context/DiscoveryContext';
import { discoveryPaths } from '../config/discoveryConfig';

/**
 * Custom hook to manage access to methodology sections.
 *
 * @returns {object} - Contains active section details, dialog state, and handlers to open/close sections.
 */
const useMethodologyAccess = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /**
   * Opens a methodology section dialog based on the component type.
   *
   * @param {string} componentType - The type of the component requesting the section.
   */
  const openMethodologySection = useCallback((componentType) => {
    const section = getMethodologySection(componentType);
    if (section) {
      setActiveSection(section);
      setIsDialogOpen(true);
    }
  }, []);

  /**
   * Closes the currently open methodology dialog.
   */
  const closeMethodology = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return {
    activeSection,
    isDialogOpen,
    openMethodologySection,
    closeMethodology,
  };
};

/**
 * Custom hook to launch discovery tutorials based on component types.
 *
 * @returns {Function} - Function to launch a specific tutorial.
 */
const useLaunchDiscovery = () => {
  const { openDiscovery } = useDiscovery();

  /**
   * Launches a tutorial corresponding to the given component type.
   *
   * @param {string} componentType - The type of the component initiating the tutorial.
   */
  const launchTutorial = useCallback(
    (componentType) => {
      // Mapping of component types to their respective tutorial paths and sections
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
    },
    [openDiscovery]
  );

  return launchTutorial;
};

/**
 * Custom hook to integrate discovery system functionalities.
 *
 * @returns {object} - Contains discovery state and handlers to manage discovery interactions.
 */
const useDiscoveryIntegration = () => {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const { updateProgress } = useDiscovery();

  /**
   * Opens the discovery interface for a specific type and identifier.
   *
   * @param {string} type - The type/category of the discovery content.
   * @param {string} id - The unique identifier for the discovery content.
   */
  const openDiscovery = useCallback(
    (type, id) => {
      const path = discoveryPaths(type, id);
      if (path) {
        setCurrentPath(path);
        setIsDiscoveryOpen(true);
        updateProgress(type, id);
      }
    },
    [updateProgress]
  );

  /**
   * Closes the currently open discovery interface.
   */
  const closeDiscovery = useCallback(() => {
    setIsDiscoveryOpen(false);
    setCurrentPath(null);
  }, []);

  /**
   * Launches context-specific help within the discovery system.
   *
   * @param {string} contextKey - The key representing the context for help.
   */
  const launchContextHelp = useCallback(
    (contextKey) => {
      const paths = Object.values(discoveryPaths.analysis);
      const path = paths.find((p) => p.contextKey === contextKey);
      if (path) {
        openDiscovery('analysis', path.contextKey);
      }
    },
    [openDiscovery]
  );

  return {
    isDiscoveryOpen,
    currentPath,
    openDiscovery,
    closeDiscovery,
    launchContextHelp,
  };
};

/**
 * Custom hook for managing discovery system data and interactions.
 *
 * @param {string} analysisType - Type of analysis (e.g., 'ecm', 'spatial', etc.).
 * @returns {object} - Discovery data and interaction handlers.
 */
const useDiscoveryData = (analysisType) => {
  const { state, updateProgress, setSection } = useDiscovery();
  const [progress, setProgress] = useState({
    completedSections: [],
    totalSections: 0,
    currentSection: null,
    timeSpent: 0,
    estimatedTime: 0,
    lastInteraction: null,
  });

  /**
   * Loads initial progress data based on the analysis type.
   */
  useEffect(() => {
    if (analysisType && state.progress[analysisType]) {
      const currentProgress = state.progress[analysisType];
      setProgress((prev) => ({
        ...prev,
        ...currentProgress,
      }));
    }
  }, [analysisType, state.progress]);

  /**
   * Tracks the time spent on the current discovery section.
   */
  useEffect(() => {
    let timer;
    if (progress.currentSection) {
      timer = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          timeSpent: prev.timeSpent + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [progress.currentSection]);

  /**
   * Tracks user interactions within the discovery system.
   *
   * @param {string} interactionType - Type of interaction (e.g., 'section_start', 'section_complete').
   * @param {object} data - Additional data related to the interaction.
   */
  const trackInteraction = useCallback(
    (interactionType, data) => {
      if (!analysisType) return;

      const interaction = {
        type: interactionType,
        timestamp: new Date().toISOString(),
        analysisType,
        ...data,
      };

      // Update progress in the context
      updateProgress(analysisType, {
        lastInteraction: interaction,
        timeSpent: progress.timeSpent,
      });

      // Update local progress state
      setProgress((prev) => ({
        ...prev,
        lastInteraction: interaction,
      }));
    },
    [analysisType, updateProgress, progress.timeSpent]
  );

  /**
   * Marks a discovery section as completed.
   *
   * @param {string} sectionId - ID of the completed section.
   * @param {object} [completionData={}] - Additional data related to the completion.
   */
  const completeSection = useCallback(
    (sectionId, completionData = {}) => {
      if (!analysisType || !sectionId) return;

      const updatedProgress = {
        ...progress,
        completedSections: [...progress.completedSections, sectionId],
        lastCompleted: {
          sectionId,
          timestamp: new Date().toISOString(),
          ...completionData,
        },
      };

      setProgress(updatedProgress);
      updateProgress(analysisType, updatedProgress);

      // Update current section in the context
      setSection(sectionId);

      // Track the completion interaction
      trackInteraction('section_complete', {
        sectionId,
        timeSpent: progress.timeSpent,
        ...completionData,
      });
    },
    [analysisType, progress, updateProgress, setSection, trackInteraction]
  );

  /**
   * Starts a discovery section.
   *
   * @param {string} sectionId - ID of the section to start.
   */
  const startSection = useCallback(
    (sectionId) => {
      if (!analysisType || !sectionId) return;

      setProgress((prev) => ({
        ...prev,
        currentSection: sectionId,
        startTime: new Date().toISOString(),
      }));

      // Track the start interaction
      trackInteraction('section_start', {
        sectionId,
        startTime: new Date().toISOString(),
      });
    },
    [analysisType, trackInteraction]
  );

  /**
   * Resets the progress for the current analysis type.
   */
  const resetProgress = useCallback(() => {
    if (!analysisType) return;

    const resetData = {
      completedSections: [],
      totalSections: progress.totalSections,
      currentSection: null,
      timeSpent: 0,
      startTime: null,
      lastInteraction: null,
    };

    setProgress(resetData);
    updateProgress(analysisType, resetData);

    // Track the reset interaction
    trackInteraction('progress_reset', {
      previousProgress: progress,
    });
  }, [analysisType, progress, updateProgress, trackInteraction]);

  /**
   * Checks if a specific section has been completed.
   *
   * @param {string} sectionId - ID of the section to check.
   * @returns {boolean} - True if the section is completed, else false.
   */
  const isCompleted = useCallback(
    (sectionId) => progress.completedSections.includes(sectionId),
    [progress.completedSections]
  );

  /**
   * Calculates the completion percentage based on total sections.
   *
   * @returns {number} - Completion percentage (0-100).
   */
  const completionPercentage = useCallback(() => {
    if (progress.totalSections === 0) return 0;
    return Math.round(
      (progress.completedSections.length / progress.totalSections) * 100
    );
  }, [progress.completedSections.length, progress.totalSections]);

  return {
    progress,
    trackInteraction,
    completeSection,
    startSection,
    resetProgress,
    isCompleted,
    completionPercentage: completionPercentage(),
  };
};

export {
  useMethodologyAccess,
  useLaunchDiscovery,
  useDiscoveryIntegration,
  useDiscoveryData,
};