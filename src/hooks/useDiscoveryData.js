//src/hooks/useDiscoveryData.js

import { useState, useCallback, useEffect } from 'react';
import { useDiscovery } from '../context/DiscoveryContext';

/**
 * Custom hook for managing discovery system data and interactions
 * @param {string} analysisType - Type of analysis (e.g., 'ecm', 'spatial', etc.)
 * @returns {Object} Discovery data and interaction handlers
 */
export const useDiscoveryData = (analysisType) => {
  const { state, updateProgress, setSection } = useDiscovery();
  const [progress, setProgress] = useState({
    completedSections: [],
    totalSections: 0,
    currentSection: null,
    timeSpent: 0,
    estimatedTime: 0,
  });

  // Load initial progress data
  useEffect(() => {
    if (analysisType && state.progress[analysisType]) {
      const currentProgress = state.progress[analysisType];
      setProgress(prev => ({
        ...prev,
        ...currentProgress,
      }));
    }
  }, [analysisType, state.progress]);

  // Track time spent
  useEffect(() => {
    let timer;
    if (progress.currentSection) {
      timer = setInterval(() => {
        setProgress(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + 1
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [progress.currentSection]);

  /**
   * Track user interaction with discovery content
   * @param {string} interactionType - Type of interaction
   * @param {Object} data - Interaction data
   */
  const trackInteraction = useCallback((interactionType, data) => {
    if (!analysisType) return;

    const interaction = {
      type: interactionType,
      timestamp: new Date().toISOString(),
      analysisType,
      ...data
    };

    // Update progress in context
    updateProgress(analysisType, {
      lastInteraction: interaction,
      timeSpent: progress.timeSpent,
    });

    // Update local progress state
    setProgress(prev => ({
      ...prev,
      lastInteraction: interaction
    }));
  }, [analysisType, updateProgress, progress.timeSpent]);

  /**
   * Complete a discovery section
   * @param {string} sectionId - ID of completed section
   * @param {Object} completionData - Additional completion data
   */
  const completeSection = useCallback((sectionId, completionData = {}) => {
    if (!analysisType || !sectionId) return;

    const updatedProgress = {
      ...progress,
      completedSections: [...progress.completedSections, sectionId],
      lastCompleted: {
        sectionId,
        timestamp: new Date().toISOString(),
        ...completionData
      }
    };

    setProgress(updatedProgress);
    updateProgress(analysisType, updatedProgress);
    
    // Update current section in context
    setSection(sectionId);

    trackInteraction('section_complete', {
      sectionId,
      timeSpent: progress.timeSpent,
      ...completionData
    });
  }, [analysisType, progress, updateProgress, setSection, trackInteraction]);

  /**
   * Start a discovery section
   * @param {string} sectionId - ID of section to start
   */
  const startSection = useCallback((sectionId) => {
    if (!analysisType || !sectionId) return;

    setProgress(prev => ({
      ...prev,
      currentSection: sectionId,
      startTime: new Date().toISOString()
    }));

    trackInteraction('section_start', {
      sectionId,
      startTime: new Date().toISOString()
    });
  }, [analysisType, trackInteraction]);

  /**
   * Reset progress for current analysis type
   */
  const resetProgress = useCallback(() => {
    if (!analysisType) return;

    const resetData = {
      completedSections: [],
      totalSections: progress.totalSections,
      currentSection: null,
      timeSpent: 0,
      startTime: null,
      lastInteraction: null
    };

    setProgress(resetData);
    updateProgress(analysisType, resetData);
    
    trackInteraction('progress_reset', {
      previousProgress: progress
    });
  }, [analysisType, progress, updateProgress, trackInteraction]);

  return {
    progress,
    trackInteraction,
    completeSection,
    startSection,
    resetProgress,
    isCompleted: (sectionId) => progress.completedSections.includes(sectionId),
    completionPercentage: Math.round((progress.completedSections.length / progress.totalSections) * 100) || 0
  };
};