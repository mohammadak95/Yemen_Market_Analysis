import { pathResolver } from './pathResolver';

class PathValidatorUtility {
  constructor() {
    // Standard path mappings
    this.pathMappings = {
      development: {
        base: '/public/data',
        api: '/api',
        static: '/static'
      },
      production: {
        base: '/Yemen_Market_Analysis/data',
        api: '/Yemen_Market_Analysis/api',
        static: '/Yemen_Market_Analysis/static'
      }
    };

    // Commodity name normalizer
    this.normalizeCommodityName = (name) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .replace(/[()]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    };
  }

  // Get correct commodity file path based on environment
  getCommodityFilePath(commodity, env = process.env.NODE_ENV) {
    const normalizedName = this.normalizeCommodityName(commodity);
    const basePath = this.pathMappings[env]?.base || '/data';
    return `${basePath}/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedName}.json`;
  }

  // Get API endpoint for preprocessed data
  getPreprocessedDataEndpoint(commodity) {
    const normalizedName = this.normalizeCommodityName(commodity);
    return `/api/preprocessed-data?commodity=${encodeURIComponent(normalizedName)}`;
  }

  // Detect environment and get correct path
  detectEnvironment() {
    if (window.location.hostname.includes('github.io')) return 'production';
    if (process.env.NODE_ENV === 'production') return 'production';
    return 'development';
  }

  // Validate and fix paths
  validatePaths() {
    const env = this.detectEnvironment();
    const results = {
      environment: env,
      baseUrl: this.pathMappings[env].base,
      apiEndpoint: this.pathMappings[env].api,
      pathMappings: {},
      suggestions: []
    };

    // Test paths and collect results
    const testCommodities = ['beans (kidney red)', 'wheat_flour', 'rice_imported'];
    testCommodities.forEach(commodity => {
      const filePath = this.getCommodityFilePath(commodity, env);
      const apiEndpoint = this.getPreprocessedDataEndpoint(commodity);
      results.pathMappings[commodity] = {
        normalized: this.normalizeCommodityName(commodity),
        filePath,
        apiEndpoint
      };
    });

    return results;
  }

  // Fix file path issues
  applyPathFixes(app) {
    const existingStaticHandler = app._router.stack.find(
      layer => layer.name === 'serveStatic' && layer.regexp.test('/public/data')
    );

    if (!existingStaticHandler) {
      // Add correct static file serving
      app.use('/data', express.static(path.join(__dirname, '..', 'public', 'data')));
      
      // Add API endpoint that checks both locations
      app.get('/api/preprocessed-data', async (req, res) => {
        try {
          const { commodity } = req.query;
          if (!commodity) {
            return res.status(400).json({ error: 'Commodity parameter is required' });
          }

          const normalizedName = this.normalizeCommodityName(commodity);
          const possiblePaths = [
            path.join(__dirname, '..', 'public', 'data', 'preprocessed_by_commodity', 
                     `preprocessed_yemen_market_data_${normalizedName}.json`),
            path.join(__dirname, '..', 'results', 'preprocessed_by_commodity',
                     `preprocessed_yemen_market_data_${normalizedName}.json`)
          ];

          let data;
          for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
              data = await fs.readJson(filePath);
              break;
            }
          }

          if (!data) {
            return res.status(404).json({ 
              error: 'Data not found',
              checkedPaths: possiblePaths
            });
          }

          res.json(data);
        } catch (error) {
          console.error('Error fetching preprocessed data:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
    }
  }
}

export const pathValidator = new PathValidatorUtility();