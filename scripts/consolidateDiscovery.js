// scripts/consolidateDiscovery.js

const fs = require('fs');
const path = require('path');

const DISCOVERY_ROOT = path.join(__dirname, '../src/discovery');

// Define the new structure
const DISCOVERY_STRUCTURE = {
  core: {
    components: [
      'DiscoveryHub.js',
      'DiscoveryNavigation.js',
      'LearningPathLayout.js'
    ],
    context: [
      'DiscoveryContext.js'
    ]
  },
  tutorials: {
    components: {
      exercises: {
        ECMAnalysis: [
          'ECMInterpretationExercise.js',
          'ModelAssessmentExercise.js'
        ],
        MarketAnalysis: [
          'SeasonalPatternExercise.js',
          'TrendIdentificationExercise.js'
        ],
        SpatialAnalysis: [
          'NetworkAnalysisExercise.js',
          'SpatialPatternExercise.js'
        ],
        TVMIIAnalysis: [
          'IntegrationAssessmentExercise.js',
          'TVMIICalculationExercise.js'
        ]
      }
    },
    config: [
      'tutorialConfig.js'
    ]
  },
  demos: {
    components: [
      'DashboardIntro.js',
      'ECMDemo.js',
      'MethodologyDemo.js',
      'PriceAnalysisDemo/',
      'SpatialDemo.js',
      'TVMIIDemo.js',
      'WelcomeTutorial.js'
    ]
  },
  exercises: {
    components: [
      'ECMAnalysis/',
      'PriceAnalysis/',
      'PriceDifferential/',
      'SpatialAnalysis/',
      'TVMIIAnalysis/'
    ],
    shared: {
      components: [
        'ExerciseContainer.js',
        'ExerciseInput/'
      ],
      utils: [
        'validation.js',
        'scoring.js',
        'progress.js'
      ]
    }
  },
  support: {
    utils: [
      'AchievementManager.js',
      'DataUtils.js',
      'ExerciseTracker.js',
      'ProgressManager.js',
      'ValidationUtils.js'
    ]
  }
};

// Helper functions
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const copyFile = (source, dest) => {
  try {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${source} to ${dest}`);
  } catch (error) {
    console.error(`Error copying ${source}: ${error.message}`);
  }
};

const backupExistingStructure = () => {
  if (fs.existsSync(DISCOVERY_ROOT)) {
    const backupDir = `${DISCOVERY_ROOT}_backup_${Date.now()}`;
    fs.renameSync(DISCOVERY_ROOT, backupDir);
    console.log(`Backed up existing structure to ${backupDir}`);
  }
};

// Create new structure
const createStructure = (structure, basePath) => {
  Object.entries(structure).forEach(([dir, contents]) => {
    const currentPath = path.join(basePath, dir);
    ensureDirectoryExists(currentPath);

    if (Array.isArray(contents)) {
      contents.forEach(file => {
        if (file.endsWith('/')) {
          ensureDirectoryExists(path.join(currentPath, file));
        } else {
          const sourceFile = path.join(__dirname, '../src/components/discovery', dir, file);
          const destFile = path.join(currentPath, file);
          if (fs.existsSync(sourceFile)) {
            copyFile(sourceFile, destFile);
          }
        }
      });
    } else if (typeof contents === 'object') {
      createStructure(contents, currentPath);
    }
  });
};

// Main execution
const consolidateDiscovery = () => {
  console.log('Starting Discovery System consolidation...');
  
  // Backup existing structure
  backupExistingStructure();
  
  // Create new structure
  ensureDirectoryExists(DISCOVERY_ROOT);
  createStructure(DISCOVERY_STRUCTURE, DISCOVERY_ROOT);
  
  console.log('Discovery System consolidation complete!');
};

consolidateDiscovery();