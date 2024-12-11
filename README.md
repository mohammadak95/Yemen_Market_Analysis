# Yemen Market Analysis Reproduction Package

This repository contains code and documentation for analyzing market price differentials in Yemen, with a focus on spatial econometrics and conflict-zone market dynamics.

## Project Structure

```
├── project/
│   ├── config/
│   │   └── config.yaml         # Configuration parameters
│   ├── price_diffrential_analysis/
│   │   └── price_differential_model_v2.py  # Main analysis script
│   └── utils/
│       └── common_utils.py     # Utility functions
├── data/
│   ├── processed/             # Processed data files
│   └── raw/                   # Raw data files
├── results/
│   └── price_diff_results/    # Analysis outputs
└── requirements.txt           # Python dependencies
```

## Setup Instructions

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Data Requirements

The analysis requires the following data files:

1. `data/processed/unified_data.geojson`: Unified market data containing:
   - Market locations (latitude, longitude)
   - Price data (USD)
   - Conflict intensity metrics
   - Exchange rate regime information
   - Administrative region identifiers

2. `external_data/naturalearth_lowres/ne_110m_admin_0_countries.shp`: Base map data for visualization

## Configuration

The analysis parameters are controlled through `project/config/config.yaml`. Key parameters include:

- `min_common_dates`: Minimum number of common dates required for market pair analysis
- `lag_periods`: Number of lag periods for time series analysis
- `distance_threshold`: Maximum distance for considering market pairs
- `commodities`: List of commodities to analyze
- `exchange_rate_regimes`: Exchange rate regime categories

## Running the Analysis

1. Ensure all data files are in place and the virtual environment is activated.

2. Run the main analysis script:
```bash
python project/price_diffrential_analysis/price_differential_model_v2.py
```

The script will:
- Load and preprocess market data
- Perform stationarity tests
- Calculate price differentials
- Analyze market pairs
- Generate results in JSON format

## Output

Results are saved to `results/price_diff_results/price_differential_results.json` containing:

- Market pair analysis results
- Stationarity test statistics
- Cointegration results
- Regression diagnostics
- Spatial metrics

## Methodology

The analysis employs several econometric techniques:

1. **Data Preprocessing**
   - Seasonal adjustment using decomposition
   - Moving average smoothing
   - Duplicate handling
   - Exchange rate regime unification

2. **Statistical Tests**
   - Augmented Dickey-Fuller (ADF) test for stationarity
   - KPSS test for trend stationarity
   - Cointegration analysis

3. **Market Integration Analysis**
   - Price differential calculations
   - Spatial distance computations
   - Conflict correlation analysis
   - Time series regression

4. **Quality Controls**
   - Minimum data requirements
   - Outlier detection
   - Missing value handling
   - Data validation checks

## Performance Considerations

The analysis utilizes parallel processing for market pair analysis. The number of cores used is automatically determined based on:
- Available CPU cores
- Number of market pairs to analyze

Memory caching is implemented for data loading operations using joblib.

## Troubleshooting

Common issues and solutions:

1. **Memory Errors**
   - Reduce the number of parallel processes
   - Filter commodities in config.yaml
   - Clear the joblib cache

2. **Missing Data Errors**
   - Verify data file paths
   - Check data format requirements
   - Ensure sufficient common dates

3. **Performance Issues**
   - Adjust MIN_COMMON_DATES in config
   - Reduce COMMODITIES list
   - Clear cached results

## Citation

When using this code or methodology, please cite:

```
Yemen Market Analysis Project
[Author Information]
[Institution]
[Year]
```

## License

[Specify License]

## Contact

[Contact Information]

## Acknowledgments

This research was supported by [funding/institutional support information].
