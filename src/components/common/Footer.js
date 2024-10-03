import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const FooterContainer = styled.footer`
  background-color: ${props => props.theme.primaryBackground};
  color: ${props => props.theme.text};
  padding: 1rem;
  text-align: center;
`;

const Footer = () => {
  const { t } = useTranslation();

  return (
    <FooterContainer>
      <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
    </FooterContainer>
  );
};

export default Footer;