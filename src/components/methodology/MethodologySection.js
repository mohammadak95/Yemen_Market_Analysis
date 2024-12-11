// src/components/methodology/MethodologySection.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, alpha } from '@mui/material';
import CodeBlock from './CodeBlock';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useTheme } from '@mui/material/styles';

const MethodologySection = ({ section, level }) => {
  const theme = useTheme();

  // Map levels to desired heading variants with smaller font sizes
  const headingVariants = {
    1: 'h4',
    2: 'h5',
    3: 'h6',
    4: 'subtitle1',
    5: 'subtitle2',
    6: 'body1',
  };

  const headingVariant = headingVariants[level] || 'body1';

  const renderContent = (content) => {
    if (typeof content === 'string') {
      return content.split(/(\$.*?\$)/).map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                mx: 0.5,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main,
                transition: theme.transitions.create('color', {
                  duration: theme.transitions.duration.standard,
                }),
              }}
            >
              <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>
            </Box>
          );
        }
        return part;
      });
    }
    return content;
  };

  return (
    <Box 
      sx={{ 
        mb: 4,
        '&:hover': {
          '& > .MuiTypography-root:first-of-type': {
            color: theme.palette.mode === 'dark'
              ? theme.palette.primary.light
              : theme.palette.primary.main,
          },
        },
      }}
    >
      <Typography
        component="div"
        variant={headingVariant}
        sx={{
          mb: 2,
          fontWeight: 600,
          color: theme.palette.mode === 'dark'
            ? theme.palette.primary.light
            : theme.palette.primary.main,
          transition: theme.transitions.create('color', {
            duration: theme.transitions.duration.standard,
          }),
          borderBottom: `1px solid ${alpha(
            theme.palette.mode === 'dark'
              ? theme.palette.primary.light
              : theme.palette.primary.main,
            0.1
          )}`,
          pb: 1,
          '&:hover': {
            color: theme.palette.mode === 'dark'
              ? theme.palette.primary.main
              : theme.palette.primary.dark,
          },
        }}
      >
        {section.title}
      </Typography>

      {section.content && (
        <Typography
          variant="body1"
          sx={{ 
            mb: 2, 
            textAlign: 'justify', 
            color: theme.palette.text.primary,
            lineHeight: 1.7,
            transition: theme.transitions.create('color', {
              duration: theme.transitions.duration.standard,
            }),
            '& strong': {
              color: theme.palette.mode === 'dark'
                ? theme.palette.primary.light
                : theme.palette.primary.main,
              fontWeight: 600,
            },
            '& em': {
              color: theme.palette.text.secondary,
              fontStyle: 'italic',
            },
          }}
        >
          {renderContent(section.content)}
        </Typography>
      )}

      {section.equation && (
        <Box 
          sx={{ 
            my: 3,
            px: 2,
            py: 3,
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.2)
              : alpha(theme.palette.background.paper, 0.5),
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create(
              ['background-color', 'border-color'],
              {
                duration: theme.transitions.duration.standard,
              }
            ),
            '& .katex': {
              color: theme.palette.mode === 'dark'
                ? theme.palette.primary.light
                : theme.palette.primary.main,
              transition: theme.transitions.create('color', {
                duration: theme.transitions.duration.standard,
              }),
            },
          }}
        >
          <BlockMath>{section.equation}</BlockMath>
        </Box>
      )}

      {section.code &&
        section.code.map((codeBlock, idx) => (
          <Box 
            key={idx}
            sx={{ 
              my: 3,
              transition: theme.transitions.create('transform', {
                duration: theme.transitions.duration.standard,
              }),
              '&:hover': {
                transform: 'scale(1.01)',
              },
            }}
          >
            <CodeBlock language={codeBlock.language} code={codeBlock.code} />
          </Box>
        ))}

      {section.children &&
        section.children.map((child, idx) => (
          <Box 
            key={idx}
            sx={{ 
              ml: theme.spacing(2),
              borderLeft: `2px solid ${theme.palette.divider}`,
              pl: theme.spacing(2),
              transition: theme.transitions.create('border-color', {
                duration: theme.transitions.duration.standard,
              }),
              '&:hover': {
                borderColor: theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main,
              },
            }}
          >
            <MethodologySection section={child} level={level + 1} />
          </Box>
        ))}
    </Box>
  );
};

MethodologySection.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    content: PropTypes.string,
    equation: PropTypes.string,
    code: PropTypes.arrayOf(
      PropTypes.shape({
        language: PropTypes.string,
        code: PropTypes.string,
      })
    ),
    children: PropTypes.array,
  }).isRequired,
  level: PropTypes.number.isRequired,
};

export default MethodologySection;
