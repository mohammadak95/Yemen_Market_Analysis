# project/price_differential_analysis/price_differential_model_v2.py

import json
import pandas as pd
import numpy as np
import geopandas as gpd
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.stats.diagnostic import het_breuschpagan
from statsmodels.stats.stattools import durbin_watson
import statsmodels.api as sm
from scipy.stats import pearsonr, jarque_bera
import logging
from pathlib import Path
import multiprocessing as mp
import warnings
from scipy.spatial.distance import euclidean
import yaml
import traceback
from datetime import datetime

# Additional Imports for Enhanced Functionality
from linearmodels.panel import PanelOLS, RandomEffects
from linearmodels.iv import IV2SLS
from joblib import Memory
from statsmodels.stats.outliers_influence import OLSInfluence
from statsmodels.stats.diagnostic import breaks_cusumolsresid

# Load configuration
def load_config(config_path='project/config/config.yaml'):
    try:
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)
        return config
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        raise

config = load_config()

# Suppress warnings for cleaner logs
warnings.filterwarnings("ignore")

# Setup caching
memory = Memory(location='cache', verbose=0)

# Setup logging based on config
directories = config.get('directories', {})
files = config.get('files', {})
parameters = config.get('parameters', {})
logging_config = parameters.get('logging', {})

# Extract logging parameters
log_level = logging_config.get('level', 'DEBUG').upper()  # Set to 'DEBUG' for detailed logs
log_format = logging_config.get('format', '%(asctime)s - %(levelname)s - %(message)s')

# Define directory paths from config
data_dir = Path(directories.get('data_dir', 'project/data/'))
processed_data_dir = Path(directories.get('processed_data_dir', 'project/data/processed/'))
results_dir = Path(directories.get('results_dir', 'results/'))
log_dir = Path(directories.get('logs_dir', 'results/logs/'))
external_data_dir = Path(directories.get('external_data_dir', 'external_data/'))

# Create necessary directories
log_dir.mkdir(parents=True, exist_ok=True)
price_diff_results_dir = results_dir / 'price_diff_results'
price_diff_results_dir.mkdir(parents=True, exist_ok=True)

# Define file paths from config
spatial_geojson = Path(files.get('spatial_geojson', 'project/data/processed/unified_data.geojson'))
enhanced_geojson = Path(files.get('enhanced_geojson', 'project/data/processed/enhanced_unified_data_with_residuals.geojson'))
spatial_analysis_results = Path(files.get('spatial_analysis_results', 'results/spatial_analysis_results.json'))
ecm_results = Path(files.get('ecm_results', 'results/ecm/ecm_analysis_results.json'))
spatial_weights_json = Path(files.get('spatial_weights_json', 'results/spatial_weights/spatial_weights.json'))
naturalearth_lowres = Path(files.get('naturalearth_lowres', 'external_data/naturalearth_lowres/ne_110m_admin_0_countries.shp'))

# Initialize logging
logging.basicConfig(
    level=logging.DEBUG,  # Force DEBUG level for detailed logs
    format=log_format,
    handlers=[
        logging.FileHandler(log_dir / 'price_differential_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration parameters from config.yaml
MIN_COMMON_DATES = parameters.get('min_common_dates', 20)
LAG_PERIODS = parameters.get('lag_periods', 2)
GRANGER_MAX_LAGS = parameters.get('granger_max_lags', 4)
DISTANCE_THRESHOLD = parameters.get('distance_threshold', 200)
COMMODITIES = parameters.get('commodities', [])
EXCHANGE_RATE_REGIMES = parameters.get('exchange_rate_regimes', ['north', 'south', 'unified'])
STATIONARITY_SIGNIFICANCE_LEVEL = parameters.get('stationarity_significance_level', 0.05)
COINTEGRATION_SIGNIFICANCE_LEVEL = parameters.get('cointegration_significance_level', 0.05)
RIDGE_ALPHA = parameters.get('ridge_alpha', 1.0)
MAX_EPOCHS = parameters.get('max_epochs', 1000)
LEARNING_RATE = parameters.get('learning_rate', 0.01)
MIN_REGIONS = parameters.get('min_regions', 5)
SPATIAL_THRESHOLD_MULTIPLIER = parameters.get('spatial_weights', {}).get('threshold_multiplier', 1)
MIN_NEIGHBORS = parameters.get('min_neighbors', 2)
REGIMES_TO_UNIFY = parameters.get('regimes_to_unify', ['north', 'south'])
NEW_REGIME_NAME = parameters.get('new_regime_name', 'unified')
EXCHANGE_RATE_REGIME_COLUMN = parameters.get('exchange_rate_regime_column', 'exchange_rate_regime')
REGION_IDENTIFIER = parameters.get('region_identifier', 'admin1')
TIME_COLUMN = parameters.get('time_column', 'date')
LAG_VARIABLE = parameters.get('lag_variable', 'usdprice')

@memory.cache  # Cached to optimize repeated data loading
def load_data(file_path):
    """Load data from GeoJSON file using GeoPandas and preprocess it."""
    logger.info(f"Loading data from {file_path}")
    try:
        gdf = gpd.read_file(file_path)
        df = pd.DataFrame(gdf.drop(columns='geometry'))
        logger.info(f"Loaded GeoJSON with {len(df)} records.")

        # Convert 'date' to datetime and set as index
        df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN])
        df.set_index(TIME_COLUMN, inplace=True)

        # Exclude 'Amanat Al Asimah' in a case-insensitive manner
        amanat_mask = df[REGION_IDENTIFIER].str.lower() != 'amanat al asimah'
        if amanat_mask.sum() < len(df):
            excluded_count = len(df) - amanat_mask.sum()
            df = df[amanat_mask]
            logger.info(f"Excluded {excluded_count} records from 'Amanat Al Asimah'.")
        else:
            logger.info("No records found for 'Amanat Al Asimah'.")

        # Filter commodities based on config
        if COMMODITIES:
            initial_count = len(df)
            # Ensure case-insensitive matching by converting both to lower case
            df['commodity_lower'] = df['commodity'].str.lower()
            commodities_lower = [c.lower() for c in COMMODITIES]
            df = df[df['commodity_lower'].isin(commodities_lower)]
            filtered_count = len(df)
            logger.info(f"Filtered data for specified commodities. Number of records: {filtered_count} (filtered out {initial_count - filtered_count})")
            # Drop the auxiliary lower case column
            df = df.drop(columns=['commodity_lower'])
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")

        # Unify exchange rate regimes
        if REGIMES_TO_UNIFY and NEW_REGIME_NAME:
            logger.info(f"Unifying exchange rate regimes: {REGIMES_TO_UNIFY} into '{NEW_REGIME_NAME}'")
            original_unique_regimes = df[EXCHANGE_RATE_REGIME_COLUMN].unique().tolist()
            df.loc[df[EXCHANGE_RATE_REGIME_COLUMN].isin(REGIMES_TO_UNIFY), EXCHANGE_RATE_REGIME_COLUMN] = NEW_REGIME_NAME
            unified_unique_regimes = df[EXCHANGE_RATE_REGIME_COLUMN].unique().tolist()
            logger.info(f"Exchange rate regimes before unification: {original_unique_regimes}")
            logger.info(f"Exchange rate regimes after unification: {unified_unique_regimes}")

        # Filter exchange rate regimes based on config
        initial_count = len(df)
        df = df[df[EXCHANGE_RATE_REGIME_COLUMN].isin(EXCHANGE_RATE_REGIMES)]
        filtered_count = len(df)
        logger.info(f"Filtered data for exchange rate regimes: {EXCHANGE_RATE_REGIMES}. Number of records: {filtered_count} (filtered out {initial_count - filtered_count})")

        # Log available commodities after filtering
        available_commodities = df['commodity'].unique().tolist()
        logger.info(f"Available commodities after filtering: {available_commodities}")

        # **New Logging: Log DataFrame Columns and Sample Data**
        logger.debug(f"DataFrame columns after filtering: {df.columns.tolist()}")
        logger.debug(f"Sample data:\n{df.head()}")

        return df
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        raise

def prepare_market_data(df, base_market):
    """Prepare market data for analysis for a specific base market."""
    logger.info(f"Preparing market data for base market: {base_market}")
    # Ensure exchange_rate_regime is unified
    df = df[df[EXCHANGE_RATE_REGIME_COLUMN] == NEW_REGIME_NAME]

    base_data = df[df[REGION_IDENTIFIER] == base_market]
    other_markets = df[df[REGION_IDENTIFIER] != base_market]

    market_data = {}
    for admin1 in [base_market] + other_markets[REGION_IDENTIFIER].unique().tolist():
        market_df = df[df[REGION_IDENTIFIER] == admin1]
        for commodity in market_df['commodity'].unique():
            commodity_df = market_df[market_df['commodity'] == commodity]
            if not commodity_df.empty:
                # Group by date and aggregate to ensure unique dates
                commodity_df = commodity_df.groupby(commodity_df.index).agg({
                    'usdprice': 'mean',  # Aggregating usdprice
                    'conflict_intensity': 'mean',  # Aggregating conflict_intensity
                    'longitude': 'first',  # Assuming longitude is consistent
                    'latitude': 'first'  # Assuming latitude is consistent
                })
                key = (admin1, commodity)
                market_data[key] = {
                    'date': commodity_df.index.to_numpy(),
                    'usdprice': commodity_df['usdprice'].to_numpy(),
                    'conflict_intensity': commodity_df['conflict_intensity'].to_numpy(),
                    'longitude': commodity_df['longitude'].iloc[0],
                    'latitude': commodity_df['latitude'].iloc[0]
                }
                logger.debug(f"Prepared data for {key}: {len(commodity_df)} records")

    logger.info(f"Prepared market data for {len(market_data)} (market, commodity) pairs")
    return market_data

def run_stationarity_tests(series):
    """Run ADF and KPSS tests on a time series."""
    logger.debug("Running stationarity tests")
    try:
        # Convert to pandas Series if it's a NumPy array
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
            logger.debug("Converted NumPy array to pandas Series for stationarity tests.")

        # Remove NaN and infinite values
        series = series.replace([np.inf, -np.inf], np.nan).dropna()
        if series.empty:
            logger.warning("Series is empty after removing NaNs and infinite values.")
            return None

        adf_result = adfuller(series, autolag='AIC')
        kpss_result = kpss(series, regression='c', nlags='auto')

        return {
            'ADF': {'statistic': float(adf_result[0]), 'p-value': float(adf_result[1])},
            'KPSS': {'statistic': float(kpss_result[0]), 'p-value': float(kpss_result[1])}
        }
    except Exception as e:
        logger.warning(f"Error in stationarity tests: {str(e)}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        return None

def calculate_price_differential(price_i, price_j):
    """Calculate price differential between two markets."""
    # Ensure no zero or negative prices
    valid_mask = (price_i > 0) & (price_j > 0)
    price_i = price_i[valid_mask]
    price_j = price_j[valid_mask]
    logger.debug(f"Calculated valid price differentials: {len(price_i)} pairs")
    if len(price_i) == 0:
        return np.array([])
    return np.log(price_i) - np.log(price_j)

def calculate_distance(coord1, coord2):
    """Calculate Euclidean distance between two coordinates."""
    try:
        distance = euclidean(coord1, coord2)
        logger.debug(f"Calculated distance: {distance}")
        return distance
    except Exception as e:
        logger.error(f"Error calculating distance between {coord1} and {coord2}: {e}")
        return np.nan

def analyze_market_pair(args):
    """Analyze a pair of markets."""
    try:
        base_market, base_data, other_market, other_data, commodity = args

        if base_data is None or other_data is None:
            logger.warning(f"Missing data for {base_market} or {other_market} on {commodity}. Skipping.")
            return None

        common_dates = np.intersect1d(base_data['date'], other_data['date'])
        logger.debug(f"Found {len(common_dates)} common dates for {base_market} and {other_market} on {commodity}")

        if len(common_dates) < MIN_COMMON_DATES:
            logger.warning(f"Insufficient common dates ({len(common_dates)}) for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        mask_base = np.isin(base_data['date'], common_dates)
        mask_other = np.isin(other_data['date'], common_dates)

        price_i = base_data['usdprice'][mask_base]
        price_j = other_data['usdprice'][mask_other]

        logger.debug(f"Price_i length: {len(price_i)}, Price_j length: {len(price_j)}")

        # Ensure both price arrays have the same length
        if len(price_i) != len(price_j):
            logger.warning(f"Mismatched price array lengths for {base_market} and {other_market} on {commodity}: {len(price_i)} vs {len(price_j)}. Skipping.")
            return None

        price_diff = calculate_price_differential(price_i, price_j)

        if len(price_diff) == 0:
            logger.warning(f"No valid price differentials for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        stationarity_results = run_stationarity_tests(price_diff)

        if stationarity_results is None:
            logger.warning(f"Stationarity tests failed for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        # Ensure conflict_intensity arrays align with common dates
        conflict_base = base_data['conflict_intensity'][mask_base]
        conflict_other = other_data['conflict_intensity'][mask_other]

        logger.debug(f"Conflict_base length: {len(conflict_base)}, Conflict_other length: {len(conflict_other)}")

        # Since price_diff is derived from valid price_i and price_j, conflict arrays should match
        if len(conflict_base) != len(conflict_other):
            logger.warning(f"Conflict intensity arrays do not align for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        correlation, _ = pearsonr(conflict_base, conflict_other)
        logger.debug(f"Pearson correlation between conflict intensities: {correlation}")

        distance = calculate_distance(
            (base_data['longitude'], base_data['latitude']),
            (other_data['longitude'], other_data['latitude'])
        )

        # Validate distance and correlation
        if not np.isfinite(distance):
            logger.warning(f"Non-finite distance for {base_market} and {other_market} on {commodity}. Skipping.")
            return None
        if not np.isfinite(correlation):
            logger.warning(f"Non-finite conflict correlation for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        # Extract p-value from ADF test for significance
        p_value = stationarity_results['ADF']['p-value']

        logger.debug(f"Returning analysis result for {base_market}, {other_market}, {commodity}")

        return {
            'base_market': base_market,
            'other_market': other_market,
            'commodity': commodity,
            'price_differential': price_diff.tolist(),
            'stationarity': stationarity_results,
            'conflict_correlation': float(correlation),
            'common_dates': int(len(common_dates)),
            'distance': distance,
            'p_value': p_value  # Added p_value at the root level
        }
    except Exception as e:
        logger.error(f"Error in analyze_market_pair: {str(e)}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        return None

def calculate_vif(X):
    """Calculate Variance Inflation Factor."""
    vif = pd.DataFrame()
    vif["Variable"] = X.columns
    vif["VIF"] = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
    return vif

def handle_high_vif(X, threshold=10):
    """Handle high VIF by transforming variables."""
    vif = calculate_vif(X)
    high_vif_vars = vif[vif['VIF'] > threshold]['Variable'].tolist()
    logger.info(f"Variables with VIF > {threshold}: {high_vif_vars}")

    for var in high_vif_vars:
        squared_var = f'{var}_squared'
        X[squared_var] = X[var] ** 2
        logger.debug(f"Transformed '{var}' to '{squared_var}' to address high VIF")
        X = X.drop(columns=[var])

    return X

def run_price_differential_model(df):
    """Run price differential model using OLS, Random Effects, and IV2SLS."""
    try:
        # Prepare X and y
        X_columns = ['distance', 'conflict_correlation']
        X = df[X_columns]
        y = df['price_differential']

        # Add constant term
        X = sm.add_constant(X)

        # Ensure no duplicate columns
        if X.columns.duplicated().any():
            logger.error("Duplicate columns found in predictors. Cannot proceed with panel estimation.")
            return None

        # Handle high VIF
        X = handle_high_vif(X)

        # Diversified Estimation Methods
        results = {}

        # OLS with Clustered Standard Errors
        logger.info("Estimating OLS model with clustered standard errors")
        clusters = df.reset_index()['other_market']
        num_groups = clusters.nunique()
        logger.debug(f"Number of unique groups: {num_groups}")

        if num_groups < 2:
            logger.error("Not enough groups to compute clustered standard errors. Proceeding with robust standard errors.")
            ols_model = sm.OLS(y, X).fit(cov_type='HC1')
        else:
            ols_model = sm.OLS(y, X).fit(cov_type='cluster', cov_kwds={'groups': clusters})

        results['OLS'] = {
            'coefficients': ols_model.params.to_dict(),
            'std_errors': ols_model.bse.to_dict(),
            't_statistics': ols_model.tvalues.to_dict(),
            'p_values': ols_model.pvalues.to_dict(),
            'r_squared': ols_model.rsquared,
            'adj_r_squared': ols_model.rsquared_adj,
            'aic': ols_model.aic,
            'bic': ols_model.bic,
            'conf_int': ols_model.conf_int().values.tolist(),  # Confidence intervals
            'f_statistic': ols_model.fvalue,  # F-statistic
            'f_pvalue': ols_model.f_pvalue,   # F-statistic p-value
            'fitted_values': ols_model.fittedvalues.tolist(),  # Fitted values
            'residuals': ols_model.resid.tolist()  # Residuals
        }

        # Random Effects Model
        logger.info("Estimating Random Effects model")
        try:
            clusters = df['other_market']
            clusters.index = df.index  # Align index
            num_clusters = clusters.nunique()
            logger.debug(f"Number of unique clusters: {num_clusters}")

            if num_clusters < 2:
                logger.error("Not enough clusters to compute clustered standard errors. Proceeding with robust standard errors.")
                re_model = RandomEffects(y, X).fit(cov_type='robust')
            else:
                re_model = RandomEffects(y, X).fit(cov_type='clustered', clusters=clusters)

            results['RandomEffects'] = {
                'coefficients': re_model.params.to_dict(),
                'std_errors': re_model.std_errors.to_dict(),
                't_statistics': re_model.tstats.to_dict(),
                'p_values': re_model.pvalues.to_dict(),
                'r_squared': re_model.rsquared,
                'conf_int': re_model.conf_int().values.tolist()  # Confidence intervals
            }
        except Exception as e:
            logger.error(f"Error during Random Effects estimation: {e}")
            logger.debug(f"Detailed error information: {traceback.format_exc()}")
            results['RandomEffects'] = None

        # IV2SLS Model
        logger.info("Estimating IV2SLS model for endogeneity checks")
        try:
            clusters = df['other_market']
            clusters.index = df.index  # Align index
            iv_model = IV2SLS.from_formula(
                'price_differential ~ 1 + [distance ~ conflict_correlation]',
                df
            ).fit(cov_type='clustered', clusters=clusters)

            # First-stage results for IV
            first_stage_results = iv_model.first_stage.summary
            results['IV2SLS'] = {
                'coefficients': iv_model.params.to_dict(),
                'std_errors': iv_model.std_errors.to_dict(),
                't_statistics': iv_model.tstats.to_dict(),
                'p_values': iv_model.pvalues.to_dict(),
                'r_squared': iv_model.rsquared,
                'conf_int': iv_model.conf_int().values.tolist(),  # Confidence intervals
                'first_stage': str(first_stage_results)  # First stage summary
            }

            # Check if 'overid' exists and add it if available
            if hasattr(iv_model, 'overid'):
                results['IV2SLS']['overid_test'] = str(iv_model.overid)
            else:
                logger.warning("IV2SLS model does not have an overid attribute. Skipping overid test.")
        except Exception as e:
            logger.warning(f"IV2SLS model estimation failed: {e}")
            logger.debug(f"Detailed error information: {traceback.format_exc()}")
            results['IV2SLS'] = None

        # Systematize Model Selection
        logger.info("Comparing models based on AIC and BIC")
        model_comparison = {}
        for model_name, model_result in results.items():
            if model_result is not None and model_name != 'diagnostics':
                # Only include models that have 'aic' and 'bic'
                if 'aic' in model_result and 'bic' in model_result:
                    model_comparison[model_name] = {
                        'AIC': model_result.get('aic'),
                        'BIC': model_result.get('bic')
                    }
                else:
                    logger.debug(f"{model_name} does not have AIC/BIC for comparison.")
        results['ModelComparison'] = model_comparison

        # Calculate VIF for OLS Model
        vif = calculate_vif(X)
        results['diagnostics'] = {'vif': vif.to_dict(orient='records')}

        # Residual Diagnostics for OLS Model
        logger.info("Performing residual diagnostics for OLS model")
        residuals = ols_model.resid

        # Breusch-Pagan Test
        bp_test = het_breuschpagan(residuals, ols_model.model.exog)
        results['diagnostics']['BreuschPagan'] = {
            'statistic': float(bp_test[0]),
            'p-value': float(bp_test[1]),
            'f-value': float(bp_test[2]),
            'f_pvalue': float(bp_test[3])
        }

        # Durbin-Watson Test
        dw_stat = durbin_watson(residuals)
        results['diagnostics']['DurbinWatson'] = float(dw_stat)

        # Jarque-Bera Test
        jb_stat, jb_pvalue = jarque_bera(residuals)
        results['diagnostics']['JarqueBera'] = {
            'statistic': float(jb_stat),
            'p-value': float(jb_pvalue)
        }

        # CUSUM Stability Test
        try:
            residuals_array = np.asarray(residuals).flatten()
            cusum_stat, p_value, crit_value = breaks_cusumolsresid(residuals_array)
            cusum_stat = float(cusum_stat) if isinstance(cusum_stat, (np.ndarray, list)) else cusum_stat
            p_value = float(p_value) if isinstance(p_value, (np.ndarray, list)) else p_value
            results['diagnostics']['CUSUM'] = {
                'statistic': cusum_stat,
                'p-value': p_value
            }
        except Exception as e:
            logger.warning(f"CUSUM test failed: {e}")
            results['diagnostics']['CUSUM'] = None

        # Ramsey RESET Test
        from statsmodels.stats.diagnostic import linear_reset
        logger.info("Performing Ramsey RESET test for OLS model")
        try:
            reset_test = linear_reset(ols_model, power=2, use_f=True)
            results['diagnostics']['Ramsey_RESET'] = {
                'statistic': float(reset_test.fvalue),
                'p-value': float(reset_test.pvalue)
            }
        except Exception as e:
            logger.warning(f"Ramsey RESET test failed: {e}")
            results['diagnostics']['Ramsey_RESET'] = None

        # Leverage
        influence = OLSInfluence(ols_model)
        leverage = influence.hat_matrix_diag
        results['diagnostics']['Leverage'] = leverage.tolist()

        logger.info("Completed price differential model")
        return results
    except Exception as e:
        logger.error(f"An error occurred in run_price_differential_model: {str(e)}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        return None

def main(file_path):
    logger.info("Starting Price Differential Analysis")

    # Load all data
    df = load_data(file_path)
    logger.info(f"Loaded {len(df)} records from the JSON file")

    # Define the base markets
    desired_base_markets = ['aden', "sana'a"]
    available_base_markets = [market for market in desired_base_markets if market in df[REGION_IDENTIFIER].unique()]

    if not available_base_markets:
        logger.error(f"No desired base markets {desired_base_markets} found in data. Exiting.")
        return

    logger.info(f"Using base markets: {available_base_markets}")

    # Log available commodities for each base market
    available_commodities = df['commodity'].unique().tolist()
    logger.info(f"Available commodities in data: {available_commodities}")

    all_results = {}

    for base_market in available_base_markets:
        logger.info(f"Processing base market: {base_market}")
        market_data = prepare_market_data(df, base_market)
        base_market_data = {k: v for k, v in market_data.items() if k[0] == base_market}
        other_market_data = {k: v for k, v in market_data.items() if k[0] != base_market}

        analysis_args = [
            (base_market, base_market_data.get((base_market, commodity)), other_market, other_data, commodity)
            for (other_market, commodity), other_data in other_market_data.items()
            if (base_market, commodity) in base_market_data
        ]

        # Remove any None entries in analysis_args
        analysis_args = [arg for arg in analysis_args if arg[1] is not None]

        logger.debug(f"First 5 analysis_args entries: {analysis_args[:5]}")

        logger.info(f"Prepared {len(analysis_args)} market pairs for analysis for base market {base_market}")

        if len(analysis_args) == 0:
            logger.warning(f"No market pairs to analyze for base market {base_market}. Skipping.")
            continue

        # Use all available cores, but limit to number of analysis_args to prevent overuse
        num_cores = min(mp.cpu_count(), len(analysis_args))
        logger.info(f"Using {num_cores} cores for parallel processing")

        # Run analysis in parallel
        with mp.Pool(num_cores) as pool:
            results = pool.map(analyze_market_pair, analysis_args)

        # Filter out None results
        results = [r for r in results if r is not None]
        logger.info(f"Analyzed {len(results)} market pairs for base market {base_market}")

        if len(results) == 0:
            logger.warning(f"No valid analysis results for base market {base_market}. Skipping.")
            continue

        # Run price differential model
        model_results = run_price_differential_model(results)

        # Organize results by commodity
        commodity_results = {}
        for result in results:
            commodity = result['commodity']
            if commodity not in commodity_results:
                commodity_results[commodity] = []
            commodity_results[commodity].append(result)

        all_results[base_market] = {
            "commodity_results": commodity_results,
            "model_results": model_results
        }

    if not all_results:
        logger.error("No analysis results generated for any base markets. Exiting.")
        return

    # Save all results in a single file
    output_file = price_diff_results_dir / "price_differential_results.json"
    try:
        with open(output_file, "w") as f:
            def default(o):
                if isinstance(o, np.ndarray):
                    return o.tolist()
                elif isinstance(o, (pd.Series, pd.DataFrame)):
                    return o.to_dict()
                elif isinstance(o, (np.int64, np.int32, np.integer)):
                    return int(o)
                elif isinstance(o, (np.float64, np.float32, np.floating)):
                    return float(o)
                elif isinstance(o, datetime):
                    return o.isoformat()
                else:
                    return str(o)
            json.dump(all_results, f, indent=4, default=default)
        logger.info(f"All results saved to {output_file}")
    except Exception as e:
        logger.error(f"Error saving results to {output_file}: {e}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")

    logger.info("Price Differential Analysis completed")

if __name__ == "__main__":
    file_path = spatial_geojson  # Correctly get from config
    main(file_path)