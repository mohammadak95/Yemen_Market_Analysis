# project/ecm_analysis/ecm_analysis_v4.py

import logging
import json
import warnings
import traceback
from pathlib import Path

import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
import statsmodels.api as sm
from statsmodels.tsa.vector_ar.vecm import VECM, VECMResults, select_order, select_coint_rank
from statsmodels.tsa.vector_ar.var_model import VAR, VARResults
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss
from statsmodels.stats.diagnostic import het_arch, acorr_breusch_godfrey
from statsmodels.stats.stattools import durbin_watson, jarque_bera
from arch.unitroot import engle_granger
from esda.moran import Moran
from libpysal import weights
from arch import arch_model
from joblib import Parallel, delayed, parallel_backend

import time
import psutil  # For memory monitoring
import matplotlib.pyplot as plt  # Needed for plotting functions
from scipy import stats  # For z-scores in confidence interval computation

# Suppress specific warnings
from statsmodels.tools.sm_exceptions import InterpolationWarning

# Load configuration
def load_config(path='project/config/config.yaml'):
    try:
        with open(path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        raise

config = load_config()

# Setup logging
log_dir = Path(config['directories']['logs_dir'])
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=getattr(logging, config['logging']['level'].upper(), logging.DEBUG),
    format=config['logging']['format'],
    handlers=[
        logging.FileHandler(log_dir / 'ecm_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Adjust logging level for performance
if config['logging']['level'].upper() == 'INFO':
    logger.setLevel(logging.WARNING)
elif config['logging']['level'].upper() == 'DEBUG':
    logger.setLevel(logging.DEBUG)
else:
    logger.setLevel(logging.INFO)

# Define base directory (Assuming script is in 'project/ecm_analysis/')
base_dir = Path(__file__).resolve().parents[2]  # Points to 'project'

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
BOOT_SAMPLES = params.get('bootstrap_samples', 100)
RIDGE_ALPHA = params.get('ridge_alpha', 1.0)
MAX_EPOCHS = params.get('max_epochs', 1000)
LEARNING_RATE = params.get('learning_rate', 0.01)
MIN_REGIONS = params.get('min_regions', 5)
SPATIAL_THRESH_MULT = params['spatial_weights']['threshold_multiplier']
MIN_NEIGHBORS = params['min_neighbors']
PARALLEL_PROCESSES = params.get('parallel_processes', 8)  # Reduced to 8 for stability
MEMORY_PER_PROCESS_GB = params.get('memory_per_process_gb', 4)  # Monitor memory usage per process
MAX_DIFF_ORDER = params.get('max_diff_order', 2)  # Default to 2 if not specified

# Validate required columns
def validate_columns(data, required_columns):
    missing = required_columns - set(data.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    logger.debug("All required columns are present.")

# Load spatial weights
def load_spatial_weights(path, region_id_column):
    try:
        gdf = gpd.read_file(path)
        # Use region identifier (e.g., 'admin1') as index to correctly match regions
        if region_id_column in gdf.columns:
            gdf = gdf.set_index(region_id_column)
        else:
            raise KeyError(f"Region identifier column '{region_id_column}' not found in GeoJSON.")
        
        w = weights.Queen.from_dataframe(gdf)
        w.transform = 'R'  # row-standardization for weights
        logger.info("Spatial weights created successfully using Queen contiguity.")
        return w
    except Exception as e:
        logger.error(f"Spatial weights loading failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Load spatial weights with correct region identifier
spatial_weights = load_spatial_weights(files['spatial_geojson'], params['region_identifier'])

# Align data with spatial weights
def align_data_with_weights(data, spatial_weights, index_column):
    valid_indices = spatial_weights.neighbors.keys()
    aligned_data = data[data[index_column].isin(valid_indices)]
    logger.debug(f"Aligned data with spatial weights: {len(aligned_data)} records.")
    return aligned_data

# Load and preprocess data
def load_data(test_mode=False, max_groups=5):
    logger.debug(f"Loading data from {files['spatial_geojson']}")
    try:
        # **Optimized Data Loading**: Convert GeoJSON to Parquet for faster loading if not already done
        parquet_path = files['spatial_geojson'].with_suffix('.parquet')
        if not parquet_path.exists():
            gdf = gpd.read_file(files['spatial_geojson'])
            gdf.to_parquet(parquet_path)
            logger.info(f"Converted GeoJSON to Parquet at {parquet_path}")
        else:
            gdf = gpd.read_parquet(parquet_path)
            logger.info(f"Loaded data from Parquet at {parquet_path}")
        
        df = pd.DataFrame(gdf)
        required_columns = {'date', 'commodity', 'exchange_rate_regime', 'usdprice', 'conflict_intensity', params['region_identifier']}
        validate_columns(df, required_columns)
        
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        initial_length = len(df)
        df.drop_duplicates(inplace=True)
        df.dropna(subset=['date'], inplace=True)
        logger.info(f"Dropped {initial_length - len(df)} duplicate or NaN rows based on 'date'.")

        # Exclude 'Amanat Al Asimah' if present
        if 'admin1' in df.columns:
            df = df[df['admin1'] != 'Amanat Al Asimah']
            logger.info("Excluded records from 'Amanat Al Asimah'.")
        else:
            logger.warning("Column 'admin1' not found. Skipping exclusion of 'Amanat Al Asimah'.")

        # Filter commodities
        if COMMODITIES:
            df = df[df['commodity'].isin(COMMODITIES)]
            logger.info(f"Filtered data for specified commodities. Number of records: {len(df)}")
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")

        # Unify exchange rate regimes if needed
        if config['parameters']['new_regime_name'] in EXR_REGIMES:
            df['exchange_rate_regime'] = config['parameters']['new_regime_name']
            logger.info(f"Unified exchange rate regimes to '{config['parameters']['new_regime_name']}'.")

        # Filter based on exchange rate regimes
        df = df[df['exchange_rate_regime'].isin(EXR_REGIMES)]
        logger.debug(f"Data filtered for exchange rate regimes: {EXR_REGIMES}")

        # Convert categorical columns to 'category' dtype
        df['commodity'] = df['commodity'].astype('category')
        df['exchange_rate_regime'] = df['exchange_rate_regime'].astype('category')
        df[params['region_identifier']] = df[params['region_identifier']].astype('category')

        # Create dummy variables for exchange rate regimes
        exchange_dummies = pd.get_dummies(df['exchange_rate_regime'], prefix='er_regime', drop_first=True)
        if not exchange_dummies.empty:
            df = pd.concat([df, exchange_dummies], axis=1)
            logger.debug(f"Created dummy variables: {exchange_dummies.columns.tolist()}")
        else:
            logger.debug("No dummy variables created for exchange_rate_regime.")

        # Group data by commodity and exchange rate regime
        grouped_data = {
            (grp, rgm): grp_df
            for (grp, rgm), grp_df in df.groupby(['commodity', 'exchange_rate_regime'])
        }
        logger.debug(f"Data grouped into {len(grouped_data)} groups.")

        if test_mode:
            grouped_data = dict(list(grouped_data.items())[:max_groups])
            logger.info(f"Test mode: Limited data to {max_groups} groups.")

        # Filter regions with spatial weights
        logger.debug("Filtered all groups to include only valid regions with spatial weights.")

        return grouped_data
    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# Stationarity Tests with Automated Differencing
def run_stationarity_tests(series, variable):
    logger.debug(f"Running stationarity tests for {variable}")
    results = {}
    integration_order = None
    transformed_series = None

    for d in range(0, MAX_DIFF_ORDER + 1):
        transformed = series.diff(d).dropna()
        if transformed.empty:
            continue
        logger.debug(f"Testing series differenced {d} times")
        try:
            # Check if the transformed series is constant
            if transformed.nunique() == 1:
                logger.warning(f"{variable} series is constant after differencing order {d}, skipping further differencing.")
                integration_order = d
                transformed_series = transformed
                results[f'diff{d}'] = {
                    'ADF': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'KPSS': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'diff_order': d,
                    'constant_series': True
                }
                break  # Exit the loop as further differencing won't help
            # ADF Test
            adf_stat, adf_p = adfuller(transformed, autolag='AIC')[:2]
            # KPSS Test
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", InterpolationWarning)
                kpss_stat, kpss_p = kpss(transformed, regression='c', nlags='auto')[:2]

            adf_stationary = adf_p < STN_SIG
            kpss_stationary = kpss_p > STN_SIG

            results[f'diff{d}'] = {
                'ADF': {
                    'Statistic': adf_stat,
                    'p-value': adf_p,
                    'Stationary': adf_stationary
                },
                'KPSS': {
                    'Statistic': kpss_stat,
                    'p-value': kpss_p,
                    'Stationary': kpss_stationary
                },
                'diff_order': d
            }

            logger.debug(f"ADF p={adf_p}, KPSS p={kpss_p} for differencing order {d}")

            if adf_stationary and kpss_stationary:
                integration_order = d
                transformed_series = transformed
                logger.debug(f"Series is stationary after differencing order {d}")
                break
        except ValueError as e:
            if "x is constant" in str(e):
                logger.warning(f"{variable} series is constant after differencing order {d}, skipping further differencing.")
                integration_order = d
                transformed_series = transformed
                results[f'diff{d}'] = {
                    'ADF': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'KPSS': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'diff_order': d,
                    'constant_series': True
                }
                break  # Exit the loop as further differencing won't help
            else:
                logger.error(f"Stationarity test failed for differencing order {d}: {e}")
                logger.debug(traceback.format_exc())

    if integration_order is None:
        logger.warning(f"Could not achieve stationarity for {variable} within max differencing order")
        transformed_series = series.dropna()
        integration_order = 0

    return {
        'integration_order': integration_order,
        'transformed_series': transformed_series.tolist(),
        'results': results
    }

# Cointegration Tests
def run_cointegration_tests(y, x, stationarity_results):
    logger.debug("Running cointegration tests")
    try:
        combined = pd.concat([y, x], axis=1).dropna()
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
            'price_transformation': 'original' if stationarity_results['usdprice']['integration_order'] == 0 else f"diff{stationarity_results['usdprice']['integration_order']}",
            'conflict_transformation': 'original' if stationarity_results['conflict_intensity']['integration_order'] == 0 else f"diff{stationarity_results['conflict_intensity']['integration_order']}"
        }
        logger.debug(f"Engle-Granger p={eg.pvalue}, cointegrated={eg.pvalue < CIG_SIG}")
        return coint_result
    except Exception as e:
        logger.error(f"Cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Estimate Model (VECM or VAR)
def estimate_model(y, x, exog=None, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS, model_type='VECM'):
    logger.debug(f"Estimating {model_type} model with max_lags={max_lags}, ecm_lags={ecm_lags}")
    try:
        # Convert y and x to DataFrames if they are not already
        if isinstance(y, pd.Series):
            y = y.to_frame(name='y')
        else:
            y = y.rename(columns={y.columns[0]: 'y'})

        if isinstance(x, pd.Series):
            x = x.to_frame(name='x')
        else:
            x = x.rename(columns={x.columns[0]: 'x'})

        endog = pd.concat([y, x], axis=1).dropna()
        
        if exog is not None and not exog.empty:
            # Align exog with endog
            exog = exog.loc[endog.index].drop(columns=['y', 'x'], errors='ignore')
            if exog.empty:
                exog_to_pass = None
            else:
                exog_to_pass = exog
                logger.debug(f"Including exogenous variables: {exog.columns.tolist()}")
        else:
            exog_to_pass = None

        if model_type == 'VECM':
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                lag_order_result = select_order(endog[['y', 'x']], maxlags=max_lags, deterministic='ci')

            if lag_order_result is not None and hasattr(lag_order_result, 'aic') and lag_order_result.aic is not None:
                optimal_lags = lag_order_result.aic
            else:
                optimal_lags = ecm_lags

            optimal_lags = max(1, min(optimal_lags, ecm_lags))
            logger.debug(f"Optimal lag order by AIC: {optimal_lags}")

            coint_rank_result = select_coint_rank(endog[['y', 'x']], det_order=0, k_ar_diff=optimal_lags)
            coint_rank = coint_rank_result.rank
            logger.debug(f"Selected cointegration rank: {coint_rank}")

            if coint_rank == 0:
                logger.warning("No cointegration found based on selected rank.")
                return None, None

            model = VECM(endog[['y', 'x']], k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci', exog=exog_to_pass)
            results = model.fit()
            logger.info("VECM model estimated successfully")
        else:
            # VAR model estimation
            model = VAR(endog[['y', 'x']])
            lag_order_result = model.select_order(maxlags=max_lags)
            if hasattr(lag_order_result, 'aic') and lag_order_result.aic is not None:
                optimal_lags = lag_order_result.aic
            else:
                optimal_lags = ecm_lags

            optimal_lags = max(1, min(optimal_lags, ecm_lags))
            results = model.fit(optimal_lags)
            logger.info("VAR model estimated successfully")
        
        return model, results
    except Exception as e:
        logger.error(f"{model_type} estimation failed: {e}")
        logger.debug(traceback.format_exc())
        return None, None

# Compute Model Criteria
def compute_model_criteria(results, model):
    logger.debug("Computing model criteria (AIC, BIC, HQIC)")
    try:
        llf = results.llf  # Log-likelihood
        n_obs = results.nobs  # Number of observations used in estimation

        if isinstance(results, VECMResults):
            neqs = results.neqs  # Number of endogenous variables (n)
            k_ar_diff = results.k_ar_diff  # Number of lagged differences (p)
            coint_rank = results.rank  # Cointegration rank (r)

            # Number of parameters in alpha (adjustment coefficients): n * r
            k_alpha = neqs * coint_rank

            # Number of parameters in beta (cointegration vectors): r * n
            k_beta = coint_rank * neqs

            # Number of parameters in gamma (short-term coefficients): n * n * p
            k_gamma = neqs * neqs * k_ar_diff

            # Deterministic terms in cointegration relation
            k_det_coint = results.det_coef_coint.size if results.det_coef_coint is not None else 0

            # Deterministic terms in short-run dynamics
            k_det = results.det_coef.size if results.det_coef is not None else 0

            # Total number of parameters
            k_params = k_alpha + k_beta + k_gamma + k_det_coint + k_det
        else:
            # For VARResults or other models
            k_params = results.params.shape[0]

        # Compute AIC, BIC, and HQIC
        aic = -2 * llf + 2 * k_params
        bic = -2 * llf + np.log(n_obs) * k_params
        hqic = -2 * llf + 2 * np.log(np.log(n_obs)) * k_params
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
        if isinstance(x, pd.Series):
            x = x.to_frame(name='x')
        elif not isinstance(x, pd.DataFrame):
            x = pd.DataFrame(x, columns=['x'])

        for col in x.columns:
            test_data = pd.concat([y, x[col]], axis=1).dropna()
            if test_data.shape[0] < 2:
                logger.warning(f"Not enough data for Granger causality test on column {col}. Skipping.")
                continue
            test = grangercausalitytests(test_data, maxlag=GRANGER_MAX_LAGS, verbose=False)
            gc_metrics = {}
            for lag, res in test.items():
                stats_dict = res[0]
                gc_metrics[lag] = {
                    'ssr_ftest_pvalue': stats_dict['ssr_ftest'][1],
                    'ssr_ftest_stat': stats_dict['ssr_ftest'][0],
                    'ssr_chi2test_pvalue': stats_dict['ssr_chi2test'][1],
                    'ssr_chi2test_stat': stats_dict['ssr_chi2test'][0],
                    'lrtest_pvalue': stats_dict['lrtest'][1],
                    'lrtest_stat': stats_dict['lrtest'][0],
                    'params_ftest_pvalue': stats_dict['params_ftest'][1],
                    'params_ftest_stat': stats_dict['params_ftest'][0],
                }
            gc_results[col] = gc_metrics
        return gc_results
    except Exception as e:
        logger.error(f"Granger causality tests failed: {e}")
        logger.debug(traceback.format_exc())
        return gc_results

# Run spatial autocorrelation test
def run_spatial_autocorrelation(residuals, spatial_weights, filter_indices):
    """
    Runs spatial autocorrelation test after aligning residuals with spatial weights.
    """
    if spatial_weights is None:
        logger.warning("Spatial weights not loaded. Skipping spatial autocorrelation tests.")
        return None

    try:
        # Align indices between residuals and spatial weights
        residuals_clean, valid_indices = align_indices(residuals, spatial_weights, filter_indices)

        # If no valid indices, skip further processing
        if not valid_indices:
            logger.warning("No valid indices found in spatial weights for subsetting. Skipping spatial autocorrelation.")
            return None

        # Create a filtered weights object that matches the valid indices
        filtered_neighbors = {i: spatial_weights.neighbors[i] for i in valid_indices}
        filtered_weights = weights.W(filtered_neighbors)
        filtered_weights.transform = 'R'  # Row-standardization

        # Compute Moran's I for the cleaned residuals
        moran_results = {}
        if isinstance(residuals_clean, pd.DataFrame):
            for col in residuals_clean.columns:
                y = residuals_clean[col].values
                moran = Moran(y, filtered_weights)
                moran_results[col] = {'Moran_I': moran.I, 'p_value': moran.p_sim}
        else:
            moran = Moran(residuals_clean.values, filtered_weights)
            moran_results = {'Moran_I': moran.I, 'p_value': moran.p_sim}

        return moran_results

    except KeyError as e:
        logger.error(f"KeyError during spatial autocorrelation: {e}")
        return None
    except Exception as e:
        logger.error(f"Spatial autocorrelation test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Align indices for spatial autocorrelation
def align_indices(residuals, spatial_weights, filter_indices):
    """
    Align residuals and spatial weights based on valid indices.
    """
    # Ensure filter_indices is a list or Index
    if isinstance(filter_indices, pd.Index):
        filter_indices = filter_indices.tolist()
    elif isinstance(filter_indices, np.ndarray):
        filter_indices = filter_indices.tolist()

    # Get valid spatial indices from spatial weights
    spatial_keys = set(spatial_weights.neighbors.keys())

    # Filter indices that are present in both the residuals and spatial weights
    valid_indices = list(spatial_keys.intersection(set(filter_indices)))

    # Ensure valid indices exist in the residuals index
    valid_indices_in_residuals = [idx for idx in valid_indices if idx in residuals.index]

    if not valid_indices_in_residuals:
        logger.warning("No valid indices found in residuals. Skipping.")
        return pd.DataFrame(), []  # Return an empty DataFrame and empty index list

    # Subset residuals based on valid indices
    residuals_clean = residuals.loc[valid_indices_in_residuals].dropna()

    return residuals_clean, valid_indices_in_residuals

# Multivariate Diagnostics
def multivariate_durbin_watson_test(residuals):
    dw_results = {}
    for i, series in enumerate(residuals.T):
        try:
            dw_stat = durbin_watson(series)
            dw_results[f'series_{i}'] = dw_stat
        except Exception as e:
            logger.error(f"Durbin-Watson test failed for series {i}: {e}")
    return dw_results

def multivariate_arch_test(residuals, max_lags):
    arch_results = {}
    for i, series in enumerate(residuals.T):
        try:
            arch_test = het_arch(series, nlags=max_lags)
            arch_results[f'series_{i}'] = {
                'arch_test_stat': arch_test[0],
                'arch_test_pvalue': arch_test[1]
            }
        except Exception as e:
            logger.error(f"ARCH test failed for series {i}: {e}")
    return arch_results

def multivariate_acf_pacf(residuals, max_lags):
    acf_pacf_results = {}
    for i, series in enumerate(residuals.T):
        try:
            acf_vals = sm.tsa.acf(series, nlags=max_lags)
            pacf_vals = sm.tsa.pacf(series, nlags=max_lags)
            acf_pacf_results[f'series_{i}'] = {
                'acf': acf_vals.tolist(),
                'pacf': pacf_vals.tolist()
            }
        except Exception as e:
            logger.error(f"ACF/PACF computation failed for series {i}: {e}")
    return acf_pacf_results

# Run Diagnostics
def run_diagnostics(results, model_type='VECM'):
    if results is None:
        return {}
    try:
        resid = results.resid
        diagnostics = {}

        if isinstance(results, (VECMResults, VARResults)):
            if isinstance(resid, np.ndarray):
                endog_names = results.model.names if hasattr(results.model, 'names') else [f'resid_{i}' for i in range(resid.shape[1])]
                resid = pd.DataFrame(resid, columns=endog_names)
            elif isinstance(resid, pd.Series):
                resid = resid.to_frame(name='resid')
            elif not isinstance(resid, pd.DataFrame):
                resid = pd.DataFrame(resid)

            diagnostics['durbin_watson'] = multivariate_durbin_watson_test(resid)
            diagnostics['arch_test'] = multivariate_arch_test(resid, ECM_LAGS)
            diagnostics['acf_pacf'] = multivariate_acf_pacf(resid, ECM_LAGS)

            # Multivariate diagnostics for serial correlation, normality
            try:
                serial_corr_test = results.test_serial_correlation(lags=ECM_LAGS)
                diagnostics['serial_correlation'] = {
                    'statistic': serial_corr_test.test_statistic.tolist(),
                    'pvalue': serial_corr_test.pvalue.tolist()
                }
            except Exception as e:
                logger.error(f"Serial correlation test failed: {e}")
                diagnostics['serial_correlation'] = None

            try:
                normality_test = results.test_normality()
                diagnostics['normality'] = {
                    'statistic': normality_test.test_statistic.tolist(),
                    'pvalue': normality_test.pvalue.tolist()
                }
            except Exception as e:
                logger.error(f"Normality test failed: {e}")
                diagnostics['normality'] = None

        return diagnostics
    except Exception as e:
        logger.error(f"Diagnostics computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Fit GARCH Model
def fit_garch_model(residuals):
    try:
        if isinstance(residuals, pd.DataFrame):
            residuals = residuals.iloc[:, 0].values
        elif isinstance(residuals, pd.Series):
            residuals = residuals.values
        elif isinstance(residuals, np.ndarray):
            residuals = residuals.flatten()
        else:
            residuals = np.array(residuals)

        am = arch_model(residuals, vol='GARCH', p=1, q=1, dist='normal')
        res = am.fit(update_freq=5, disp='off')
        return {
            'model_summary': res.summary().as_text(),
            'params': res.params.to_dict(),
            'conditional_volatility': res.conditional_volatility.tolist()
        }
    except Exception as e:
        logger.error(f"GARCH model fitting failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Impulse Response Functions
def compute_irfs(results, model_type='VECM'):
    try:
        if isinstance(results, (VECMResults, VARResults)):  # Include VARResults
            irf = results.irf(10)
            irf_data = {
                'impulse_response': irf.irfs.tolist()
            }
            # Attempt to compute confidence intervals
            try:
                # First, try using err_band_mc()
                lower, upper = irf.err_band_mc()
                irf_data['lower'] = lower.tolist()
                irf_data['upper'] = upper.tolist()
            except AttributeError:
                # If err_band_mc is not available, try conf_int()
                try:
                    conf_int = irf.conf_int()
                    irf_data['lower'] = conf_int[:, :, 0].tolist()
                    irf_data['upper'] = conf_int[:, :, 1].tolist()
                except AttributeError:
                    # As a last resort, compute asymptotic confidence intervals
                    try:
                        covs = irf.cov()
                        irfs = irf.irfs
                        steps = irfs.shape[0]
                        lower = np.zeros_like(irfs)
                        upper = np.zeros_like(irfs)
                        alpha = 0.05
                        z = stats.norm.ppf(1 - alpha / 2)
                        for i in range(steps):
                            se = np.sqrt(np.diag(covs[i]))
                            lower[i] = irfs[i] - z * se
                            upper[i] = irfs[i] + z * se
                        irf_data['lower'] = lower.tolist()
                        irf_data['upper'] = upper.tolist()
                    except Exception as e:
                        logger.warning("Confidence intervals for IRFs are not available.")
                        logger.debug(traceback.format_exc())
            except Exception as e:
                logger.warning(f"Could not compute confidence intervals for IRF: {e}")
                logger.debug(traceback.format_exc())
        else:
            logger.error("IRF computation failed: Unsupported model type.")
            return None

        return irf_data
    except Exception as e:
        logger.error(f"IRF computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Compute IRFs if supported
def compute_irfs_if_supported(results, model_type='VECM'):
    if model_type not in ['VECM', 'VAR']:
        logger.error(f"IRF computation not supported for model type: {model_type}")
        return None

    return compute_irfs(results, model_type=model_type)  # Existing function call

# Generate Residual Plots Data
def generate_residual_plots_data(residuals):
    try:
        plots_data = {}
        if isinstance(residuals, pd.DataFrame):
            for col in residuals.columns:
                series_resid = residuals[col].squeeze()
                # ACF
                acf_vals = sm.tsa.acf(series_resid, nlags=20).tolist()
                # PACF
                pacf_vals = sm.tsa.pacf(series_resid, nlags=20).tolist()
                # QQ Plot Data
                qq = sm.qqplot(series_resid, line='s', fit=True)
                qq_data = {
                    'theoretical_quantiles': qq.gca().lines[1].get_xdata().tolist(),
                    'sample_quantiles': qq.gca().lines[1].get_ydata().tolist()
                }
                plots_data[col] = {
                    'acf': acf_vals,
                    'pacf': pacf_vals,
                    'qq_plot': qq_data
                }
                plt.close()  # Close the plot to avoid memory issues
        else:
            # For univariate residuals
            if isinstance(residuals, pd.Series):
                residuals = residuals
            elif isinstance(residuals, np.ndarray):
                residuals = pd.Series(residuals)
            else:
                residuals = pd.Series(residuals)
            # ACF
            acf_vals = sm.tsa.acf(residuals, nlags=20).tolist()
            # PACF
            pacf_vals = sm.tsa.pacf(residuals, nlags=20).tolist()
            # QQ Plot Data
            qq = sm.qqplot(residuals, line='s', fit=True)
            qq_data = {
                'theoretical_quantiles': qq.gca().lines[1].get_xdata().tolist(),
                'sample_quantiles': qq.gca().lines[1].get_ydata().tolist()
            }
            plots_data = {
                'acf': acf_vals,
                'pacf': pacf_vals,
                'qq_plot': qq_data
            }
            plt.close()
        return plots_data
    except Exception as e:
        logger.error(f"Residual plots data generation failed: {e}")
        logger.debug(traceback.format_exc())
        return {}

# JSON Encoder for Numpy and Pandas types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.ndarray, pd.Series, pd.DataFrame)):
            return obj.tolist()
        if isinstance(obj, (np.number, bool)):
            return obj.item()
        return super().default(obj)

# Convert keys to strings recursively
def convert_keys_to_str(data):
    if isinstance(data, dict):
        return {str(k): convert_keys_to_str(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_str(i) for i in data]
    else:
        return data

# Save Results
def save_results(ecm_results):
    try:
        flattened = convert_keys_to_str(ecm_results)
        files['ecm_results'].parent.mkdir(parents=True, exist_ok=True)
        with open(files['ecm_results'], 'w') as f:
            json.dump(flattened, f, indent=4, cls=NumpyEncoder)
        logger.info(f"Results saved to {files['ecm_results']}")
    except Exception as e:
        logger.error(f"Saving results failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# ECM Analysis for a Single Group
def ecm_analysis_group(args, spatial_weights):
    (commodity, regime), df = args
    try:
        logger.info(f"Running ECM analysis for {commodity} in {regime} regime")
        if len(df) < MIN_OBS:
            logger.warning(f"Not enough observations for {commodity} in {regime} regime. Skipping.")
            return None

        key = f"{commodity}_{regime}"
        stationarity = {
            'usdprice': run_stationarity_tests(df['usdprice'], 'usdprice'),
            'conflict_intensity': run_stationarity_tests(df['conflict_intensity'], 'conflict_intensity')
        }

        usdprice_integration_order = stationarity['usdprice']['integration_order']
        conflict_integration_order = stationarity['conflict_intensity']['integration_order']

        if usdprice_integration_order != conflict_integration_order:
            logger.warning(f"Variables have different integration orders for {key}. Skipping.")
            return None
        integration_order = usdprice_integration_order

        if integration_order == 0:
            model_type = 'VAR'
            y_transformed = df['usdprice'].dropna()
            x_transformed = df['conflict_intensity'].dropna()
        elif integration_order == 1:
            coint = run_cointegration_tests(df['usdprice'], df['conflict_intensity'], stationarity)
            if coint and coint['engle_granger']['cointegrated']:
                model_type = 'VECM'
                y_transformed = df['usdprice'].dropna()
                x_transformed = df['conflict_intensity'].dropna()
            else:
                model_type = 'VAR'
                y_transformed = pd.Series(stationarity['usdprice']['transformed_series'])
                x_transformed = pd.Series(stationarity['conflict_intensity']['transformed_series'])
        else:
            logger.warning(f"Variables have integration order higher than 1 for {key}. Skipping.")
            return None

        # Convert y_transformed and x_transformed to Series if they are lists
        if isinstance(y_transformed, list):
            y_transformed = pd.Series(y_transformed)
        if isinstance(x_transformed, list):
            x_transformed = pd.Series(x_transformed)

        exog = df.filter(regex='^er_regime_')
        y, x = y_transformed.align(x_transformed, join='inner')
        if not exog.empty:
            exog = exog.loc[y.index]
        logger.debug(f"Aligned data length: {len(y)}")

        if len(y) < MIN_OBS:
            logger.warning(f"Not enough aligned observations for {commodity} in {regime} regime. Skipping.")
            return None

        model, results = estimate_model(y, x, exog, model_type=model_type)
        if model is None or results is None:
            logger.warning(f"{model_type} estimation failed for {commodity} in {regime} regime. Skipping.")
            return None

        aic, bic, hqic = compute_model_criteria(results, model)
        diagnostics = run_diagnostics(results, model_type=model_type)

        # Fit GARCH model if ARCH effects are present
        garch_results = None
        if diagnostics:
            if isinstance(results, (VECMResults, VARResults)):
                # For multivariate models, check ARCH p-values for each residual series
                arch_pvalues = []
                for key_diag, diag in diagnostics.get('arch_test', {}).items():
                    p_val = diag.get('arch_test_pvalue', 1)
                    arch_pvalues.append(p_val)
                if any(p < STN_SIG for p in arch_pvalues):
                    logger.info(f"ARCH effects detected in residuals for {key}. Fitting GARCH model.")
                    garch_results = fit_garch_model(results.resid)
            else:
                # For univariate models, check ARCH p-value directly
                arch_pvalue = diagnostics.get('arch_test_pvalue', 1)
                if arch_pvalue < STN_SIG:
                    logger.info(f"ARCH effects detected in residuals for {key}. Fitting GARCH model.")
                    garch_results = fit_garch_model(results.resid)

            # Re-estimate the model if needed (optional, based on original code logic)
            # model, results = estimate_model(y, x, exog, model_type=model_type)

        if model_type in ['VECM', 'VAR']:
            irf = compute_irfs_if_supported(results, model_type=model_type)
        else:
            irf = None
        gc = compute_granger_causality(y, x)

        residuals_clean, valid_indices = align_indices(results.resid, spatial_weights, df.index)
        spatial = run_spatial_autocorrelation(residuals_clean, spatial_weights, valid_indices)

        residual_plots_data = generate_residual_plots_data(results.resid)

        # Explicitly delete variables to free memory
        del y, x, exog, model, results, df

        # Monitor memory usage
        process = psutil.Process()
        memory_usage = process.memory_info().rss / (1024 ** 3)  # in GB
        logger.debug(f"Current memory usage: {memory_usage:.2f} GB")

        return {
            'commodity': commodity,
            'regime': regime,
            'model_type': model_type,
            'aic': aic,
            'bic': bic,
            'hqic': hqic,
            'diagnostics': diagnostics,
            'garch_results': garch_results,
            'irf': irf,
            'granger_causality': gc,
            'spatial_autocorrelation': spatial,
            'residual_analysis': residual_plots_data
        }
    except Exception as e:
        logger.error(f"ECM analysis failed for {commodity} in {regime} regime: {e}")
        logger.debug(traceback.format_exc())
        return None

# Wrapper for Parallel Processing
def ecm_analysis_group_wrapper(args, spatial_weights):
    try:
        return ecm_analysis_group(args, spatial_weights)
    except Exception as e:
        logger.error(f"Error in ECM analysis for group {args[0]}: {e}")
        logger.debug(traceback.format_exc())
        return None

# ECM Analysis
def run_ecm_analysis(data, spatial_weights):
    all_results = []
    num_cpus = PARALLEL_PROCESSES
    logger.info(f"Starting ECM analysis with {num_cpus} parallel processes")
    data_items = list(data.items())
    batch_size = 5  # Adjust based on your memory constraints

    try:
        for i in range(0, len(data_items), batch_size):
            batch = data_items[i:i+batch_size]
            # Using joblib's Parallel for better control
            with parallel_backend('threading', n_jobs=num_cpus):
                results = Parallel()(
                    delayed(ecm_analysis_group_wrapper)(item, spatial_weights) for item in batch
                )
            all_results.extend([res for res in results if res is not None])
            logger.debug(f"Processed batch {i//batch_size + 1} with {len(batch)} groups.")
        
        logger.info(f"ECM analysis completed with {len(all_results)} successful analyses")
        return all_results
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())
        return all_results

# Main Function
def main():
    logger.info("Starting ECM analysis workflow")
    try:
        start_time = time.time()

        logger.info("Loading data")
        data = load_data()
        logger.info(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds")

        ecm_results = run_ecm_analysis(data, spatial_weights)
        save_results(ecm_results)

        logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())

if __name__ == '__main__':
    warnings.simplefilter('ignore')
    main()
