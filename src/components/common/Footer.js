// Footer.js (updated)
import React from 'react';
import { styled } from '@mui/system';

const FooterContainer = styled('footer')`
  background-color: ${props => props.theme.primaryBackground};
  color: ${props => props.theme.text};
  padding: 1rem;
  text-align: center;
`;

const Footer = () => {
  return (
    <FooterContainer>
      <p>© {new Date().getFullYear()} Your Company</p>
    </FooterContainer>
  );
};

export default Footer;