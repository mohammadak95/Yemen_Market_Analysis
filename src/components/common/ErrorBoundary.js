// src/components/common/ErrorBoundary.js

import React from 'react';
import { monitoringSystem } from '../../utils/MonitoringSystem'; // Ensure correct import path

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Update state when an error is caught
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Log error details to the monitoring system
  componentDidCatch(error, errorInfo) {
    monitoringSystem.error('Error caught by ErrorBoundary:', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      // Render a user-friendly fallback UI without reload options
      return (
        <div style={styles.container}>
          <h1 style={styles.heading}>Something Went Wrong</h1>
          <p style={styles.message}>
            An unexpected error has occurred. Our team has been notified.
          </p>
          {/* Optional: Provide a way to report the issue or navigate elsewhere */}
          {/* <button onClick={this.handleReport} style={styles.button}>
            Report Issue
          </button> */}
        </div>
      );
    }

    return this.props.children;
  }

  // Optional: Method to handle additional actions like reporting the issue
  // handleReport = () => {
  //   // Implement reporting functionality if needed
  // };
}

const styles = {
  container: {
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1rem',
    marginBottom: '1.5rem',
    maxWidth: '600px',
  },
  // button: {
  //   padding: '0.5rem 1rem',
  //   fontSize: '1rem',
  //   cursor: 'pointer',
  //   backgroundColor: '#dc3545',
  //   color: '#fff',
  //   border: 'none',
  //   borderRadius: '4px',
  // },
};

export default ErrorBoundary;