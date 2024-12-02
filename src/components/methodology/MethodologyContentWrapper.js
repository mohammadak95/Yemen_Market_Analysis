// src/components/methodology/MethodologyContentWrapper.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import MethodologySection from './MethodologySection';
import { useTheme } from '@mui/material/styles';
import methodologyContent from '../../utils/methodologyContent';

const MethodologyContentWrapper = ({ searchQuery }) => {
  const theme = useTheme();

  const filteredContent = useMemo(() => {
    if (!searchQuery) return methodologyContent;

    const searchLower = searchQuery.toLowerCase();
    const filterSections = (sections) =>
      sections
        .map((section) => {
          const hasMatch =
            section.title.toLowerCase().includes(searchLower) ||
            (section.content && section.content.toLowerCase().includes(searchLower));

          const filteredChildren = section.children
            ? filterSections(section.children)
            : [];

          if (hasMatch || filteredChildren.length > 0) {
            return {
              ...section,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter(Boolean);

    return filterSections(methodologyContent);
  }, [searchQuery]);

  return (
    <Box sx={{ padding: theme.spacing(2) }}>
      {filteredContent.map((section, index) => (
        <MethodologySection key={index} section={section} level={1} />
      ))}
    </Box>
  );
};

MethodologyContentWrapper.propTypes = {
  searchQuery: PropTypes.string,
};

export default MethodologyContentWrapper;