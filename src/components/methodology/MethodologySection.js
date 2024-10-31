import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box } from '@mui/material';
import CodeBlock from './CodeBlock';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const MethodologySection = ({ section, level }) => {
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

  // Adjust heading variants to control font size
  const headingVariant = `h${Math.min(level, 6)}`;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography component={headingVariant} variant={headingVariant} sx={{ mb: 2, fontWeight: 'bold' }}>
        {section.title}
      </Typography>
      {section.content && (
        <Typography variant="body2" sx={{ mb: 2, textAlign: 'justify' }}>
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