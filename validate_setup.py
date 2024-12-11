"""
Validation script for Yemen Market Analysis reproduction package.
Checks environment setup, dependencies, and data requirements.
"""

import sys
import pkg_resources
import importlib
import os
from pathlib import Path
import yaml
import logging
from typing import List, Dict, Any

def check_python_version(min_version: tuple = (3, 8)) -> bool:
    """Check if Python version meets minimum requirements."""
    current = sys.version_info[:2]
    if current < min_version:
        print(f"❌ Python version {current[0]}.{current[1]} detected. "
              f"Minimum required version: {min_version[0]}.{min_version[1]}")
        return False
    print(f"✅ Python version {current[0]}.{current[1]} meets requirements")
    return True

def check_dependencies(requirements_file: str = 'requirements.txt') -> bool:
    """Verify all required packages are installed with correct versions."""
    try:
        with open(requirements_file, 'r') as f:
            requirements = pkg_resources.parse_requirements(f)
        
        missing = []
        outdated = []
        
        for requirement in requirements:
            try:
                pkg_resources.require(str(requirement))
            except pkg_resources.DistributionNotFound:
                missing.append(str(requirement))
            except pkg_resources.VersionConflict as e:
                outdated.append(f"{e.req} (installed: {e.dist})")
        
        if missing or outdated:
            if missing:
                print("❌ Missing packages:")
                for pkg in missing:
                    print(f"  - {pkg}")
            if outdated:
                print("❌ Outdated packages:")
                for pkg in outdated:
                    print(f"  - {pkg}")
            return False
        
        print("✅ All required packages are installed with correct versions")
        return True
    
    except FileNotFoundError:
        print(f"❌ Requirements file '{requirements_file}' not found")
        return False

def check_directory_structure() -> bool:
    """Verify required directories exist."""
    required_dirs = [
        'project/config',
        'project/price_diffrential_analysis',
        'project/utils',
        'data/processed',
        'data/raw',
        'results/price_diff_results'
    ]
    
    missing_dirs = []
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            missing_dirs.append(dir_path)
    
    if missing_dirs:
        print("❌ Missing required directories:")
        for dir_path in missing_dirs:
            print(f"  - {dir_path}")
        return False
    
    print("✅ All required directories exist")
    return True

def check_config_file() -> Dict[str, Any]:
    """Validate configuration file exists and contains required parameters."""
    config_path = 'project/config/config.yaml'
    required_params = {
        'directories': ['data_dir', 'processed_data_dir', 'results_dir'],
        'files': ['spatial_geojson', 'enhanced_geojson'],
        'parameters': ['min_common_dates', 'lag_periods', 'commodities']
    }
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        missing_params = []
        for section, params in required_params.items():
            if section not in config:
                missing_params.append(f"Section '{section}'")
                continue
            for param in params:
                if param not in config[section]:
                    missing_params.append(f"Parameter '{param}' in section '{section}'")
        
        if missing_params:
            print("❌ Missing required configuration parameters:")
            for param in missing_params:
                print(f"  - {param}")
            return {}
        
        print("✅ Configuration file is valid")
        return config
    
    except FileNotFoundError:
        print(f"❌ Configuration file '{config_path}' not found")
        return {}
    except yaml.YAMLError as e:
        print(f"❌ Error parsing configuration file: {e}")
        return {}

def check_data_files(config: Dict[str, Any]) -> bool:
    """Verify required data files exist."""
    if not config:
        return False
    
    required_files = [
        config['files']['spatial_geojson'],
        config['files']['enhanced_geojson']
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing required data files:")
        for file_path in missing_files:
            print(f"  - {file_path}")
        return False
    
    print("✅ All required data files exist")
    return True

def check_permissions() -> bool:
    """Check write permissions in required directories."""
    dirs_to_check = [
        'results',
        'data/processed',
        'project/config'
    ]
    
    no_permission = []
    for dir_path in dirs_to_check:
        if Path(dir_path).exists():
            if not os.access(dir_path, os.W_OK):
                no_permission.append(dir_path)
        else:
            try:
                Path(dir_path).mkdir(parents=True, exist_ok=True)
            except PermissionError:
                no_permission.append(dir_path)
    
    if no_permission:
        print("❌ Missing write permissions for directories:")
        for dir_path in no_permission:
            print(f"  - {dir_path}")
        return False
    
    print("✅ Write permissions verified for all directories")
    return True

def main():
    """Run all validation checks."""
    print("\n=== Yemen Market Analysis Setup Validation ===\n")
    
    checks = [
        ("Python Version", check_python_version()),
        ("Dependencies", check_dependencies()),
        ("Directory Structure", check_directory_structure()),
    ]
    
    config = check_config_file()
    checks.extend([
        ("Configuration", bool(config)),
        ("Data Files", check_data_files(config)),
        ("Permissions", check_permissions())
    ])
    
    print("\n=== Validation Summary ===\n")
    all_passed = all(result for _, result in checks)
    for check_name, result in checks:
        status = "✅ Passed" if result else "❌ Failed"
        print(f"{check_name}: {status}")
    
    if all_passed:
        print("\n✅ All validation checks passed. The environment is ready for analysis.")
        sys.exit(0)
    else:
        print("\n❌ Some validation checks failed. Please address the issues above before running the analysis.")
        sys.exit(1)

if __name__ == "__main__":
    main()
