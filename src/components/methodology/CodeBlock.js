// src/components/methodology/CodeBlock.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, IconButton, useTheme, Tooltip, alpha, Fade } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

const CodeBlock = ({ language, code }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Customize syntax highlighting theme
  const customStyle = isDarkMode ? {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: alpha(theme.palette.background.paper, 0.5),
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      color: theme.palette.primary.light,
    },
  } : {
    ...vs,
    'pre[class*="language-"]': {
      ...vs['pre[class*="language-"]'],
      background: alpha(theme.palette.background.paper, 0.5),
    },
    'code[class*="language-"]': {
      ...vs['code[class*="language-"]'],
      color: theme.palette.primary.dark,
    },
  };

  return (
    <Box
      sx={{
        position: 'relative',
        my: 2,
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.2)
          : alpha(theme.palette.background.paper, 0.5),
        border: `1px solid ${theme.palette.divider}`,
        transition: theme.transitions.create(
          ['background-color', 'border-color', 'box-shadow'],
          {
            duration: theme.transitions.duration.standard,
          }
        ),
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark'
            ? `0 4px 20px ${alpha(theme.palette.common.black, 0.5)}`
            : theme.shadows[4],
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          padding: theme.spacing(1),
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, transparent, rgba(18, 18, 18, 0.8) 50%)'
            : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8) 50%)',
          borderBottomLeftRadius: theme.shape.borderRadius,
          transition: theme.transitions.create('background', {
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Tooltip 
          title={copied ? "Copied!" : "Copy Code"} 
          placement="left"
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 300 }}
        >
          <IconButton
            onClick={handleCopy}
            size="small"
            sx={{
              backgroundColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.1)
                : alpha(theme.palette.background.paper, 0.8),
              color: copied 
                ? theme.palette.success.main 
                : theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.background.paper, 0.2)
                  : alpha(theme.palette.background.paper, 0.9),
                transform: 'scale(1.1)',
              },
              transition: theme.transitions.create(
                ['background-color', 'transform', 'color'],
                {
                  duration: theme.transitions.duration.shorter,
                }
              ),
            }}
          >
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          position: 'relative',
          '&:before': {
            content: `"${language}"`,
            position: 'absolute',
            top: theme.spacing(1),
            left: theme.spacing(1),
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            opacity: 0.7,
          },
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          customStyle={{
            margin: 0,
            padding: theme.spacing(4, 2, 2, 2),
            fontSize: '0.9rem',
            backgroundColor: 'transparent',
            overflowX: 'auto',
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            transition: theme.transitions.create('background-color', {
              duration: theme.transitions.duration.standard,
            }),
          }}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
};

CodeBlock.propTypes = {
  language: PropTypes.string.isRequired,
  code: PropTypes.string.isRequired,
};

export default CodeBlock;
