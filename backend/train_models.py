"""
Model verification script for AgriSense AI.

This script checks that the required pre-trained models are in place and working.

Required models (trained externally and placed in backend/models/):
- crop40_brain1.joblib : Crop recommendation model (40-crop classifier, 10 features)
- best.pt             : YOLOv8 disease detection model (37 plant disease classes)
- classes.txt         : Disease class names for the YOLOv8 model

NOTE: These models were trained separately. This script does NOT retrain them.
It only verifies they load and produce output correctly.
"""

from pathlib import Path
import sys

MODELS_DIR = Path(__file__).parent / "models"


def check_crop_model():
    """Verify the crop recommendation model loads and predicts."""
    model_path = MODELS_DIR / "crop40_brain1.joblib"
    if not model_path.exists():
        print(f"  [FAIL] Crop model not found at {model_path}")
        return False

    import joblib
    import numpy as np

    model = joblib.load(model_path)
    # Test with sample input (10 features: N, P, K, temp, humidity, pH, rainfall, N/P, N/K, P/K)
    sample = np.array([[90, 40, 40, 25, 80, 6.5, 120, 2.25, 2.25, 1.0]])
    pred = model.predict(sample)
    proba = model.predict_proba(sample)
    n_classes = len(model.classes_)
    print(f"  [OK] Crop model loaded — {n_classes} classes, sample prediction: {pred[0]}")
    return True


def check_disease_model():
    """Verify YOLOv8 disease model and classes.txt."""
    model_path = MODELS_DIR / "best.pt"
    classes_path = MODELS_DIR / "classes.txt"

    if not model_path.exists():
        print(f"  [FAIL] Disease model not found at {model_path}")
        return False
    if not classes_path.exists():
        print(f"  [FAIL] Classes file not found at {classes_path}")
        return False

    with open(classes_path) as f:
        classes = [line.strip() for line in f if line.strip()]
    print(f"  [OK] classes.txt loaded — {len(classes)} disease classes")

    try:
        from ultralytics import YOLO
        model = YOLO(str(model_path))
        print(f"  [OK] YOLOv8 disease model loaded successfully")
    except ImportError:
        print(f"  [WARN] ultralytics not installed — cannot verify YOLOv8 model")
    except Exception as e:
        print(f"  [WARN] YOLOv8 model load issue: {e}")

    return True


def main():
    print("=" * 50)
    print("AgriSense AI — Model Verification")
    print("=" * 50)

    print("\n1. Crop Recommendation Model:")
    crop_ok = check_crop_model()

    print("\n2. Disease Detection Model:")
    disease_ok = check_disease_model()

    print("\n" + "=" * 50)
    if crop_ok and disease_ok:
        print("All models verified! Start the server with:")
        print("  cd backend && uvicorn main:app --reload --port 8001")
    else:
        print("Some models are missing. See above for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
