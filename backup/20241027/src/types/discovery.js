// src/types/discovery.js

import PropTypes from 'prop-types';

// Path Section Type
export const PathSectionType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  content: PropTypes.string,
  component: PropTypes.elementType,
  prerequisites: PropTypes.arrayOf(PropTypes.string),
});

// Learning Path Type
export const LearningPathType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  duration: PropTypes.string.isRequired,
  level: PropTypes.oneOf(['beginner', 'intermediate', 'advanced']).isRequired,
  prerequisites: PropTypes.arrayOf(PropTypes.string),
  sections: PropTypes.arrayOf(PathSectionType).isRequired,
});

// Tutorial Config Type
export const TutorialConfigType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  duration: PropTypes.string.isRequired,
  level: PropTypes.oneOf(['beginner', 'intermediate', 'advanced']).isRequired,
  sections: PropTypes.arrayOf(PathSectionType).isRequired,
});

// Discovery Sections Type
export const DiscoverySectionsType = PropTypes.objectOf(
  PropTypes.shape({
    component: PropTypes.elementType.isRequired,
    demo: PropTypes.elementType.isRequired,
  })
).isRequired;