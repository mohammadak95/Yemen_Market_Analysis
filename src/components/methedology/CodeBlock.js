// src/components/methodology/CodeBlock.js

import React from 'react';
import PropTypes from 'prop-types';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, IconButton, useTheme } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const CodeBlock = ({ language, code }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        my: 2,
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <IconButton
        onClick={handleCopy}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
      <SyntaxHighlighter
        language={language}
        style={isDarkMode ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          padding: theme.spacing(2),
          fontSize: '0.875rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

CodeBlock.propTypes = {
  language: PropTypes.string.isRequired,
  code: PropTypes.string.isRequired,
};

export default CodeBlock;