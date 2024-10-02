Certainly! Below is the **updated `README.md`** that aligns with your comprehensive methodology, integrates the **Price Differential Model**, the **Error Correction Model (ECM)**, and **Spatial Econometric Analyses**, and excludes any control variables as per your requirements. This README provides a detailed overview of your project, ensuring clarity and ease of navigation for users and contributors.

---

```markdown
# Yemen Market Analysis

## Overview

The **Yemen Market Analysis** project investigates the impact of conflict intensity on commodity prices across Yemen's markets. By integrating various econometric models, including the **Error Correction Model (ECM)** and the **Price Differential Model**, along with spatial econometric analyses, the project aims to understand how ongoing conflicts influence market dynamics, price stability, and economic behavior in different regions of Yemen.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Methodology](#methodology)
- [Data Files and Structure](#data-files-and-structure)
  - [unified_data.geojson](#unified_datageojson)
- [Installation](#installation)
- [Usage](#usage)
  - [Running the Entire Pipeline](#running-the-entire-pipeline)
  - [Running Individual Models](#running-individual-models)
    - [Error Correction Model (ECM)](#error-correction-model-ecm)
    - [Price Differential Model](#price-differential-model)
    - [Spatial Econometric Analysis](#spatial-econometric-analysis)
- [Results](#results)
  - [ECM Analysis Results](#ecm-analysis-results)
  - [Price Differential Analysis Results](#price-differential-analysis-results)
  - [Spatial Econometric Analysis Results](#spatial-econometric-analysis-results)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Project Structure

```
Yemen_Market_Analysis/
├── config/
│   └── config.yaml
├── data/
│   ├── raw/
│   └── processed/
│       └── unified_data.geojson
├── ecm_analysis/
│   ├── ecm_analysis.py
│   └── ecm_utils.py
├── price_differential_model/
│   ├── price_differential_model.py
│   └── pdm_utils.py
├── spatial_analysis/
│   ├── spatial_models.py
│   └── spatial_utils.py
├── results/
│   ├── ecm/
│   │   └── ecm_analysis_results.json
│   ├── price_differential/
│   │   └── price_differential_results.json
│   ├── spatial/
│   │   └── spatial_analysis_results.json
│   └── logs/
│       ├── ecm_analysis.log
│       ├── price_differential_model.log
│       └── spatial_analysis.log
├── utils/
│   ├── data_utils.py
│   ├── model_utils.py
│   └── common_utils.py
├── pipeline.py
├── setup_project.py
├── requirements.txt
└── README.md
```

### Directory Breakdown

- **config/**: Contains configuration files (`config.yaml`) that store project parameters and settings.
- **data/**:
  - **raw/**: Holds the original, unprocessed data files.
  - **processed/**: Contains cleaned and processed data ready for analysis (`unified_data.geojson`).
- **ecm_analysis/**:
  - **ecm_analysis.py**: Script to perform the **Error Correction Model (ECM)** analysis.
  - **ecm_utils.py**: Utility functions specific to ECM analysis.
- **price_differential_model/**:
  - **price_differential_model.py**: Script to perform the **Price Differential Model** analysis.
  - **pdm_utils.py**: Utility functions specific to the Price Differential Model.
- **spatial_analysis/**:
  - **spatial_models.py**: Script to perform spatial econometric analyses.
  - **spatial_utils.py**: Utility functions for spatial data handling and analysis.
- **results/**:
  - **ecm/**: Stores ECM analysis results (`ecm_analysis_results.json`).
  - **price_differential/**: Stores Price Differential Model results (`price_differential_results.json`).
  - **spatial/**: Stores spatial analysis results (`spatial_analysis_results.json`).
  - **logs/**: Keeps log files for tracking the analysis process (`ecm_analysis.log`, `price_differential_model.log`, `spatial_analysis.log`).
- **utils/**:
  - **data_utils.py**: General-purpose data handling functions.
  - **model_utils.py**: Shared utility functions for model estimation and diagnostics.
  - **common_utils.py**: Other shared utility functions used across multiple scripts.
- **pipeline.py**: Orchestrates the execution of various analysis scripts, ensuring a streamlined workflow.
- **setup_project.py**: Automates the creation of the project directory structure and initializes placeholder files.
- **requirements.txt**: Lists all Python dependencies required for the project.
- **README.md**: Project documentation and guidelines.

## Methodology

This project employs an integrated econometric approach to analyze the relationship between commodity prices and conflict intensity in Yemen. The methodology encompasses data preparation, exploratory data analysis, time series analysis, cointegration testing, ECM estimation, price differential modeling, spatial econometric analysis, and robustness checks.

### Key Steps:

1. **Data Preparation and Cleaning**
   - Standardization of market and commodity names.
   - Missing values treatment using state-space models with Kalman smoothing.
   - Outlier detection and treatment.
   - Currency conversions to USD.

2. **Construction of Key Variables**
   - **Conflict Intensity Index (CII):**
     \[
     CII_{i,t} = \ln(1 + \text{Events}_{i,t}) + \ln(1 + \text{Fatalities}_{i,t})
     \]
   - **Real Price Index (RPI):**
     \[
     RPI_{i,j,t} = \left( \frac{\text{Nominal Price}_{i,j,t}}{\text{CPI}_{t}} \right) \times 100
     \]
   - Additional variables like distance matrices and market accessibility indices.

3. **Exploratory Data Analysis**
   - Descriptive statistics and visualization.
   - Correlation analysis.
   - Seasonality and trend decomposition using STL.

4. **Time Series Properties Analysis**
   - Stationarity tests (ADF, KPSS, PP).
   - Structural break analysis (Zivot-Andrews, Bai-Perron tests).
   - Panel unit root tests (IPS, LLC).

5. **Cointegration and Long-Run Relationships**
   - Engle-Granger two-step method.
   - Johansen cointegration test.
   - Panel cointegration tests (Pedroni, Westerlund, Kao).

6. **Error Correction Models (ECM)**
   - Model specification for both single equation and panel ECMs.
   - Estimation methods (OLS, PMG, MG).
   - Model selection and diagnostics.

7. **Price Differential Analysis**
   - Calculation of pairwise price differentials.
   - Panel regression analysis with fixed or random effects.
   - Multicollinearity handling and diagnostic tests.

8. **Spatial Econometric Analysis**
   - Construction of spatial weight matrices.
   - Spatial autocorrelation tests (Global Moran’s I, LISA).
   - Spatial regression models (SLM, SEM, SDM).

9. **Robustness Checks and Sensitivity Analysis**
   - Alternative model specifications.
   - Subsampling and rolling window estimation.
   - Addressing endogeneity concerns.
   - Bootstrapping and Monte Carlo simulations.

10. **Integration of Models and Best Practices**
    - Consistent data preprocessing.
    - Parallel processing for computational efficiency.
    - Documentation and reproducibility.

## Data Files and Structure

### `unified_data.geojson`

The `unified_data.geojson` file consolidates both commodity price data and conflict-related metrics. Each feature represents a specific commodity in a designated region (`admin1`) on a particular date.

#### Structure Overview

Each entry in the `unified_data.geojson` file adheres to the following structure:

```json
{
    "type": "Feature",
    "properties": {
        "admin1": "abyan",
        "commodity": "beans (kidney red)",
        "date": "2020-10-01",
        "price": 1240.0,
        "usdprice": 5.0296,
        "latitude": 13.129193305969238,
        "longitude": 45.377635955810547,
        "events": 36.0,
        "fatalities": 34.0,
        "population": 629000.0,
        "exchange_rate_regime": "north",
        "conflict_intensity": 7.166265974133638,
        "conflict_intensity_weighted": 0.16671809285367306,
        "conflict_intensity_normalized": 0.5706119268723905,
        "conflict_intensity_lag1": 0.5637451328223724,
        "conflict_intensity_lag2": 0.6410350084353664,
        "conflict_intensity_lag3": 0.5809748688619805
    },
    "geometry": {
        "type": "Point",
        "coordinates": [45.377635955810547, 13.129193305969238]
    }
}
```

#### Field Descriptions

| Field                           | Type     | Description                                                                                         |
|---------------------------------|----------|-----------------------------------------------------------------------------------------------------|
| `admin1`                        | `string` | The primary administrative region (e.g., "abyan").                                                  |
| `commodity`                     | `string` | Name of the commodity (e.g., "beans (kidney red)").                                                 |
| `date`                          | `string` | Observation date in `YYYY-MM-DD` format.                                                            |
| `price`                         | `float`  | Price of the commodity in local currency.                                                           |
| `usdprice`                      | `float`  | Price of the commodity converted to USD.                                                            |
| `latitude`                      | `float`  | Latitude coordinate of the market location.                                                         |
| `longitude`                     | `float`  | Longitude coordinate of the market location.                                                        |
| `events`                        | `float`  | Number of conflict events reported on the observation date.                                         |
| `fatalities`                    | `float`  | Number of fatalities resulting from conflict events on the observation date.                        |
| `population`                    | `float`  | Population of the region (`admin1`).                                                                |
| `exchange_rate_regime`          | `string` | Exchange rate regime applicable to the region (e.g., "north", "south", "unified").                  |
| `conflict_intensity`            | `float`  | Raw measure of conflict intensity on the observation date.                                          |
| `conflict_intensity_weighted`   | `float`  | Weighted measure of conflict intensity, accounting for factors like event severity.                 |
| `conflict_intensity_normalized` | `float`  | Normalized conflict intensity score for comparative analysis across regions and dates.              |
| `conflict_intensity_lag1`       | `float`  | Conflict intensity measure lagged by one period.                                                    |
| `conflict_intensity_lag2`       | `float`  | Conflict intensity measure lagged by two periods.                                                   |
| `conflict_intensity_lag3`       | `float`  | Conflict intensity measure lagged by three periods.                                                 |
| `geometry`                      | `object` | Geospatial data representing the market location.                                                   |

#### Notes

- **Consistency:** All string fields, such as `commodity` and `exchange_rate_regime`, are standardized to lowercase to ensure consistency across analyses.
- **Missing Data:** In cases where certain fields are missing in the GeoJSON data, the corresponding values are set to `null` (or `NaN` when converted to a pandas DataFrame) to maintain the integrity of the dataset.
- **Spatial Data:** The `geometry` field is included for potential spatial analyses. Utilize libraries like **GeoPandas** and **PySAL** for enhanced geospatial data handling.

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/Yemen_Market_Analysis.git
   cd Yemen_Market_Analysis
   ```

2. **Create a Virtual Environment:**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

   *Ensure that all necessary libraries are listed in `requirements.txt`.*

## Usage

### Running the Entire Pipeline

You can run the entire analysis pipeline, which includes data preparation, ECM analysis, Price Differential Model, and spatial econometric analysis.

```bash
python pipeline.py
```

This script orchestrates the execution of all analysis scripts and ensures a streamlined workflow.

### Running Individual Models

#### Error Correction Model (ECM)

1. **Ensure Data Availability:**

   Confirm that the `unified_data.geojson` file is available in the `data/processed/` directory.

2. **Configure Project Settings:**

   Modify `config/config.yaml` to set parameters specific to the ECM analysis, such as `stationarity_significance_level` and `cointegration_max_lags`.

3. **Run the ECM Analysis Script:**

   ```bash
   python ecm_analysis/ecm_analysis.py
   ```

   This script will perform the ECM analysis, test for cointegration, estimate the ECM, and save the results in the `results/ecm/` directory.

4. **Review Logs and Results:**

   - **Logs:** Check `results/logs/ecm_analysis.log` for detailed execution logs.
   - **Results:** Navigate to `results/ecm/` to access `ecm_analysis_results.json` and other related output files.

#### Price Differential Model

1. **Data Preparation:**

   Ensure that the `unified_data.geojson` file is located in the `data/processed/` directory.

2. **Configure Project Settings:**

   Adjust the parameters in `config/config.yaml` as needed, especially if paths or analysis parameters require modification.

3. **Run the Price Differential Model Script:**

   ```bash
   python price_differential_model/price_differential_model.py
   ```

   This script will perform the Price Differential Model analysis, generate diagnostics, and save the results in the `results/price_differential/` directory.

4. **Review Logs and Results:**

   - **Logs:** Check `results/logs/price_differential_model.log` for detailed execution logs.
   - **Results:** Navigate to `results/price_differential/` to access `price_differential_results.json` and other related output files.

#### Spatial Econometric Analysis

1. **Ensure Data Availability:**

   Confirm that the processed data is ready for spatial analysis.

2. **Run the Spatial Analysis Script:**

   ```bash
   python spatial_analysis/spatial_models.py
   ```

   This script performs spatial autocorrelation tests and estimates spatial regression models.

3. **Review Logs and Results:**

   - **Logs:** Check `results/logs/spatial_analysis.log` for detailed execution logs.
   - **Results:** Navigate to `results/spatial/` to access `spatial_analysis_results.json`.

## Results

### ECM Analysis Results

The ECM analysis captures both short-term dynamics and long-term equilibrium relationships between commodity prices and conflict intensity.

- **ECM Parameters:** Estimates of short-term effects and the speed of adjustment to long-run equilibrium.
- **Cointegration Test Results:** Evidence of long-term relationships between variables.
- **Model Diagnostics:** R-squared, Adjusted R-squared, AIC, BIC, and other model selection criteria.
- **Residual Diagnostics:** Tests for serial correlation, heteroskedasticity, and normality.

**File:** `results/ecm/ecm_analysis_results.json`

**Structure:**

```json
[
    {
        "commodity": "beans (kidney red)",
        "regime": "unified",
        "ecm_results": {
            "regression": {
                "coefficients": {
                    "const": 0.1234,
                    "ecm_lagged": -0.5678,
                    ...
                },
                "std_errors": {
                    "const": 0.0123,
                    "ecm_lagged": 0.0456,
                    ...
                },
                ...
            },
            "diagnostics": {
                "breusch_godfrey_stat": 1.2345,
                "breusch_godfrey_pvalue": 0.5678,
                ...
            },
            ...
        },
        "stationarity": {
            "usdprice": {
                "transformation": "log_diff",
                "series": [...],
                "results": {...}
            },
            "conflict_intensity": {
                "transformation": "diff",
                "series": [...],
                "results": {...}
            }
        },
        "cointegration": {
            "engle_granger": {
                "cointegration_statistic": 3.4567,
                "p_value": 0.0123,
                ...
            },
            ...
        }
    },
    ...
]
```

### Price Differential Analysis Results

The Price Differential Model examines how price differences between markets relate to geographical distance and conflict intensity correlation.

- **Regression Coefficients:** Estimates of the relationship between price differentials, distance, and conflict correlation.
- **Diagnostic Tests:** Statistical tests to validate model assumptions.
- **Multicollinearity Assessment:** Variance Inflation Factor (VIF) analysis.
- **Model Selection:** Fixed Effects (FE) or Random Effects (RE) models based on the Hausman test.

**File:** `results/price_differential/price_differential_results.json`

**Structure:**

```json
{
    "base_market": "aden",
    "commodity_results": {
        "beans (kidney red)": [
            {
                "base_market": "aden",
                "other_market": "hodeidah",
                "commodity": "beans (kidney red)",
                "price_differential": [...],
                "stationarity": {...},
                "conflict_correlation": 0.6789,
                "common_dates": 45,
                "distance": 150.5,
                "p_value": 0.0456
            },
            ...
        ],
        ...
    },
    "model_results": {
        "regression": {
            "coefficients": {
                "const": 0.5678,
                "distance": -0.1234,
                "conflict_correlation": 0.2345,
                ...
            },
            "std_errors": {
                "const": 0.0567,
                "distance": 0.0123,
                "conflict_correlation": 0.0234,
                ...
            },
            ...
        },
        "diagnostics": {
            "vif": [
                {"Variable": "const", "VIF": 1.0},
                {"Variable": "distance", "VIF": 2.5},
                {"Variable": "conflict_correlation", "VIF": 3.1},
                ...
            ],
            "breuschPaganTest": {
                "statistic": 4.5678,
                "pValue": 0.0123
            },
            "normalityTest": {
                "statistic": 5.6789,
                "pValue": 0.0023
            },
            "reset_test_statistic": 2.3456,
            "reset_test_pvalue": 0.0256,
            "heteroskedasticity_pvalue": 0.0123,
            "durbin_watson": 2.0456
        }
    }
}
```

### Spatial Econometric Analysis Results

Spatial econometric analysis uncovers spatial dependencies and spillover effects.

- **Spatial Autocorrelation Tests:** Results from Global Moran’s I and Local Moran’s I (LISA).
- **Spatial Regression Models:** Estimates from Spatial Lag Model (SLM), Spatial Error Model (SEM), and Spatial Durbin Model (SDM).
- **Spatial Panel Models:** Analysis incorporating both spatial and temporal dimensions.
- **Model Diagnostics:** Tests for spatial dependence, heteroskedasticity, and autocorrelation.

**File:** `results/spatial/spatial_analysis_results.json`

**Structure:**

```json
{
    "spatial_autocorrelation": {
        "global_morans_i": {
            "statistic": 0.3456,
            "p_value": 0.0001
        },
        "lisa": {
            "clusters": [...],
            "outliers": [...]
        }
    },
    "spatial_regression_models": {
        "SLM": {
            "coefficients": {...},
            "diagnostics": {...}
        },
        "SEM": {
            "coefficients": {...},
            "diagnostics": {...}
        },
        "SDM": {
            "coefficients": {...},
            "diagnostics": {...}
        }
    },
    "spatial_panel_models": {
        "model_type": "Spatial Durbin Panel Model",
        "coefficients": {...},
        "diagnostics": {...}
    }
}
```

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Commit Your Changes**

   ```bash
   git commit -m "Add Your Feature"
   ```

4. **Push to the Branch**

   ```bash
   git push origin feature/YourFeatureName
   ```

5. **Open a Pull Request**

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any inquiries or support, please contact:

- **Name:** [Your Name]
- **Email:** [your.email@example.com]
- **LinkedIn:** [Your LinkedIn Profile](https://www.linkedin.com/in/yourprofile)

```

