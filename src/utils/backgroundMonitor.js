// src/utils/backgroundMonitor.js

class BackgroundMonitor {
    constructor() {
      this.logs = [];
      this.metrics = new Map();
      this.startTime = Date.now();
      this.isEnabled = process.env.NODE_ENV === 'development';
      this.setupMonitoring();
    }
  
    setupMonitoring() {
      if (!this.isEnabled) return;
  
      // Monitor network requests
      this.interceptNetworkRequests();
  
      // Monitor Redux actions and state
      this.setupReduxMonitoring();
  
      // Monitor React renders
      this.setupReactMonitoring();
  
      // Monitor console output
      this.interceptConsole();
  
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
  
      // Monitor memory usage
      this.startMemoryMonitoring();
    }
  
    interceptNetworkRequests() {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = performance.now();
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        
        try {
          const response = await originalFetch(...args);
          const duration = performance.now() - startTime;
          
          this.logMetric('network', {
            url,
            duration,
            status: response.status,
            timestamp: Date.now()
          });
          
          return response;
        } catch (error) {
          this.logError('network', {
            url,
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      };
    }
  
    setupReduxMonitoring() {
      if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
        const devTools = window.__REDUX_DEVTOOLS_EXTENSION__;
        devTools.subscribe((message) => {
          if (message.type === 'DISPATCH') {
            this.logMetric('redux', {
              action: message.payload.type,
              timestamp: Date.now(),
              state: message.state
            });
          }
        });
      }
    }
  
    setupReactMonitoring() {
      if (typeof window !== 'undefined') {
        // Monitor React render timing using Performance Observer
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.startsWith('⚛')) {
              this.logMetric('react', {
                component: entry.name,
                duration: entry.duration,
                timestamp: Date.now()
              });
            }
          });
        });
  
        observer.observe({ entryTypes: ['measure'] });
      }
    }
  
    interceptConsole() {
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug
      };
  
      Object.keys(originalConsole).forEach(method => {
        console[method] = (...args) => {
          this.logMetric('console', {
            level: method,
            message: args,
            timestamp: Date.now()
          });
          originalConsole[method].apply(console, args);
        };
      });
    }
  
    setupPerformanceMonitoring() {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.logMetric('performance', {
              type: 'long-task',
              duration: entry.duration,
              timestamp: Date.now()
            });
          }
        });
      });
  
      longTaskObserver.observe({ entryTypes: ['longtask'] });
  
      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.logMetric('resource', {
            name: entry.name,
            type: entry.initiatorType,
            duration: entry.duration,
            timestamp: Date.now()
          });
        });
      });
  
      resourceObserver.observe({ entryTypes: ['resource'] });
    }
  
    startMemoryMonitoring() {
      if (performance.memory) {
        setInterval(() => {
          this.logMetric('memory', {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            timestamp: Date.now()
          });
        }, 10000); // Every 10 seconds
      }
    }
  
    logMetric(category, data) {
      if (!this.isEnabled) return;
  
      const metric = {
        category,
        data,
        timestamp: Date.now(),
        timeSinceStart: Date.now() - this.startTime
      };
  
      this.logs.push(metric);
      this.pruneOldLogs();
  
      // Store aggregated metrics
      const key = `${category}-${Math.floor(Date.now() / 60000)}`; // Group by minute
      const existingMetrics = this.metrics.get(key) || [];
      existingMetrics.push(data);
      this.metrics.set(key, existingMetrics);
    }
  
    logError(category, error) {
      this.logMetric('error', {
        category,
        error,
        timestamp: Date.now()
      });
    }
  
    pruneOldLogs() {
      // Keep last 1000 logs
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-1000);
      }
    }
  
    getMetricsSummary() {
      const summary = {
        startTime: this.startTime,
        endTime: Date.now(),
        duration: Date.now() - this.startTime,
        totalLogs: this.logs.length,
        categories: {},
        performance: {
          networkRequests: {
            total: 0,
            averageDuration: 0,
            errors: 0
          },
          reactRenders: {
            total: 0,
            averageDuration: 0
          },
          memory: {
            average: 0,
            peak: 0
          }
        }
      };
  
      // Process logs
      this.logs.forEach(log => {
        if (!summary.categories[log.category]) {
          summary.categories[log.category] = 0;
        }
        summary.categories[log.category]++;
  
        // Process specific metrics
        switch (log.category) {
          case 'network':
            summary.performance.networkRequests.total++;
            if (log.data.duration) {
              summary.performance.networkRequests.averageDuration += log.data.duration;
            }
            break;
          case 'react':
            summary.performance.reactRenders.total++;
            if (log.data.duration) {
              summary.performance.reactRenders.averageDuration += log.data.duration;
            }
            break;
          case 'memory':
            if (log.data.usedJSHeapSize) {
              summary.performance.memory.average += log.data.usedJSHeapSize;
              summary.performance.memory.peak = Math.max(
                summary.performance.memory.peak,
                log.data.usedJSHeapSize
              );
            }
            break;
        }
      });
  
      // Calculate averages
      if (summary.performance.networkRequests.total > 0) {
        summary.performance.networkRequests.averageDuration /= 
          summary.performance.networkRequests.total;
      }
      if (summary.performance.reactRenders.total > 0) {
        summary.performance.reactRenders.averageDuration /= 
          summary.performance.reactRenders.total;
      }
      if (this.logs.length > 0) {
        summary.performance.memory.average /= this.logs.length;
      }
  
      return summary;
    }
  
    exportLogs() {
      return {
        summary: this.getMetricsSummary(),
        logs: this.logs,
        metrics: Array.from(this.metrics.entries())
      };
    }
  
    downloadLogs() {
      const data = this.exportLogs();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  
  export const backgroundMonitor = new BackgroundMonitor();
  
  // Add a global access point for console usage
  if (process.env.NODE_ENV === 'development') {
    window.__debugMonitor = backgroundMonitor;
  }