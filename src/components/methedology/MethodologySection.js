// src/components/methodology/MethodologySection.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeBlock from './CodeBlock';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const MethodologySection = ({ section, level }) => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  const renderContent = (content) => {
    if (typeof content === 'string') {
      return content.split(/(\$.*?\$)/).map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>;
        }
        return part;
      });
    }
    return content;
  };

  return (
    <Accordion 
      expanded={expanded} 
      onChange={handleChange}
      sx={{ 
        mb: 1,
        boxShadow: 'none',
        '&:before': { display: 'none' },
        bgcolor: 'background.paper',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '&.Mui-expanded': {
            minHeight: 48,
          },
        }}
      >
        <Typography 
          variant={`h${Math.min(level + 5, 6)}`}
          sx={{ 
            fontWeight: level === 1 ? 'bold' : 'medium',
            color: 'text.primary',
          }}
        >
          {section.title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {section.content && (
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {renderContent(section.content)}
          </Typography>
        )}
        {section.equation && (
          <Box sx={{ my: 2 }}>
            <BlockMath>{section.equation}</BlockMath>
          </Box>
        )}
        {section.code &&
          section.code.map((codeBlock, idx) => (
            <CodeBlock key={idx} language={codeBlock.language} code={codeBlock.code} />
          ))}
        {section.children &&
          section.children.map((child, idx) => (
            <MethodologySection key={idx} section={child} level={level + 1} />
          ))}
      </AccordionDetails>
    </Accordion>
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