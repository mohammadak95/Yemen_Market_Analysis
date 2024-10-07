// src/components/methodology/MethodologyContentWrapper.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import MethodologySection from './MethodologySection';
import methodologyContent from '../../methodologyData';

const MethodologyContentWrapper = ({ searchQuery }) => {
  const filteredContent = useMemo(() => {
    if (!searchQuery) return methodologyContent;

    const searchLower = searchQuery.toLowerCase();
    return methodologyContent.filter(section => 
      section.title.toLowerCase().includes(searchLower) ||
      (section.content && section.content.toLowerCase().includes(searchLower))
    );
  }, [searchQuery]);

  return (
    <Box>
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