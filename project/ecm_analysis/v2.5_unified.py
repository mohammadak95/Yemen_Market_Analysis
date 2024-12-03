# ecm_analysis_v2.5_unified.py

import logging
import json
import warnings
import traceback
from pathlib import Path
import time

import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
from statsmodels.tsa.vector_ar.vecm import VECM, select_order, select_coint_rank
import statsmodels.api as sm
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss
from statsmodels.stats.diagnostic import het_arch, het_white
from statsmodels.stats.stattools import durbin_watson, jarque_bera
from arch.unitroot import engle_granger
from esda.moran import Moran
from libpysal import weights
from scipy.stats import shapiro
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

# --------------------------- Data Transformation Functions ---------------------------

def handle_duplicates(df):
    """
    Handle duplicates by averaging numeric columns.
    """
    try:
        # Identify numeric and non-numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        non_numeric_cols = df.select_dtypes(exclude=['number']).columns.tolist()
        
        # Exclude grouping columns from non-numeric columns
        grouping_cols = ['admin1', 'commodity', 'date', 'exchange_rate_regime']
        non_numeric_cols = [col for col in non_numeric_cols if col not in grouping_cols]
        
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

def load_spatial_weights(path):
    try:
        gdf = gpd.read_file(path)
        w = weights.Queen.from_dataframe(gdf, use_index=False)
        w.transform = 'r'
        return w, gdf
    except Exception as e:
        logger.error(f"Spatial weights loading failed: {e}")
        logger.debug(traceback.format_exc())
        return None, None

spatial_weights, spatial_gdf = load_spatial_weights(files['spatial_geojson'])

def load_data():
    logger.debug(f"Loading data from {files['spatial_geojson']}")
    try:
        gdf = gpd.read_file(files['spatial_geojson'])
        df = gdf.drop(columns='geometry')  # Remove spatial component

        required_columns = {'date', 'commodity', 'exchange_rate_regime', 'usdprice', 'conflict_intensity', 'admin1'}
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
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")

        # Filter for exchange rate regimes
        if 'unified' in EXR_REGIMES:
            df['exchange_rate_regime'] = 'unified'

        df = df[df['exchange_rate_regime'].isin(EXR_REGIMES)]
        logger.debug(f"Data filtered for exchange rate regimes: {EXR_REGIMES}")

        # Handle duplicates by averaging
        df = handle_duplicates(df)

        # Apply seasonal adjustment
        df = apply_seasonal_adjustment(df, frequency='M')

        # Apply smoothing
        df = apply_smoothing(df, window=3)

        # Proceed with grouping
        df['commodity'] = df['commodity'].astype('category')
        df['exchange_rate_regime'] = df['exchange_rate_regime'].astype('category')

        exchange_dummies = pd.get_dummies(df['exchange_rate_regime'], prefix='er_regime', drop_first=True)
        if not exchange_dummies.empty:
            df = pd.concat([df, exchange_dummies], axis=1)
            logger.debug(f"Created dummy variables: {exchange_dummies.columns.tolist()}")
        else:
            logger.debug("No dummy variables created for exchange_rate_regime.")

        grouped_data = {
            (grp, rgm): grp_df
            for (grp, rgm), grp_df in df.groupby(['commodity', 'exchange_rate_regime'])
        }
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
            adf_result = adfuller(transformed, autolag='AIC')
            adf_stat, adf_p, usedlag, nobs, critical_values, icbest = adf_result
            adf_stationary = adf_p < STN_SIG

            # Perform KPSS test
            kpss_result = kpss(transformed, regression='c', nlags='auto', store=False)
            kpss_stat, kpss_p, lags, critical_values_kpss = kpss_result
            kpss_stationary = kpss_p > STN_SIG

            results[name] = {
                'ADF': {
                    'Statistic': adf_stat,
                    'p-value': adf_p,
                    'Critical Values': critical_values,
                    'Stationary': adf_stationary
                },
                'KPSS': {
                    'Statistic': kpss_stat,
                    'p-value': kpss_p,
                    'Critical Values': critical_values_kpss,
                    'Stationary': kpss_stationary
                }
            }

            logger.debug(f"ADF p={adf_p}, KPSS p={kpss_p} for {name}")

            if adf_stationary and kpss_stationary:
                selected_transformation = name
                logger.debug(f"Selected transformation: {name}")
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
        y_transformed = pd.Series(stationarity_results['usdprice']['series'])
        x_transformed = pd.Series(stationarity_results['conflict_intensity']['series'])

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
            'price_transformation': stationarity_results.get('usdprice', {}).get('transformation', 'original'),
            'conflict_transformation': stationarity_results.get('conflict_intensity', {}).get('transformation', 'original')
        }
        logger.debug(f"Engle-Granger p={eg.pvalue}, cointegrated={eg.pvalue < CIG_SIG}")
        return coint_result
    except Exception as e:
        logger.error(f"Cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Estimate ECM
def estimate_ecm(price, conflict_intensity, other_exog=None, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS):
    logger.debug(f"Estimating ECM with max_lags={max_lags}, ecm_lags={ecm_lags}")
    try:
        # Combine price and conflict intensity as endogenous variables
        endog = pd.concat([price, conflict_intensity], axis=1).dropna()
        
        # Check if we have enough data points after cleaning
        if len(endog) < 2:
            logger.warning("Insufficient data points after cleaning. Skipping ECM estimation.")
            return None, None
        
        # Handle exogenous variables
        if other_exog is not None and not other_exog.empty:
            exog = other_exog.dropna()
            # Align exog with endog
            endog, exog = endog.align(exog, join='inner', axis=0)
            logger.debug(f"Including exogenous variables: {exog.columns.tolist()}")
        else:
            exog = None
            logger.debug("No exogenous variables provided or all were NaN.")
        
        # Check again if we have enough data points after alignment
        if len(endog) < 2:
            logger.warning("Insufficient data points after aligning with exogenous variables. Skipping ECM estimation.")
            return None, None

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            lag_order_result = select_order(endog, exog=exog, maxlags=min(max_lags, len(endog) // 2 - 1), deterministic='ci')

        optimal_lags = lag_order_result.aic if hasattr(lag_order_result, 'aic') else ecm_lags
        optimal_lags = max(1, min(optimal_lags, ecm_lags, len(endog) // 2 - 1))
        logger.debug(f"Optimal lag order by AIC: {optimal_lags}")

        coint_rank_result = select_coint_rank(endog, det_order=0, k_ar_diff=optimal_lags)
        coint_rank = coint_rank_result.rank
        logger.debug(f"Selected cointegration rank: {coint_rank}")

        if coint_rank == 0:
            logger.warning("No cointegration found based on selected rank.")
            return None, None

        # Only pass exog to VECM if it's not None and not empty
        if exog is not None and not exog.empty:
            model = VECM(endog, exog=exog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')
        else:
            model = VECM(endog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')
        
        results = model.fit()
        logger.info("ECM model estimated successfully")
        return model, results
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
        for col in x.columns:
            test = grangercausalitytests(pd.concat([y, x[col]], axis=1).dropna(), maxlag=GRANGER_MAX_LAGS, verbose=False)
            gc_metrics = {}
            for lag, res in test.items():
                stats = res[0]
                gc_metrics[lag] = {
                    'ssr_ftest_pvalue': stats['ssr_ftest'][1],
                    'ssr_ftest_stat': stats['ssr_ftest'][0],
                    'ssr_chi2test_pvalue': stats['ssr_chi2test'][1],
                    'ssr_chi2test_stat': stats['ssr_chi2test'][0],
                    'lrtest_pvalue': stats['lrtest'][1],
                    'lrtest_stat': stats['lrtest'][0],
                    'params_ftest_pvalue': stats['params_ftest'][1],
                    'params_ftest_stat': stats['params_ftest'][0],
                }
            gc_results[col] = gc_metrics
        return gc_results
    except Exception as e:
        logger.error(f"Granger causality tests failed: {e}")
        logger.debug(traceback.format_exc())
        return gc_results

# Spatial Autocorrelation
def compute_spatial_autocorrelation(residuals, spatial_weights, gdf, filter_indices):
    # Create an empty Series to hold the residuals with the same index as the gdf
    full_residuals = pd.Series(index=gdf.index, dtype=float)

    # Only assign the residuals to the indices where we have valid data
    # Ensure residuals and filter_indices are aligned by filtering non-NaN residuals
    valid_residual_indices = np.where(~np.isnan(residuals))[0]  # Get non-NaN indices
    valid_filter_indices = [filter_indices[i] for i in valid_residual_indices]  # Filter matching indices
    valid_residuals = residuals[valid_residual_indices]  # Filter matching residuals
    
    # Assign the valid residuals to the correct indices in the full_residuals series
    full_residuals.loc[valid_filter_indices] = valid_residuals
    
    # Now only keep the indices with non-NaN residuals
    valid_indices = full_residuals.dropna().index
    
    # Filter the spatial weights to only include the valid indices
    filtered_weights = weights.W(
        {key: [neigh for neigh in spatial_weights.neighbors[key] if neigh in valid_indices]
         for key in valid_indices if key in spatial_weights.neighbors}
    )
    
    # Calculate Moran's I using the valid residuals and filtered spatial weights
    moran = Moran(full_residuals[valid_indices], filtered_weights)
    
    return {
        'Moran_I': moran.I,
        'Moran_p_value': moran.p_sim
    }

def run_spatial_autocorrelation(residuals, spatial_weights, gdf, filter_indices):
    if spatial_weights is None:
        logger.warning("Spatial weights not loaded. Skipping spatial autocorrelation tests.")
        return None

    try:
        if isinstance(filter_indices, pd.Index):
            filter_indices = filter_indices.tolist()
        elif isinstance(filter_indices, np.ndarray):
            filter_indices = filter_indices.tolist()

        if isinstance(residuals, np.ndarray) and residuals.ndim == 2 and residuals.shape[1] > 1:
            spatial_results = {}
            for i in range(residuals.shape[1]):
                col_residuals = residuals[:, i]
                spatial_results[f'Variable_{i+1}'] = compute_spatial_autocorrelation(col_residuals, spatial_weights, gdf, filter_indices)
            return spatial_results
        else:
            return compute_spatial_autocorrelation(residuals, spatial_weights, gdf, filter_indices)
    except Exception as e:
        logger.error(f"Spatial autocorrelation test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Diagnostics
def run_diagnostics(results):
    if results is None:
        return {}
    try:
        logger.debug(f"Original resid shape: {results.resid.shape}")
        resid = results.resid
        
        # Handle multivariate residuals
        if resid.ndim == 2 and resid.shape[1] > 1:
            logger.debug("Handling multivariate residuals")
            diagnostics = {}
            for i in range(resid.shape[1]):
                col_resid = resid[:, i].reshape(-1, 1)
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
    
    # Breusch-Godfrey test
    bg_result = sm.stats.diagnostic.acorr_breusch_godfrey(mock_results, nlags=5)
    bg_stat = bg_result[0] if isinstance(bg_result, tuple) else bg_result.statistic
    bg_p = bg_result[1] if isinstance(bg_result, tuple) else bg_result.pvalue

    # ARCH test
    arch_result = sm.stats.diagnostic.het_arch(resid)
    arch_stat = arch_result[0] if isinstance(arch_result, tuple) else arch_result.statistic
    arch_p = arch_result[1] if isinstance(arch_result, tuple) else arch_result.pvalue

    # Jarque-Bera test
    jb_result = sm.stats.stattools.jarque_bera(resid)
    jb_stat = jb_result[0] if isinstance(jb_result, tuple) else jb_result.statistic
    jb_p = jb_result[1] if isinstance(jb_result, tuple) else jb_result.pvalue

    dw_stat = sm.stats.stattools.durbin_watson(resid)
    
    # White test
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
        'breusch_godfrey_stat': float(bg_stat),
        'breusch_godfrey_pvalue': float(bg_p),
        'arch_test_stat': float(arch_stat),
        'arch_test_pvalue': float(arch_p),
        'jarque_bera_stat': float(jb_stat),
        'jarque_bera_pvalue': float(jb_p),
        'durbin_watson_stat': float(dw_stat),
        'white_test_stat': float(white_stat),
        'white_test_pvalue': float(white_p),
        'shapiro_wilk_stat': float(shapiro_stat),
        'shapiro_wilk_pvalue': float(shapiro_p),
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
    required_fields = ['commodity', 'regime', 'aic', 'bic', 'hqic', 'alpha', 'beta', 'gamma', 'diagnostics', 'irf', 'granger_causality']
    for field in required_fields:
        if field not in analysis_result:
            logger.warning(f"Missing field '{field}' in analysis result for {analysis_result.get('commodity', 'Unknown')}")
            analysis_result[field] = None  # Assign a default value
    return analysis_result

# Save Results
def save_results(ecm_results, residuals_storage):
    try:
        # Convert results to serializable format
        flattened = convert_keys_to_str(ecm_results)
        residuals_converted = {k: v.tolist() for k, v in residuals_storage.items()}
        
        # Define file paths
        results_dir = dirs['results_dir'] / "ecm"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        # Save ECM analysis results
        ecm_file = results_dir / "ecm_analysis_results.json"
        with open(ecm_file, 'w') as f:
            json.dump(flattened, f, indent=4, cls=NumpyEncoder)
        logger.info(f"ECM results saved to {ecm_file}")
        
        # Save residuals separately using same naming convention as directional script
        residuals_file = results_dir / "ecm_residuals.json"
        with open(residuals_file, 'w') as f:
            json.dump(residuals_converted, f, indent=4, cls=NumpyEncoder)
        logger.info(f"Residuals saved to {residuals_file}")
        
    except Exception as e:
        logger.error(f"Saving results failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# ECM Analysis
def run_ecm_analysis(data, stationarity_results, cointegration_results, gdf):
    all_results = []
    residuals_storage = {}
    for (commodity, regime), df in data.items():
        try:
            logger.info(f"Running ECM analysis for {commodity} in {regime} regime")
            if len(df) < MIN_OBS:
                logger.warning(f"Not enough observations for {commodity} in {regime} regime. Skipping.")
                continue

            key = f"{commodity}_{regime}"
            stationarity = stationarity_results.get(key)
            if not stationarity:
                logger.warning(f"No stationarity results for {key}. Skipping.")
                continue

            coint = cointegration_results.get(key)
            if not coint or not coint['engle_granger']['cointegrated']:
                logger.warning(f"No cointegration results for {key}. Skipping.")
                continue

            y = df['usdprice']
            x = df[['conflict_intensity']]
            exog = df.filter(regex='^er_regime_')
            y, x = y.align(x, join='inner')
            if not exog.empty:
                exog = exog.loc[y.index]
            logger.debug(f"Aligned data length: {len(y)}")

            if len(y) < MIN_OBS:
                logger.warning(f"Not enough aligned observations for {commodity} in {regime} regime. Skipping.")
                continue

            model, results = estimate_ecm(df['usdprice'], df['conflict_intensity'], other_exog=exog)
            if model is None or results is None:
                logger.warning(f"ECM estimation failed for {commodity} in {regime} regime. Skipping.")
                continue

            aic, bic, hqic = compute_model_criteria(results, model)
            diagnostics = run_diagnostics(results)
            irf = compute_irfs(results)
            gc = compute_granger_causality(y, x)

            # Extract Alpha, Beta, and Gamma coefficients
            try:
                alpha = results.alpha[0, 0]  # Assuming first cointegration relation
                beta = results.beta[0, 0]    # Assuming first cointegration relation
                gamma = results.gamma[0, 0]  # Assuming first equation
                logger.debug(f"Extracted coefficients: alpha={alpha}, beta={beta}, gamma={gamma}")
            except Exception as e:
                logger.error(f"Failed to extract coefficients: {e}")
                alpha = None  # Use None to represent null in JSON
                beta = None
                gamma = None

            residuals_storage[key] = results.resid

            filter_indices = df.index.tolist()
            spatial = run_spatial_autocorrelation(results.resid, spatial_weights, gdf, filter_indices)

            # Include Alpha, Beta, and Gamma in the results
            analysis_result = {
                'commodity': commodity,
                'regime': regime,
                'aic': aic,
                'bic': bic,
                'hqic': hqic,
                'alpha': alpha,
                'beta': beta,
                'gamma': gamma,
                'diagnostics': diagnostics,
                'irf': irf,
                'granger_causality': gc,
                'spatial_autocorrelation': spatial,
            }

            # Validate analysis result
            analysis_result = validate_analysis_result(analysis_result)

            all_results.append(analysis_result)
        except Exception as e:
            logger.error(f"ECM analysis failed for {commodity} in {regime} regime: {e}")
            logger.debug(traceback.format_exc())
    return all_results, residuals_storage

# Logging with timestamps
def timed_log(msg):
    logger.info(f"{msg} at {time.strftime('%Y-%m-%d %H:%M:%S')}")

# --------------------------- Main Workflow ---------------------------

def main():
    timed_log("Starting ECM analysis workflow")
    try:
        start_time = time.time()
        
        timed_log("Loading data")
        data = load_data()
        timed_log(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds")
        
        stationarity_results, cointegration_results = {}, {}
        
        for (commodity, regime), df in data.items():
            start_group_time = time.time()
            if len(df) < MIN_OBS:
                logger.warning(f"Insufficient data for {commodity} in {regime}. Skipping stationarity and cointegration tests.")
                continue
            key = f"{commodity}_{regime}"
            timed_log(f"Running stationarity tests for {key}")
            stationarity_results[key] = {
                'usdprice': run_stationarity_tests(df['usdprice'], 'usdprice'),
                'conflict_intensity': run_stationarity_tests(df['conflict_intensity'], 'conflict_intensity')
            }
            timed_log(f"Stationarity tests for {key} completed in {time.time() - start_group_time:.2f} seconds")
            
            coint = run_cointegration_tests(df['usdprice'], df['conflict_intensity'], stationarity_results[key])
            if coint:
                cointegration_results[key] = coint
        
        ecm_results, residuals_storage = run_ecm_analysis(data, stationarity_results, cointegration_results, spatial_gdf)
        save_results(ecm_results, residuals_storage)
        
        logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())

if __name__ == '__main__':
    warnings.simplefilter('ignore')
    main()
