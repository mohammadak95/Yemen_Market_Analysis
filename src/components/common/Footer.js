// src/components/common/Footer.js
import React from 'react';
import styled from 'styled-components';
import { FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';

const FooterContainer = styled.footer`
  background: ${(props) => props.theme.footerBackground};
  color: ${(props) => props.theme.textColor};
  padding: 1.5rem 2rem;
  text-align: center;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  transition: background 0.3s ease;
`;

const FooterContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;

  a {
    color: ${(props) => props.theme.textColor};
    font-size: 1.2rem;
    transition: color 0.3s ease;

    &:hover {
      color: ${(props) => props.theme.primaryColor};
    }
  }
`;

const FooterText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${(props) => props.theme.textColor};
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <SocialLinks>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <FaTwitter />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <FaLinkedin />
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <FaGithub />
          </a>
        </SocialLinks>
        <FooterText>© {new Date().getFullYear()} Your Company. All rights reserved.</FooterText>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;