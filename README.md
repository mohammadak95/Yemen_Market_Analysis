# Yemen Market Analysis Reproduction Package

This repository contains the reproduction package for the paper "Market Unity Amidst Conflict: Price Integration Analysis in Yemen".

## Repository Structure

```
├── data/                  # Data files
│   ├── raw/              # Original unprocessed data
│   └── processed/        # Cleaned and processed datasets
├── code/                 # Analysis code
│   ├── cleaning/        # Data cleaning scripts
│   ├── analysis/        # Main analysis scripts
│   └── figures/         # Figure generation scripts
├── output/              # Generated outputs
│   ├── tables/         # Generated tables
│   └── figures/        # Generated figures
├── docs/                # Documentation
│   ├── methodology/    # Methodology documentation
│   └── data/          # Data documentation
└── presentation/       # Presentation materials
```

## Requirements

- R (>= 4.0.0)
- Python (>= 3.8)
- Required R packages:
  - tidyverse
  - spatialreg
  - spdep
  - vars
- Required Python packages:
  - pandas
  - numpy
  - statsmodels
  - geopandas

## Reproduction Steps

1. Clone this repository
2. Install required dependencies
3. Run data cleaning scripts:
   ```bash
   Rscript code/cleaning/clean_data.R
   ```
4. Run analysis scripts:
   ```bash
   Rscript code/analysis/market_integration.R
   Rscript code/analysis/spatial_analysis.R
   ```
5. Generate figures:
   ```bash
   Rscript code/figures/generate_figures.R
   ```

## Data Sources

- World Food Programme (WFP) price data
- Central Bank of Yemen exchange rates
- ACAPS Yemen Analysis Hub geographic data
- ACLED conflict data

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Citation

If you use this code or data, please cite:

```bibtex
@article{alakkaoui2024market,
  title={Market Unity Amidst Conflict: Price Integration Analysis in Yemen},
  author={Al Akkaoui, Mohammad},
  year={2024}
}
```

## Contact

Mohammad al Akkaoui
