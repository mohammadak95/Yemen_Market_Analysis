#project/price_diffrential_analysis/price_differential_model.py

import json
import pandas as pd
import numpy as np
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.stats.diagnostic import het_breuschpagan
from statsmodels.stats.stattools import durbin_watson
import statsmodels.api as sm
from scipy.stats import pearsonr, jarque_bera, f  # Imported f from scipy.stats
import logging
from pathlib import Path
import multiprocessing as mp
import warnings
from scipy.spatial.distance import euclidean
import yaml  # Added for configuration parsing
import traceback
from datetime import datetime

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

# Setup logging based on config
directories = config.get('directories', {})
files = config.get('files', {})
parameters = config.get('parameters', {})
logging_config = parameters.get('logging', {})

# Extract logging parameters
log_level = logging_config.get('level', 'INFO').upper()
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
unified_data_file = Path(files.get('unified_data', 'project/data/processed/unified_data.json'))
price_diff_results_file = Path(files.get('ecm_results', 'results/price_differential/price_differential_results.json'))
naturalearth_lowres = Path(files.get('naturalearth_lowres', 'external_data/naturalearth_lowres/ne_110m_admin_0_countries.shp'))

# Initialize logging
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format=log_format,
    handlers=[
        logging.FileHandler(log_dir / 'price_differential_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration parameters from config.yaml
MIN_COMMON_DATES = parameters.get('min_common_dates', 20)
LAG_PERIODS = parameters.get('lag_periods', 2)  # Adjusted from 'ecm_lags' to 'lag_periods'
GRANGER_MAX_LAGS = parameters.get('granger_max_lags', 4)
DISTANCE_THRESHOLD = parameters.get('distance_threshold', 100)  # Example value
COMMODITIES = parameters.get('commodities', [])
EXCHANGE_RATE_REGIMES = parameters.get('exchange_rate_regimes', ['unified'])
STATIONARITY_SIGNIFICANCE_LEVEL = parameters.get('stationarity_significance_level', 0.05)

def load_data(file_path):
    """Load data from JSON file and preprocess it."""
    logger.info(f"Loading data from {file_path}")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        
        # Exclude 'Amanat Al Asimah' in a case-insensitive manner
        amanat_mask = df['admin1'].str.lower() != 'amanat al asimah'
        if amanat_mask.sum() < len(df):
            excluded_count = len(df) - amanat_mask.sum()
            df = df[amanat_mask]
            logger.info(f"Excluded {excluded_count} records from 'Amanat Al Asimah'.")
        else:
            logger.info("No records found for 'Amanat Al Asimah'.")
        
        # Filter commodities based on config
        if COMMODITIES:
            initial_count = len(df)
            df = df[df['commodity'].isin(COMMODITIES)]
            filtered_count = len(df)
            logger.info(f"Filtered data for specified commodities. Number of records: {filtered_count} (filtered out {initial_count - filtered_count})")
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")
        
        # Filter exchange rate regimes based on config
        if 'unified' in EXCHANGE_RATE_REGIMES:
            df['exchange_rate_regime'] = 'unified'
        
        initial_count = len(df)
        df = df[df['exchange_rate_regime'].isin(EXCHANGE_RATE_REGIMES)]
        filtered_count = len(df)
        logger.info(f"Filtered data for exchange rate regimes: {EXCHANGE_RATE_REGIMES}. Number of records: {filtered_count} (filtered out {initial_count - filtered_count})")
        
        return df
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        raise

def prepare_market_data(df, base_market):
    """Prepare market data for analysis for a specific base market."""
    logger.info(f"Preparing market data for base market: {base_market}")
    df = df[df['exchange_rate_regime'] == 'unified']
    
    base_data = df[df['admin1'] == base_market]
    other_markets = df[df['admin1'] != base_market]
    
    market_data = {}
    for admin1 in [base_market] + other_markets['admin1'].unique().tolist():
        market_df = df[df['admin1'] == admin1]
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

def run_price_differential_model(data):
    """Run the price differential model using Feasible Generalized Least Squares (FGLS)."""
    try:
        df = pd.DataFrame(data)
        logger.info("Running price differential model")
        
        # Prepare the data
        X_columns = ['distance', 'conflict_correlation']
        X = df[X_columns]
        y = df['price_differential'].apply(lambda x: x[-1] if len(x) > 0 else np.nan)  # Use the last price differential value
        
        # Drop rows with NaNs or infinite values in y
        valid_mask_y = y.replace([np.inf, -np.inf], np.nan).notnull()
        X = X[valid_mask_y]
        y = y[valid_mask_y]
        logger.debug(f"After removing NaNs/infs in y - X shape: {X.shape}, y shape: {y.shape}")
        
        # Further drop rows with NaNs or infinite values in X
        valid_mask_X = X.replace([np.inf, -np.inf], np.nan).notnull().all(axis=1)
        combined_valid_mask = valid_mask_y & valid_mask_X
        X = X[combined_valid_mask]
        y = y[combined_valid_mask]
        logger.debug(f"After removing NaNs/infs in X - X shape: {X.shape}, y shape: {y.shape}")
        
        logger.info(f"Model data - X shape: {X.shape}, y shape: {y.shape}")
        
        if len(y) == 0:
            logger.error("No valid data available after cleaning. Skipping this model.")
            return None
        
        # Check for zero variance
        if y.var() == 0 or (X.var() == 0).any():
            logger.error("Dependent variable or one of the predictors has zero variance. Skipping this model.")
            return None
        
        # Handle high VIF
        X = handle_high_vif(X)
        
        # Add constant term
        X = sm.add_constant(X)
        logger.debug("Added constant term to X")
        
        # Initial OLS regression to get residuals
        ols_model = sm.OLS(y, X).fit()
        residuals = ols_model.resid
        logger.debug("Performed initial OLS regression")
        
        # Estimate the variance of residuals using LOWESS
        sigma_hat = sm.nonparametric.lowess(residuals**2, ols_model.fittedvalues, frac=0.2, return_sorted=False)
        weights = 1 / np.sqrt(sigma_hat)
        logger.debug("Estimated weights for FGLS")
        
        # Fit the FGLS model using the estimated weights
        fgls_model = sm.WLS(y, X, weights=weights).fit()
        logger.debug("Performed FGLS regression")
        
        # Calculate VIF
        vif = calculate_vif(X)
        
        # Perform diagnostic tests
        bp_test = het_breuschpagan(fgls_model.resid, fgls_model.model.exog)
        dw_statistic = durbin_watson(fgls_model.resid)
        logger.debug("Performed Breusch-Pagan and Durbin-Watson tests")
        
        # Perform Ramsey RESET test
        try:
            y_fitted = fgls_model.fittedvalues
            y_fitted_2 = np.power(y_fitted, 2)
            y_fitted_3 = np.power(y_fitted, 3)
            X_with_powers = pd.concat([
                X,
                pd.Series(y_fitted_2, index=X.index, name='y_fitted_2'),
                pd.Series(y_fitted_3, index=X.index, name='y_fitted_3')
            ], axis=1)
            reset_model = sm.OLS(y, X_with_powers).fit()
            
            # Perform F-test using scipy.stats.f
            f_statistic = ((reset_model.ssr - fgls_model.ssr) / 2) / (fgls_model.ssr / fgls_model.df_resid)
            reset_test_pvalue = 1 - f.cdf(f_statistic, 2, reset_model.df_resid)
            
            logger.info(f"Ramsey RESET test p-value: {reset_test_pvalue}")
        except Exception as e:
            logger.warning(f"Failed to perform Ramsey RESET test: {str(e)}")
            reset_test_pvalue = None
            f_statistic = None  # Ensure it's defined even if RESET fails

        # Perform Jarque-Bera test for normality
        try:
            jb_stat, jb_pvalue = jarque_bera(fgls_model.resid)
            logger.info(f"Jarque-Bera test p-value: {jb_pvalue}")
        except Exception as e:
            logger.warning(f"Failed to perform Jarque-Bera test: {str(e)}")
            jb_stat, jb_pvalue = None, None

        results = {
            'regression': {
                'coefficients': {k: round(v, 4) for k, v in fgls_model.params.to_dict().items()},
                'std_errors': {k: round(v, 4) for k, v in fgls_model.bse.to_dict().items()},
                't_statistics': {k: round(v, 4) for k, v in fgls_model.tvalues.to_dict().items()},
                'p_values': {k: round(v, 4) for k, v in fgls_model.pvalues.to_dict().items()},
                'r_squared': round(fgls_model.rsquared, 4),
                'adj_r_squared': round(fgls_model.rsquared_adj, 4),
                'f_statistic': round(fgls_model.fvalue, 4),
                'f_pvalue': round(fgls_model.f_pvalue, 4),
                'aic': round(fgls_model.aic, 4),
                'bic': round(fgls_model.bic, 4),
                'log_likelihood': round(fgls_model.llf, 4)
            },
            'diagnostics': {
                'vif': vif.to_dict(orient='records'),
                'breuschPaganTest': {
                    'statistic': round(bp_test[0], 4) if bp_test and len(bp_test) > 1 else None,
                    'pValue': round(bp_test[1], 4) if bp_test and len(bp_test) > 1 else None
                },
                'normalityTest': {
                    'statistic': round(jb_stat, 4) if jb_stat else None,
                    'pValue': round(jb_pvalue, 4) if jb_pvalue else None
                },
                'reset_test_statistic': round(f_statistic, 4) if f_statistic else None,
                'reset_test_pvalue': round(reset_test_pvalue, 4) if reset_test_pvalue else None,
                'heteroskedasticity_pvalue': round(bp_test[1], 4) if bp_test and len(bp_test) > 1 else None,
                'durbin_watson': round(dw_statistic, 4)
            }
        }
        
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
    available_base_markets = [market for market in desired_base_markets if market in df['admin1'].unique()]
    
    if not available_base_markets:
        logger.error(f"No desired base markets {desired_base_markets} found in data. Exiting.")
        return
    
    logger.info(f"Using base markets: {available_base_markets}")
    
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
        
        logger.info(f"Prepared {len(analysis_args)} market pairs for analysis for base market {base_market}")
        
        if len(analysis_args) == 0:
            logger.warning(f"No market pairs to analyze for base market {base_market}. Skipping.")
            continue
        
        # Use all available cores, but limit to number of base markets to prevent overuse
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
    output_file = results_dir / "price_differential_results.json"
    try:
        with open(output_file, "w") as f:
            json.dump(all_results, f, indent=4)
        logger.info(f"All results saved to {output_file}")
    except Exception as e:
        logger.error(f"Error saving results to {output_file}: {e}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
    
    logger.info("Price Differential Analysis completed")

if __name__ == "__main__":
    file_path = unified_data_file  # Dynamically get from config
    main(file_path)
