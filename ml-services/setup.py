"""
ML Services Setup Script

Validates environment, installs dependencies, and sets up the ML services.
Run this script after creating the virtual environment.
"""

import subprocess
import sys
import os
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible."""
    print("Checking Python version...")
    version = sys.version_info
    if version.major != 3 or version.minor < 10:
        print(
            f"❌ Python 3.10+ required. Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True


def check_virtualenv():
    """Check if running in a virtual environment."""
    print("\nChecking virtual environment...")
    in_venv = hasattr(sys, 'real_prefix') or (
        hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    if not in_venv:
        print("⚠️  Not running in a virtual environment. It's recommended to use one.")
        return False
    print("✅ Running in virtual environment")
    return True


def install_requirements():
    """Install required packages."""
    print("\nInstalling requirements...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False


def download_spacy_model():
    """Download spaCy model for NER."""
    print("\nDownloading spaCy model...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        print("✅ spaCy model downloaded")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to download spaCy model: {e}")
        return False


def create_env_file():
    """Create .env file from template if it doesn't exist."""
    print("\nChecking .env file...")
    env_file = Path(".env")
    env_example = Path(".env.example")

    if env_file.exists():
        print("✅ .env file exists")
        return True
    elif env_example.exists():
        print("Creating .env from template...")
        with open(env_example, 'r') as src:
            content = src.read()
        with open(env_file, 'w') as dst:
            dst.write(content)
        print("⚠️  Created .env file. Please update it with your configuration.")
        return True
    else:
        print("❌ .env.example not found")
        return False


def create_directories():
    """Create necessary directories."""
    print("\nCreating directories...")
    directories = [
        "models",
        "data/processed",
        "logs",
    ]

    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created {directory}")

    return True


def validate_imports():
    """Validate that key packages can be imported."""
    print("\nValidating imports...")
    packages = [
        "torch",
        "transformers",
        "spacy",
        "prophet",
        "sklearn",
        "xgboost",
        "mlflow",
        "fastapi",
        "pandas",
        "numpy",
        "google.generativeai",
    ]

    failed = []
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError as e:
            print(f"❌ {package}: {e}")
            failed.append(package)

    if failed:
        print(f"\n⚠️  Failed to import: {', '.join(failed)}")
        return False

    print("\n✅ All packages imported successfully")
    return True


def main():
    """Main setup function."""
    print("=" * 60)
    print("ML Services Setup")
    print("=" * 60)

    checks = []

    # Run checks
    checks.append(("Python Version", check_python_version()))
    checks.append(("Virtual Environment", check_virtualenv()))
    checks.append(("Create Directories", create_directories()))
    checks.append(("Environment File", create_env_file()))

    # Install requirements (may take time)
    install_success = input(
        "\nInstall requirements? This may take 10-20 minutes. (y/n): ").lower() == 'y'
    if install_success:
        checks.append(("Install Requirements", install_requirements()))
        checks.append(("Download spaCy Model", download_spacy_model()))
        checks.append(("Validate Imports", validate_imports()))

    # Summary
    print("\n" + "=" * 60)
    print("Setup Summary")
    print("=" * 60)

    for check_name, success in checks:
        status = "✅" if success else "❌"
        print(f"{status} {check_name}")

    all_passed = all(success for _, success in checks)

    if all_passed:
        print("\n✅ Setup completed successfully!")
        print("\nNext steps:")
        print("1. Update .env file with your configuration")
        print("2. Start MLflow: mlflow server --host 0.0.0.0 --port 5000")
        print("3. Run model server: python -m model_server.app")
    else:
        print("\n⚠️  Setup completed with warnings or errors.")
        print("Please review the errors above and fix them.")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
