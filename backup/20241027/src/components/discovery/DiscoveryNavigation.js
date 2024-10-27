// src/components/discovery/DiscoveryNavigation.js

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
} from '@mui/material';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { useDiscovery } from '../../context/DiscoveryContext';

const DiscoveryNavigation = ({ onPathSelect, onSectionSelect }) => {
  const {
    state: { paths, currentPathId, currentSectionId, progress },
  } = useDiscovery();
  const [expandedPathId, setExpandedPathId] = useState(currentPathId);

  const handlePathClick = useCallback(
    (pathId) => {
      setExpandedPathId(expandedPathId === pathId ? null : pathId);
      onPathSelect(pathId);
    },
    [expandedPathId, onPathSelect]
  );

  const handleSectionClick = useCallback(
    (pathId, sectionId) => {
      onSectionSelect(sectionId);
    },
    [onSectionSelect]
  );

  return (
    <List component="nav" aria-label="Discovery Navigation">
      {paths.map((path) => (
        <React.Fragment key={path.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handlePathClick(path.id)}
              selected={currentPathId === path.id}
              aria-expanded={expandedPathId === path.id}
              aria-controls={`path-${path.id}-sections`}
            >
              <ListItemIcon>
                {expandedPathId === path.id ? <ChevronDown /> : <ChevronRight />}
              </ListItemIcon>
              <ListItemText primary={path.title} />
            </ListItemButton>
          </ListItem>
          <Collapse
            in={expandedPathId === path.id}
            timeout="auto"
            unmountOnExit
            id={`path-${path.id}-sections`}
          >
            <List component="div" disablePadding>
              {path.sections.map((section) => (
                <ListItem key={section.id} disablePadding sx={{ pl: 4 }}>
                  <ListItemButton
                    onClick={() => handleSectionClick(path.id, section.id)}
                    selected={
                      currentPathId === path.id && currentSectionId === section.id
                    }
                  >
                    <ListItemIcon>
                      {progress[path.id]?.completedSections?.includes(section.id) ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Circle />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={section.title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );
};

DiscoveryNavigation.propTypes = {
  onPathSelect: PropTypes.func.isRequired,
  onSectionSelect: PropTypes.func.isRequired,
};

export default DiscoveryNavigation;
