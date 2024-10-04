// src/components/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaChartBar, FaDollarSign, FaMapMarkedAlt } from 'react-icons/fa';

// Keyframes for hover animations
const hoverLift = keyframes`
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-10px);
  }
`;

// Dashboard container with responsive grid
const DashboardContainer = styled.div`
  padding: 4rem 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  transition: padding 0.3s ease;

  @media (max-width: 768px) {
    padding: 3rem 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 2rem 1rem;
  }
`;

// Glassmorphism card design
const Card = styled(Link)`
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: ${(props) => props.theme.textColor};
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-decoration: none;

  &:hover {
    animation: ${hoverLift} 0.3s forwards;
    box-shadow: 0 16px 64px 0 rgba(31, 38, 135, 0.37);
    background: ${(props) => props.theme.primaryColor};
    color: #ffffff;
  }

  /* Icon Styling */
  svg {
    font-size: 2.5rem;
    transition: color 0.3s ease;
  }

  &:hover svg {
    color: #ffffff;
  }
`;

// Card title styling
const CardTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-family: 'Inter', sans-serif;
  user-select: none;
`;

const Dashboard = () => {
  return (
    <DashboardContainer>
      <Card to="/ecm">
        <FaChartBar />
        <CardTitle>ECM Analysis</CardTitle>
      </Card>
      <Card to="/price-diff">
        <FaDollarSign />
        <CardTitle>Price Differential Analysis</CardTitle>
      </Card>
      <Card to="/spatial">
        <FaMapMarkedAlt />
        <CardTitle>Spatial Analysis</CardTitle>
      </Card>
    </DashboardContainer>
  );
};

export default Dashboard;