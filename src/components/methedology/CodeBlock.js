import React from 'react';
import PropTypes from 'prop-types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, IconButton, useTheme, Tooltip } from '@mui/material';
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
        bgcolor: theme.palette.background.paper,
        boxShadow: 1,
      }}
    >
      <Tooltip title="Copy Code">
        <IconButton
          onClick={handleCopy}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'background.default',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <SyntaxHighlighter
        language={language}
        style={isDarkMode ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          padding: theme.spacing(2),
          fontSize: '0.9rem',
          backgroundColor: 'transparent',
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