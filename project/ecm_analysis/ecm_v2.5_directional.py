# ecm_v2.5_directional.py

import logging
import json
import warnings
import traceback
from pathlib import Path
import time
import yaml
import pandas as pd
import numpy as np
from statsmodels.tsa.vector_ar.vecm import VECM, select_order, select_coint_rank
import statsmodels.api as sm
from statsmodels.tsa.stattools import grangercausalitytests, adfuller
from arch.unitroot import engle_granger
from scipy.stats import shapiro
from statsmodels.stats.outliers_influence import variance_inflation_factor
import numpy.linalg as LA
import multiprocessing
from functools import partial
import psutil
import geopandas as gpd  # Kept for data loading
from statsmodels.tsa.seasonal import seasonal_decompose

# --------------------------- Configuration and Setup ---------------------------

# Load configuration
def load_config(path='project/config/config.yaml'):
    try:
        with open(path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        raise

config = load_config()

# Validate configuration
def validate_config(config):
    required_sections = ['directories', 'files', 'parameters', 'logging']
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Missing '{section}' section in configuration.")

validate_config(config)

# Setup logging
log_dir = Path(config['directories']['logs_dir'])
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=config['logging']['level'].upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / 'ecm_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define base directory
base_dir = Path(__file__).resolve().parents[2]

# Define paths based on config
dirs = {k: base_dir / v for k, v in config['directories'].items()}
files = {k: base_dir / v for k, v in config['files'].items()}

# Parameters
params = config['parameters']
MIN_OBS = params['min_common_dates']
ECM_LAGS = params['lag_periods']
COIN_MAX_LAGS = params['cointegration_max_lags']
GRANGER_MAX_LAGS = params['granger_max_lags']
DIST_THRESH = params['distance_threshold']
COMMODITIES = params['commodities']
EXR_REGIMES = params['exchange_rate_regimes']
STN_SIG = params['stationarity_significance_level']
CIG_SIG = params['cointegration_significance_level']
PARALLEL_PROCESSES = config['parameters']['parallel_processes']
MEMORY_PER_PROCESS_GB = config['parameters']['memory_per_process_gb']

def check_memory():
    available_memory = psutil.virtual_memory().available / (1024**3)  # Convert to GB
    required_memory = PARALLEL_PROCESSES * MEMORY_PER_PROCESS_GB
    if available_memory < required_memory:
        logger.warning(f"Available memory ({available_memory:.2f} GB) is less than required ({required_memory:.2f} GB). Adjusting parallel processes.")
        return max(1, int(available_memory // MEMORY_PER_PROCESS_GB))
    return PARALLEL_PROCESSES

# --------------------------- Helper Functions ---------------------------

# Function to calculate VIF
def calculate_vif(exog_df):
    vif_data = pd.DataFrame()
    vif_data["feature"] = exog_df.columns
    vif_data["VIF"] = [variance_inflation_factor(exog_df.values, i) for i in range(exog_df.shape[1])]
    return vif_data

# Function to log correlation matrix
def log_correlation_matrix(exog_df, title="Correlation Matrix of Exogenous Variables"):
    try:
        corr_matrix = exog_df.corr()
        logger.debug(f"{title}:\n{corr_matrix}")
    except Exception as e:
        logger.error(f"Failed to compute correlation matrix: {e}")
        logger.debug(traceback.format_exc())

# --------------------------- Data Transformation Functions ---------------------------

def handle_duplicates(df):
    """
    Handle duplicates by averaging numeric columns.
    """
    try:
        # Identify numeric and non-numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        non_numeric_cols = df.select_dtypes(exclude=['number']).columns.difference(['admin1', 'date', 'commodity', 'exchange_rate_regime']).tolist()
        
        # Exclude 'exchange_rate_regime' from non-numeric columns to prevent duplication
        grouping_cols = ['admin1', 'commodity', 'date', 'exchange_rate_regime']
        
        # Group by the specified columns and calculate mean for numeric columns
        df_numeric = df.groupby(grouping_cols)[numeric_cols].mean().reset_index()
        
        # For non-numeric columns, take the first value
        df_non_numeric = df.groupby(grouping_cols)[non_numeric_cols].first().reset_index()
        
        # Merge numeric and non-numeric data back together
        df = pd.merge(df_numeric, df_non_numeric, on=grouping_cols, how='left')
        
        logger.info("Handled duplicates by averaging numeric columns and keeping first non-numeric values.")
        return df
    except Exception as e:
        logger.error(f"Failed to handle duplicates: {e}")
        raise


def perform_seasonal_adjustment_on_group(group, freq='M'):
    """
    Perform seasonal adjustment on a single group.
    """
    try:
        group = group.sort_values('date')
        group.set_index('date', inplace=True)

        # Check if sufficient data points are available
        if group.shape[0] < 2 * 12:  # At least two years of monthly data
            logger.warning(f"Insufficient data points for seasonal adjustment for Commodity: {group['commodity'].iloc[0]}, Regime: {group['exchange_rate_regime'].iloc[0]}. Required: >=24, Available: {group.shape[0]}. Skipping adjustment.")
            return group.reset_index()

        # Perform seasonal decomposition
        decomposition = seasonal_decompose(group['usdprice'], model='additive', period=12, extrapolate_trend='freq')

        # Adjust the 'usdprice' by removing the seasonal component
        group['usdprice'] = group['usdprice'] - decomposition.seasonal

        group.reset_index(inplace=True)
        logger.debug(f"Seasonal adjustment successful for Commodity: {group['commodity'].iloc[0]}, Regime: {group['exchange_rate_regime'].iloc[0]}.")
        return group

    except Exception as e:
        logger.error(f"Seasonal adjustment failed for Commodity: {group['commodity'].iloc[0]}, Regime: {group['exchange_rate_regime'].iloc[0]}. Error: {e}")
        return group.reset_index()  # Return the original group without adjustment

def apply_seasonal_adjustment(df, frequency='M'):
    """
    Apply seasonal adjustment to the 'usdprice' column for each commodity-regime group.
    """
    try:
        adjusted_groups = []
        grouped = df.groupby(['commodity', 'exchange_rate_regime'])
        total_groups = len(grouped)
        processed_groups = 0

        logger.info(f"Total groups to process for seasonal adjustment: {total_groups}")

        for (commodity, regime), group in grouped:
            logger.debug(f"Processing Commodity: {commodity}, Regime: {regime}, Records: {len(group)}")

            # Drop rows with null 'usdprice' or 'date'
            group = group.dropna(subset=['usdprice', 'date'])
            if group.empty:
                logger.warning(f"All records have null 'usdprice' or 'date' for Commodity: {commodity}, Regime: {regime}. Skipping adjustment.")
                continue

            adjusted = perform_seasonal_adjustment_on_group(group, freq=frequency)

            adjusted_groups.append(adjusted)
            processed_groups += 1

        logger.info(f"Processed {processed_groups} out of {total_groups} groups.")

        if not adjusted_groups:
            logger.error("No groups were adjusted. 'adjusted_groups' is empty.")
            raise ValueError("No groups to concatenate.")

        df_adjusted = pd.concat(adjusted_groups, ignore_index=True)
        logger.info("Seasonal adjustment applied successfully.")
        return df_adjusted

    except Exception as e:
        logger.error(f"Failed to apply seasonal adjustment: {e}")
        raise

def apply_smoothing(df, window=3):
    """
    Apply moving average smoothing to the 'usdprice' column.
    """
    try:
        logger.info(f"Applying moving average smoothing with window size {window}.")
        df = df.sort_values(['commodity', 'exchange_rate_regime', 'date'])
        df['usdprice'] = df.groupby(['commodity', 'exchange_rate_regime'])['usdprice'].transform(lambda x: x.rolling(window, min_periods=1, center=True).mean())
        logger.info("Smoothing applied successfully.")
        return df
    except Exception as e:
        logger.error(f"Failed to apply smoothing: {e}")
        raise

# --------------------------- Data Loading and Preprocessing ---------------------------

def load_data():
    logger.debug(f"Loading data from {files['spatial_geojson']}")
    try:
        gdf = gpd.read_file(files['spatial_geojson'])
        df = gdf.drop(columns='geometry')  # Remove spatial component

        required_columns = {'date', 'commodity', 'exchange_rate_regime', 'usdprice', 'admin1'}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        initial_length = len(df)
        df.drop_duplicates(inplace=True)
        df.dropna(subset=['date', 'usdprice'], inplace=True)
        logger.info(f"Dropped {initial_length - len(df)} duplicate or NaN rows based on 'date' and 'usdprice'.")

        # Exclude 'Amanat Al Asimah' if needed
        df = df[df['admin1'] != 'Amanat Al Asimah']
        logger.info("Excluded records from 'Amanat Al Asimah'.")

        # Filter for specified commodities
        if COMMODITIES:
            df = df[df['commodity'].isin(COMMODITIES)]
            logger.info(f"Filtered data for specified commodities. Number of records: {len(df)}")

        # Filter for exchange rate regimes
        df = df[df['exchange_rate_regime'].isin(['north', 'south'])]
        logger.debug(f"Data filtered for exchange rate regimes: ['north', 'south']")

        # Handle duplicates by averaging
        df = handle_duplicates(df)

        # Apply seasonal adjustment
        df = apply_seasonal_adjustment(df, frequency='M')

        # Apply smoothing
        df = apply_smoothing(df, window=3)

        # Proceed with aggregation
        df_agg = df.groupby(['commodity', 'exchange_rate_regime', 'date']).agg(
            usdprice=('usdprice', 'mean')
        ).reset_index()

        df_pivot = df_agg.pivot_table(index=['commodity', 'date'], columns='exchange_rate_regime',
                                      values=['usdprice'],
                                      aggfunc='first')

        df_pivot.columns = [f'{var}_{regime}' for var, regime in df_pivot.columns]
        df_pivot = df_pivot.dropna(subset=['usdprice_north', 'usdprice_south'])

        logger.debug(f"Data after pivot and alignment shape: {df_pivot.shape}")

        grouped_data = {commodity: df_pivot.xs(commodity, level='commodity') for commodity in df_pivot.index.get_level_values('commodity').unique()}

        logger.debug(f"Data grouped into {len(grouped_data)} groups.")
        return grouped_data

    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# --------------------------- Analysis Functions ---------------------------

# Stationarity Tests
def apply_transformations(series):
    transformations = {'original': series}
    if series.isnull().all():
        return transformations
    if (series > 0).all():
        transformations.update({
            'log': np.log(series.replace(0, np.nan)).dropna(),
            'diff': series.diff().dropna(),
            'log_diff': np.log(series.replace(0, np.nan)).diff().dropna()
        })
    else:
        transformations.update({
            'diff': series.diff().dropna()
        })
    return transformations

def run_stationarity_tests(series, variable):
    logger.debug(f"Running stationarity tests for {variable}")
    results = {}
    transformations = apply_transformations(series)

    selected_transformation = None
    for name, transformed in transformations.items():
        logger.debug(f"Testing transformation: {name}")
        try:
            # Perform ADF test
            test_result = adfuller(transformed, autolag='AIC')
            critical_values = test_result[4]  # This is typically a dictionary
            results[name] = {
                'ADF Statistic': test_result[0],
                'p-value': test_result[1],
                'Critical Values': list(critical_values.values()),  # Convert dict values to list
                'Used Lag': test_result[2],
                'Number of Observations Used': test_result[3]
            }
            if test_result[1] < STN_SIG:
                selected_transformation = name
                break
        except Exception as e:
            logger.error(f"Stationarity test failed for {name}: {e}")
            logger.debug(traceback.format_exc())

    if not selected_transformation:
        selected_transformation = 'original'
        logger.warning(f"No stationary transformation found for {variable}. Using 'original'.")

    return {
        'transformation': selected_transformation,
        'series': transformations[selected_transformation].tolist(),
        'results': results.get(selected_transformation, {})
    }

# Cointegration Tests
def run_cointegration_tests(y, x, stationarity_results):
    logger.debug("Running cointegration tests")
    try:
        y_transformed = pd.Series(stationarity_results['y']['series'])
        x_transformed = pd.Series(stationarity_results['x']['series'])

        combined = pd.concat([y_transformed, x_transformed], axis=1).dropna()
        if combined.empty or len(combined) < 2:
            raise ValueError("Insufficient data for cointegration test.")

        eg = engle_granger(combined.iloc[:, 0], combined.iloc[:, 1])
        coint_result = {
            'engle_granger': {
                'cointegration_statistic': eg.stat,
                'p_value': eg.pvalue,
                'critical_values': eg.critical_values.tolist(),
                'cointegrated': eg.pvalue < CIG_SIG,
                'rho': eg.rho
            },
            'y_transformation': stationarity_results.get('y', {}).get('transformation', 'original'),
            'x_transformation': stationarity_results.get('x', {}).get('transformation', 'original')
        }
        logger.debug(f"Engle-Granger p={eg.pvalue}, cointegrated={eg.pvalue < CIG_SIG}")
        return coint_result
    except Exception as e:
        logger.error(f"Cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Estimate ECM
def estimate_ecm(y, x, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS):
    logger.debug(f"Estimating ECM with max_lags={max_lags}, ecm_lags={ecm_lags}")
    try:
        original_length = len(y)
        logger.debug(f"Original data length: {original_length}")

        endog = pd.concat([y, x], axis=1).dropna()
        dropped_points = original_length - len(endog)
        logger.debug(f"Data length after dropping NaNs: {len(endog)}")
        if dropped_points > 0:
            logger.info(f"Dropped {dropped_points} data points due to NaN values in ECM estimation")

        if len(endog) < 2:
            logger.warning("Insufficient data points after cleaning. Skipping ECM estimation.")
            return None, None

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            lag_order_result = select_order(endog, maxlags=min(max_lags, len(endog) // 2 - 1), deterministic='ci')

        optimal_lags = lag_order_result.aic if hasattr(lag_order_result, 'aic') else ecm_lags
        optimal_lags = max(1, min(optimal_lags, ecm_lags, len(endog) // 2 - 1))
        logger.debug(f"Optimal lag order by AIC: {optimal_lags}")

        coint_rank_result = select_coint_rank(endog, det_order=0, k_ar_diff=optimal_lags)
        coint_rank = max(1, min(coint_rank_result.rank, len(endog.columns) - 1))
        logger.debug(f"Selected cointegration rank: {coint_rank}")

        if coint_rank == 0:
            logger.warning("No cointegration found based on selected rank.")
            return None, None

        model = VECM(endog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')

        logger.debug(f"VECM Model Parameters:\nEndogenous Variables: {endog.columns.tolist()}\nLag Order: {optimal_lags}\nCointegration Rank: {coint_rank}")

        try:
            results = model.fit()
            logger.info(f"ECM model estimated successfully. Final data points: {len(results.resid)}")
            return model, results
        except np.linalg.LinAlgError as e:
            logger.error(f"Linear algebra error (likely due to singular matrix): {e}")
    except Exception as e:
        logger.error(f"Unexpected error in ECM estimation: {e}")
        logger.debug(traceback.format_exc())
    return None, None

# Compute Model Criteria
def compute_model_criteria(results, model):
    logger.debug("Computing model criteria (AIC, BIC, HQIC)")
    try:
        n = len(results.resid) if hasattr(results, 'resid') else 0
        k_params = (getattr(model, 'k_ar', 0) + 
                    getattr(model, 'k_trend', 0) + 
                    (results.rank if hasattr(results, 'rank') else 0))
        llf = results.llf if hasattr(results, 'llf') else None

        if llf is not None and n > k_params:
            aic = -2 * llf + 2 * k_params
            bic = -2 * llf + np.log(n) * k_params
            hqic = -2 * llf + 2 * np.log(np.log(n)) * k_params
        else:
            aic = bic = hqic = np.nan

        logger.debug(f"AIC: {aic}, BIC: {bic}, HQIC: {hqic}")
        return aic, bic, hqic
    except Exception as e:
        logger.error(f"Model criteria computation failed: {e}")
        logger.debug(traceback.format_exc())
        return np.nan, np.nan, np.nan

# Granger Causality Tests
def compute_granger_causality(y, x):
    logger.debug("Computing Granger causality")
    gc_results = {}
    try:
        max_lag = GRANGER_MAX_LAGS
        data = pd.concat([y, x], axis=1).dropna()
        test_result = grangercausalitytests(data, max_lag, verbose=False)
        gc_metrics = {}
        for lag, res in test_result.items():
            ftest_p = res[0]['ssr_ftest'][1]
            gc_metrics[lag] = {'ssr_ftest_pvalue': ftest_p}
        gc_results[x.name] = gc_metrics
        return gc_results
    except Exception as e:
        logger.error(f"Granger causality tests failed: {e}")
        logger.debug(traceback.format_exc())
        return gc_results

# Diagnostics
def run_diagnostics(results):
    if results is None:
        return {}
    try:
        logger.debug(f"Original resid shape: {results.resid.shape}")
        resid = results.resid
        
        if resid.ndim == 2 and resid.shape[1] > 1:
            logger.debug("Handling multivariate residuals")
            diagnostics = {}
            for i in range(resid.shape[1]):
                col_resid = resid[:, i]
                col_diagnostics = run_univariate_diagnostics(col_resid, getattr(results.model, 'exog', None))
                diagnostics[f'Variable_{i+1}'] = col_diagnostics
            return diagnostics
        else:
            return run_univariate_diagnostics(resid, getattr(results.model, 'exog', None))
    except Exception as e:
        logger.error(f"Diagnostic tests failed: {e}")
        logger.debug(traceback.format_exc())
        return {}

def run_univariate_diagnostics(resid, exog):
    resid = resid.squeeze()
    
    class MockResults:
        def __init__(self, resid, model):
            self.resid = resid
            self.model = model

    if exog is None:
        exog = np.ones((len(resid), 1))
    
    mock_results = MockResults(resid, sm.OLS(resid, exog))
    
    bg_result = sm.stats.diagnostic.acorr_breusch_godfrey(mock_results, nlags=5)
    bg_stat = bg_result[0] if isinstance(bg_result, tuple) else bg_result.statistic
    bg_p = bg_result[1] if isinstance(bg_result, tuple) else bg_result.pvalue

    arch_result = sm.stats.diagnostic.het_arch(resid)
    arch_stat = arch_result[0] if isinstance(arch_result, tuple) else arch_result.statistic
    arch_p = arch_result[1] if isinstance(arch_result, tuple) else arch_result.pvalue

    jb_result = sm.stats.stattools.jarque_bera(resid)
    jb_stat = jb_result[0] if isinstance(jb_result, tuple) else jb_result.statistic
    jb_p = jb_result[1] if isinstance(jb_result, tuple) else jb_result.pvalue

    dw_stat = sm.stats.stattools.durbin_watson(resid)
    
    if exog.shape[1] > 1:
        white_result = sm.stats.diagnostic.het_white(resid, exog)
        white_stat = white_result[0] if isinstance(white_result, tuple) else white_result.statistic
        white_p = white_result[1] if isinstance(white_result, tuple) else white_result.pvalue
    else:
        white_stat, white_p = np.nan, np.nan
    
    shapiro_stat, shapiro_p = shapiro(resid)
    acf_vals = sm.tsa.acf(resid, nlags=20).tolist()
    pacf_vals = sm.tsa.pacf(resid, nlags=20).tolist()

    return {
        'breusch_godfrey_stat': float(bg_stat) if not np.isnan(bg_stat) else None,
        'breusch_godfrey_pvalue': float(bg_p) if not np.isnan(bg_p) else None,
        'arch_test_stat': float(arch_stat) if not np.isnan(arch_stat) else None,
        'arch_test_pvalue': float(arch_p) if not np.isnan(arch_p) else None,
        'jarque_bera_stat': float(jb_stat) if not np.isnan(jb_stat) else None,
        'jarque_bera_pvalue': float(jb_p) if not np.isnan(jb_p) else None,
        'durbin_watson_stat': float(dw_stat) if not np.isnan(dw_stat) else None,
        'white_test_stat': float(white_stat) if not np.isnan(white_stat) else None,
        'white_test_pvalue': float(white_p) if not np.isnan(white_p) else None,
        'shapiro_wilk_stat': float(shapiro_stat) if not np.isnan(shapiro_stat) else None,
        'shapiro_wilk_pvalue': float(shapiro_p) if not np.isnan(shapiro_p) else None,
        'acf': acf_vals,
        'pacf': pacf_vals
    }

# Impulse Response Functions
def compute_irfs(results):
    try:
        irf = results.irf(10)
        irf_data = {
            'impulse_response': {
                'irf': irf.irfs.tolist(),
                'lower': irf.ci[:, :, 0].tolist() if hasattr(irf, 'ci') else None,
                'upper': irf.ci[:, :, 1].tolist() if hasattr(irf, 'ci') else None
            }
        }
        logger.debug("IRF computation successful")
        return irf_data
    except Exception as e:
        logger.error(f"IRF computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# JSON Encoder for Numpy and Pandas types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.ndarray, pd.Series, pd.DataFrame)):
            return obj.tolist()
        if isinstance(obj, (np.number, bool)):
            return obj.item()
        if isinstance(obj, float) and np.isnan(obj):
            return None  # JSON does not support NaN
        return super().default(obj)

# Convert keys to strings recursively and handle NaN
def convert_keys_to_str(data):
    if isinstance(data, dict):
        return {str(k): convert_keys_to_str(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_str(i) for i in data]
    elif isinstance(data, float) and np.isnan(data):
        return None
    else:
        return data

# Validate analysis result
def validate_analysis_result(analysis_result):
    required_fields = ['commodity', 'direction', 'aic', 'bic', 'hqic', 'alpha', 'beta', 'gamma', 'diagnostics', 'irf', 'granger_causality']
    for field in required_fields:
        if field not in analysis_result:
            logger.warning(f"Missing field '{field}' in analysis result for {analysis_result.get('commodity', 'Unknown')}")
            analysis_result[field] = None  # Assign a default value
    return analysis_result

# Save Results Function
def save_results(ecm_results, residuals_storage, direction):
    try:
        # Convert results to serializable format
        flattened = convert_keys_to_str(ecm_results)
        residuals_converted = {commodity: v.tolist() for commodity, v in residuals_storage.items()}
        
        # Define file paths
        results_dir = dirs['results_dir'] / "ecm"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        ecm_file = results_dir / f"ecm_results_{direction.replace('-', '_')}.json"
        residuals_file = results_dir / f"ecm_residuals_{direction.replace('-', '_')}.json"
        
        # Save ECM results
        with open(ecm_file, 'w') as f:
            json.dump(flattened, f, indent=4, cls=NumpyEncoder)
        logger.info(f"ECM results saved to {ecm_file}")
        
        # Save residuals
        with open(residuals_file, 'w') as f:
            json.dump(residuals_converted, f, indent=4, cls=NumpyEncoder)
        logger.info(f"Residuals saved to {residuals_file}")
        
    except KeyError as e:
        logger.error(f"Missing key in configuration: {e}")
        logger.debug(traceback.format_exc())
        raise
    except Exception as e:
        logger.error(f"Saving results failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# Modify the run_ecm_analysis function to handle a single commodity
def run_ecm_analysis_single(commodity, df, stationarity_results, cointegration_results, direction='north-to-south'):
    try:
        logger.info(f"Starting ECM analysis for {commodity} in {direction} direction")
        
        if direction == 'north-to-south':
            y = df['usdprice_north']
            x = df['usdprice_south']
        elif direction == 'south-to-north':
            y = df['usdprice_south']
            x = df['usdprice_north']
        else:
            logger.error(f"Unknown direction: {direction}")
            return None, None

        y, x = y.align(x, join='inner')

        logger.debug(f"Aligned data length for {commodity} in {direction}: {len(y)}")

        if len(y) < MIN_OBS:
            logger.warning(f"Not enough aligned observations for {commodity}. Skipping.")
            return None, None

        model, results = estimate_ecm(y, x)
        if model is None or results is None:
            logger.warning(f"ECM estimation failed for {commodity}. Skipping.")
            return None, None

        logger.debug(f"ECM estimation successful for {commodity}. Residuals shape: {results.resid.shape}")

        aic, bic, hqic = compute_model_criteria(results, model)
        logger.debug(f"Model criteria for {commodity}: AIC={aic}, BIC={bic}, HQIC={hqic}")

        diagnostics = run_diagnostics(results)
        logger.debug(f"Diagnostics computed for {commodity}")

        irf = compute_irfs(results)
        logger.debug(f"IRF computed for {commodity}")

        gc = compute_granger_causality(y, x)
        logger.debug(f"Granger causality computed for {commodity}")

        # Extract coefficients
        try:
            alpha = results.alpha[0, 0]  # Assuming first cointegration relation
            beta = results.beta[0, 0]    # Assuming first cointegration relation
            gamma = results.gamma[0, 0]  # Assuming first equation
            logger.debug(f"Extracted coefficients for {commodity}: alpha={alpha}, beta={beta}, gamma={gamma}")
        except Exception as e:
            logger.error(f"Failed to extract coefficients for {commodity}: {e}")
            alpha = None  # Use None to represent null in JSON
            beta = None
            gamma = None

        analysis_result = {
            'commodity': commodity,
            'direction': direction,
            'aic': aic,
            'bic': bic,
            'hqic': hqic,
            'alpha': alpha,
            'beta': beta,
            'gamma': gamma,
            'diagnostics': diagnostics,
            'irf': irf,
            'granger_causality': gc
        }

        # Validate analysis result
        analysis_result = validate_analysis_result(analysis_result)

        logger.info(f"ECM analysis completed for {commodity} in {direction} direction")
        return analysis_result, results.resid

    except Exception as e:
        logger.error(f"ECM analysis failed for {commodity} in {direction} direction: {e}")
        logger.debug(traceback.format_exc())
        return None, None

# Logging with timestamps
def timed_log(msg):
    logger.info(f"{msg} at {time.strftime('%Y-%m-%d %H:%M:%S')}")


# --------------------------- Main Function ---------------------------

def main():
    timed_log("Starting ECM analysis workflow")
    try:
        start_time = time.time()

        timed_log("Loading data")
        data = load_data()
        timed_log(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds at {time.strftime('%Y-%m-%d %H:%M:%S')}")

        stationarity_results, cointegration_results = {}, {}

        for commodity, df in data.items():
            if len(df) < MIN_OBS:
                logger.warning(f"Insufficient data for {commodity}. Skipping stationarity and cointegration tests.")
                continue
            # Perform stationarity and cointegration tests for both directions
            for direction in ['north-to-south', 'south-to-north']:
                key = f"{commodity}_{direction}"
                if direction == 'north-to-south':
                    y, x = df['usdprice_north'], df['usdprice_south']
                else:
                    y, x = df['usdprice_south'], df['usdprice_north']

                stationarity_results[key] = {
                    'y': run_stationarity_tests(y, f'usdprice_{direction.split("-")[0]}'),
                    'x': run_stationarity_tests(x, f'usdprice_{direction.split("-")[2]}')
                }

                coint = run_cointegration_tests(y, x, stationarity_results[key])
                if coint:
                    cointegration_results[key] = coint

        # Determine the number of processes to use based on available memory
        num_processes = check_memory()
        logger.info(f"Using {num_processes} processes for parallel computation")

        # Run ECM analysis in parallel for both directions
        for direction in ['north-to-south', 'south-to-north']:
            timed_log(f"Starting ECM analysis for {direction}")

            # Prepare the iterable as a list of tuples (commodity, df)
            iterable = [(commodity, df) for commodity, df in data.items()]

            # Use partial to fix the stationarity_results, cointegration_results, and direction
            worker_func = partial(
                run_ecm_analysis_single,
                stationarity_results=stationarity_results,
                cointegration_results=cointegration_results,
                direction=direction
            )

            with multiprocessing.Pool(processes=num_processes) as pool:
                results = pool.starmap(worker_func, iterable)

                # Extract results and residuals
                ecm_results = [r[0] for r in results if r[0] is not None]
                residuals = {r[0]['commodity']: r[1] for r in results if r[0] is not None and r[1] is not None}

            save_results(ecm_results, residuals, direction=direction)
            timed_log(f"Completed ECM analysis for {direction}")

        logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())

if __name__ == '__main__':
    warnings.simplefilter('ignore')
    main()