// src/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartBar, FaDollarSign, FaMapMarkedAlt } from 'react-icons/fa';

const dashboardContainerStyle = {
  padding: '4rem 2rem',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '2rem',
};

const cardStyle = {
  padding: '2rem',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '15px',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  color: '#000', // You can adjust this based on your theme
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
  textDecoration: 'none',
};

const iconStyle = {
  fontSize: '2.5rem',
};

const cardTitleStyle = {
  margin: '0',
  fontSize: '1.5rem',
  fontFamily: "'Inter', sans-serif",
};

const Dashboard = () => {
  return (
    <div style={dashboardContainerStyle}>
      <Link to="/ecm" style={cardStyle}>
        <FaChartBar style={iconStyle} />
        <h2 style={cardTitleStyle}>ECM Analysis</h2>
      </Link>
      <Link to="/price-diff" style={cardStyle}>
        <FaDollarSign style={iconStyle} />
        <h2 style={cardTitleStyle}>Price Differential Analysis</h2>
      </Link>
      <Link to="/spatial" style={cardStyle}>
        <FaMapMarkedAlt style={iconStyle} />
        <h2 style={cardTitleStyle}>Spatial Analysis</h2>
      </Link>
    </div>
  );
};

export default Dashboard;