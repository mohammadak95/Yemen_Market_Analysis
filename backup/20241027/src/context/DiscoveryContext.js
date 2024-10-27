// src/context/DiscoveryContext.js

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import PropTypes from 'prop-types';
import { discoveryPaths } from '../config/discoveryConfig';

const DiscoveryContext = createContext(null);

// Initialize sections from discoveryPaths
const initialSections = discoveryPaths.reduce((acc, path) => {
  path.sections.forEach((section) => {
    acc[section.id] = {
      ...section,
      completed: false,
      progress: 0,
      startTime: null,
      lastUpdated: null,
    };
  });
  return acc;
}, {});

const initialState = {
  currentView: null,
  activeAnalysis: null,
  history: [],
  progress: {},
  completedSections: {},
  currentPath: null,
  currentSection: null,
  sections: initialSections,
  paths: discoveryPaths.reduce((acc, path) => {
    acc[path.id] = {
      ...path,
      progress: 0,
      started: false,
      completed: false,
      startTime: null,
    };
    return acc;
  }, {}),
  preferences: {
    showHelp: true,
    autoLaunch: false,
    lastVisited: null,
  },
  relatedContent: {},
  pathProgress: {},
  completedTutorials: {}, // Added completedTutorials to initialState
};

const ACTIONS = {
  SET_CURRENT_VIEW: 'SET_CURRENT_VIEW',
  SET_ACTIVE_ANALYSIS: 'SET_ACTIVE_ANALYSIS',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  COMPLETE_SECTION: 'COMPLETE_SECTION',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  SET_CURRENT_PATH: 'SET_CURRENT_PATH',
  SET_SECTION: 'SET_SECTION',
  START_PATH: 'START_PATH',
  UPDATE_SECTION: 'UPDATE_SECTION',
  RESET_STATE: 'RESET_STATE',
  COMPLETE_TUTORIAL: 'COMPLETE_TUTORIAL', // Added COMPLETE_TUTORIAL action
};

const discoveryReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_CURRENT_VIEW:
      return {
        ...state,
        currentView: action.payload,
      };

    case ACTIONS.SET_ACTIVE_ANALYSIS:
      return {
        ...state,
        activeAnalysis: action.payload,
      };

    case ACTIONS.UPDATE_PROGRESS:
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.payload.pathId]: {
            ...state.progress[action.payload.pathId],
            ...action.payload.data,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

    case ACTIONS.COMPLETE_SECTION:
      return {
        ...state,
        completedSections: {
          ...state.completedSections,
          [action.payload.pathId]: {
            ...state.completedSections[action.payload.pathId],
            [action.payload.sectionId]: {
              completed: true,
              timestamp: new Date().toISOString(),
            },
          },
        },
        sections: {
          ...state.sections,
          [action.payload.sectionId]: {
            ...state.sections[action.payload.sectionId],
            completed: true,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

    case ACTIONS.START_PATH:
      return {
        ...state,
        currentPath: action.payload,
        pathProgress: {
          ...state.pathProgress,
          [action.payload]: {
            started: true,
            startTime: new Date().toISOString(),
            currentSection: null,
          },
        },
        paths: {
          ...state.paths,
          [action.payload]: {
            ...state.paths[action.payload],
            started: true,
            startTime: new Date().toISOString(),
          },
        },
      };

    case ACTIONS.SET_CURRENT_PATH:
      return {
        ...state,
        currentPath: action.payload,
      };

    case ACTIONS.SET_SECTION:
      return {
        ...state,
        currentSection: action.payload,
        sections: {
          ...state.sections,
          [action.payload]: {
            ...state.sections[action.payload],
            lastVisited: new Date().toISOString(),
          },
        },
        pathProgress: state.currentPath
          ? {
              ...state.pathProgress,
              [state.currentPath]: {
                ...state.pathProgress[state.currentPath],
                currentSection: action.payload,
                lastUpdated: new Date().toISOString(),
              },
            }
          : state.pathProgress,
      };

    case ACTIONS.UPDATE_SECTION:
      return {
        ...state,
        sections: {
          ...state.sections,
          [action.payload.sectionId]: {
            ...state.sections[action.payload.sectionId],
            ...action.payload.data,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

    case ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };

    case ACTIONS.RESET_STATE:
      return {
        ...initialState,
        preferences: state.preferences,
      };

    case ACTIONS.COMPLETE_TUTORIAL:
      return {
        ...state,
        completedTutorials: {
          ...state.completedTutorials,
          [action.payload]: true,
        },
      };

    default:
      return state;
  }
};

export const DiscoveryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(discoveryReducer, initialState);

  const setCurrentView = useCallback((view) => {
    dispatch({ type: ACTIONS.SET_CURRENT_VIEW, payload: view });
  }, []);

  const setActiveAnalysis = useCallback((analysis) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_ANALYSIS, payload: analysis });
  }, []);

  const updateProgress = useCallback((pathId, data) => {
    dispatch({
      type: ACTIONS.UPDATE_PROGRESS,
      payload: { pathId, data },
    });
  }, []);

  const completeSection = useCallback((pathId, sectionId) => {
    dispatch({
      type: ACTIONS.COMPLETE_SECTION,
      payload: { pathId, sectionId },
    });
  }, []);

  const startPath = useCallback((pathId) => {
    dispatch({
      type: ACTIONS.START_PATH,
      payload: pathId,
    });
  }, []);

  const setCurrentPath = useCallback((pathId) => {
    dispatch({ type: ACTIONS.SET_CURRENT_PATH, payload: pathId });
  }, []);

  const setSection = useCallback((sectionId) => {
    dispatch({ type: ACTIONS.SET_SECTION, payload: sectionId });
  }, []);

  const updateSection = useCallback((sectionId, data) => {
    dispatch({
      type: ACTIONS.UPDATE_SECTION,
      payload: { sectionId, data },
    });
  }, []);

  const updatePreferences = useCallback((preferences) => {
    dispatch({ type: ACTIONS.UPDATE_PREFERENCES, payload: preferences });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_STATE });
  }, []);

  const completeTutorial = useCallback((tutorialId) => {
    dispatch({
      type: ACTIONS.COMPLETE_TUTORIAL,
      payload: tutorialId,
    });
  }, []);

  const value = {
    state,
    setCurrentView,
    setActiveAnalysis,
    updateProgress,
    completeSection,
    startPath,
    setCurrentPath,
    setSection,
    updateSection,
    updatePreferences,
    resetState,
    completeTutorial,
  };

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
};

DiscoveryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useDiscovery = () => {
  const context = useContext(DiscoveryContext);
  if (!context) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
};
