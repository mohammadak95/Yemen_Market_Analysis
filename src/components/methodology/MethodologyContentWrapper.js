// src/components/methodology/MethodologyContentWrapper.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, alpha } from '@mui/material';
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
    <Box 
      sx={{ 
        padding: theme.spacing(2),
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        transition: theme.transitions.create(
          ['background-color', 'color'],
          {
            duration: theme.transitions.duration.standard,
          }
        ),
        '& > *:not(:last-child)': {
          marginBottom: theme.spacing(4),
        },
        '& h1, & h2, & h3, & h4, & h5, & h6': {
          color: theme.palette.mode === 'dark'
            ? theme.palette.primary.light
            : theme.palette.primary.main,
          fontWeight: 600,
          marginBottom: theme.spacing(2),
          transition: theme.transitions.create('color', {
            duration: theme.transitions.duration.standard,
          }),
        },
        '& p': {
          color: theme.palette.text.primary,
          lineHeight: 1.7,
          marginBottom: theme.spacing(2),
          transition: theme.transitions.create('color', {
            duration: theme.transitions.duration.standard,
          }),
        },
        '& a': {
          color: theme.palette.mode === 'dark'
            ? theme.palette.primary.light
            : theme.palette.primary.main,
          textDecoration: 'none',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transition: theme.transitions.create(
            ['color', 'border-color'],
            {
              duration: theme.transitions.duration.standard,
            }
          ),
          '&:hover': {
            color: theme.palette.primary.main,
            borderBottomColor: theme.palette.primary.main,
          },
        },
        '& code': {
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.1)
            : alpha(theme.palette.common.black, 0.05),
          padding: theme.spacing(0.5, 1),
          borderRadius: theme.shape.borderRadius,
          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
          fontSize: '0.875em',
          color: theme.palette.mode === 'dark'
            ? theme.palette.primary.light
            : theme.palette.primary.dark,
          transition: theme.transitions.create(
            ['background-color', 'color'],
            {
              duration: theme.transitions.duration.standard,
            }
          ),
        },
        '& pre': {
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.black, 0.3)
            : alpha(theme.palette.common.black, 0.05),
          padding: theme.spacing(2),
          borderRadius: theme.shape.borderRadius,
          overflow: 'auto',
          marginBottom: theme.spacing(2),
          transition: theme.transitions.create('background-color', {
            duration: theme.transitions.duration.standard,
          }),
          '& code': {
            backgroundColor: 'transparent',
            padding: 0,
          },
        },
        '& ul, & ol': {
          paddingLeft: theme.spacing(3),
          marginBottom: theme.spacing(2),
          '& li': {
            marginBottom: theme.spacing(1),
            color: theme.palette.text.primary,
            transition: theme.transitions.create('color', {
              duration: theme.transitions.duration.standard,
            }),
          },
        },
        '& blockquote': {
          borderLeft: `4px solid ${theme.palette.mode === 'dark'
            ? theme.palette.primary.light
            : theme.palette.primary.main}`,
          margin: theme.spacing(2, 0),
          padding: theme.spacing(1, 2),
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.main, 0.1)
            : alpha(theme.palette.primary.light, 0.1),
          color: theme.palette.text.primary,
          transition: theme.transitions.create(
            ['background-color', 'border-color', 'color'],
            {
              duration: theme.transitions.duration.standard,
            }
          ),
        },
      }}
    >
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
