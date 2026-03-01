"""
Crop recommendation and yield/profit using trained model (crop40_brain1.joblib).
Input is dynamic: N, P, K, ph, temperature, humidity, rainfall from build_model_input.
"""

import numpy as np
from pathlib import Path

# Model path: place crop40_brain1.joblib in backend/models/
MODEL_PATH = Path(__file__).parent / "models" / "crop40_brain1.joblib"
_model = None

# ==============================
# GOVERNMENT PROFIT DATABASE (from final.py)
# ==============================
CROP_DATA = {
    "Barley": {"prices": [2086.69, 2213.89, 2300.00], "yield": 20, "cost": 22000},
    "Maize": {"prices": [1550.93, 1554.56, 1570.41], "yield": 38, "cost": 30000},
    "Millet": {"prices": [2354.43, 2300.95], "yield": 15, "cost": 25000},
    "Ragi": {"prices": [5200.00, 5196.50, 4886.00], "yield": 18, "cost": 22000},
    "Rice": {"prices": [3382.79, 3237.81, 2484.56], "yield": 50, "cost": 40000},
    "Sorghum": {"prices": [5138.33, 4949.06], "yield": 12, "cost": 20000},
    "Wheat": {"prices": [2464.92, 2457.67, 2289.96], "yield": 45, "cost": 35000},
    "Blackgram": {"prices": [7327.82, 6362.12], "yield": 10, "cost": 26000},
    "Chickpea": {"prices": [5442.65, 5360.90], "yield": 13, "cost": 28000},
    "Groundnut": {"prices": [8578.27, 8827.37], "yield": 18, "cost": 32000},
    "Lentil": {"prices": [6419.29, 6508.34], "yield": 11, "cost": 27000},
    "Mungbean": {"prices": [7046.28, 7298.20], "yield": 9, "cost": 25000},
    "Pigeonpeas": {"prices": [7779.07, 7865.89], "yield": 12, "cost": 30000},
    "Soybean": {"prices": [5145.90, 5053.12], "yield": 15, "cost": 26000},
    "Brinjal": {"prices": [1800, 1700], "yield": 250, "cost": 90000},
    "Cabbage": {"prices": [1200, 1300], "yield": 220, "cost": 85000},
    "Cauliflower": {"prices": [1400, 1500], "yield": 200, "cost": 80000},
    "Chili": {"prices": [6000, 5800], "yield": 20, "cost": 50000},
    "Onion": {"prices": [1196.22, 1236.59], "yield": 200, "cost": 80000},
    "Potato": {"prices": [651.26, 617.63], "yield": 250, "cost": 90000},
    "Tomato": {"prices": [1425.28, 1464.46], "yield": 300, "cost": 100000},
    "Apple": {"prices": [8000, 7500], "yield": 100, "cost": 150000},
    "Banana": {"prices": [2000, 2100], "yield": 400, "cost": 120000},
    "Coconut": {"prices": [24548.87, 20785.02], "yield": 10, "cost": 70000},
    "Coffee": {"prices": [9000, 9500], "yield": 8, "cost": 100000},
    "Grapes": {"prices": [5000, 5200], "yield": 120, "cost": 130000},
    "Mango": {"prices": [4000, 4200], "yield": 150, "cost": 140000},
    "Orange": {"prices": [3500, 3600], "yield": 130, "cost": 120000},
    "Papaya": {"prices": [2500, 2600], "yield": 180, "cost": 100000},
    "Pomegranate": {"prices": [7000, 7200], "yield": 110, "cost": 130000},
    "Rubber": {"prices": [17000, 18000], "yield": 6, "cost": 90000},
    "Tea": {"prices": [20000, 21000], "yield": 5, "cost": 150000},
    "Cotton": {"prices": [7731.62, 7712.83], "yield": 20, "cost": 60000},
    "Jute": {"prices": [5000, 5200], "yield": 15, "cost": 40000},
    "Mustard": {"prices": [5910.68, 5939.46], "yield": 14, "cost": 28000},
    "Sesame": {"prices": [9539.34, 9219.93], "yield": 5, "cost": 15000},
    "Sugarcane": {"prices": [340, 350], "yield": 700, "cost": 120000},
    "Sunflower": {"prices": [6500, 6700], "yield": 12, "cost": 30000},
}


def _load_model():
    """Load joblib model once; raise FileNotFoundError if missing."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Crop model not found at {MODEL_PATH}. "
                "Place crop40_brain1.joblib in backend/models/."
            )
        import joblib
        _model = joblib.load(MODEL_PATH)
    return _model


def _build_input_features(data_dict):
    """
    Build 10-feature array from dynamic input (same as final.py).
    data_dict must have: N, P, K, temperature, humidity, ph, rainfall.
    """
    N = float(data_dict["N"])
    P = float(data_dict["P"]) if data_dict["P"] != 0 else 0.0001
    K = float(data_dict["K"]) if data_dict["K"] != 0 else 0.0001

    N_P_Ratio = N / P
    N_K_Ratio = N / K
    P_K_Ratio = P / K

    return np.array([[
        data_dict["N"],
        data_dict["P"],
        data_dict["K"],
        data_dict["temperature"],
        data_dict["humidity"],
        data_dict["ph"],
        data_dict["rainfall"],
        N_P_Ratio,
        N_K_Ratio,
        P_K_Ratio,
    ]])


def _calculate_top3(crop_names, crop_probs):
    """
    Top 3 most profitable crops using probability-weighted (risk-adjusted) profit.

    Mirrors calculate_top3 in models/final.py.
    """
    results = []
    for crop, prob in zip(crop_names, crop_probs):
        crop = crop.strip().title()
        if crop in CROP_DATA:
            prices = CROP_DATA[crop]["prices"]
            avg_price = sum(prices) / len(prices)
            revenue = avg_price * CROP_DATA[crop]["yield"]
            raw_profit = revenue - CROP_DATA[crop]["cost"]
            expected_profit = prob * raw_profit
            results.append((crop, expected_profit))
    results.sort(key=lambda x: x[1], reverse=True)
    return results[:3]


def predict_crop(data_dict):
    """
    Recommend crop from dynamic soil/weather input.
    data_dict: N, P, K, ph, temperature, humidity, rainfall (from build_model_input).
    Returns (crop_name, confidence).
    """
    model = _load_model()
    features = _build_input_features(data_dict)
    probs = model.predict_proba(features)[0]
    top_indices = np.argsort(probs)[::-1][:10]
    top_crop_names = model.classes_[top_indices]
    top_crop_probs = probs[top_indices]
    top3 = _calculate_top3(top_crop_names, top_crop_probs)
    if not top3:
        return ("Rice", 0.0)
    best_crop, _ = top3[0]
    # confidence = model probability for the best crop
    idx = np.where(top_crop_names == best_crop)[0]
    confidence = float(top_crop_probs[idx[0]]) if len(idx) > 0 else 0.0
    return (best_crop, confidence)


def get_top3_advisory(data_dict):
    """
    Return top 3 recommended crops with full details (yield, profit) for each.
    Returns list of dicts: [{"crop_name": str, "expected_yield": float, "estimated_profit": float}, ...]
    """
    model = _load_model()
    features = _build_input_features(data_dict)
    probs = model.predict_proba(features)[0]
    top_indices = np.argsort(probs)[::-1][:10]
    top_crop_names = model.classes_[top_indices]
    top_crop_probs = probs[top_indices]
    top3 = _calculate_top3(top_crop_names, top_crop_probs)
    if not top3:
        return [
            {"crop_name": "Rice", "expected_yield": get_crop_yield("Rice"), "estimated_profit": 0.0}
        ]
    out = []
    for crop_name, _ in top3:
        yield_val = get_crop_yield(crop_name)
        price = get_crop_price(crop_name)
        cost = get_crop_cost(crop_name)
        profit = calculate_profit(yield_val, price, cost)
        out.append({
            "crop_name": crop_name,
            "expected_yield": round(float(yield_val), 2),
            "estimated_profit": round(float(profit), 2),
        })
    return out


def get_crop_yield(crop_name):
    """Yield (quintals/ha or similar) for crop from CROP_DATA."""
    key = crop_name.strip().title()
    if key in CROP_DATA:
        return float(CROP_DATA[key]["yield"])
    return 4.8


def get_crop_price(crop_name):
    """Average market price for crop."""
    key = crop_name.strip().title()
    if key in CROP_DATA:
        prices = CROP_DATA[key]["prices"]
        return sum(prices) / len(prices)
    return 20.0


def get_crop_cost(crop_name):
    """Cost for crop from CROP_DATA."""
    key = crop_name.strip().title()
    if key in CROP_DATA:
        return float(CROP_DATA[key]["cost"])
    return 200.0


def predict_yield(data_dict, crop=None):
    """
    Expected yield for the recommended crop (from CROP_DATA).
    crop: recommended crop name from predict_crop.
    """
    if crop is not None:
        return get_crop_yield(crop)
    return 4.8


def calculate_profit(yield_pred, market_price, cost):
    """Profit = revenue - cost."""
    return (yield_pred * market_price) - cost


# Backward compatibility: PRICE_DICT / COST_DICT for main.py
PRICE_DICT = {k: sum(v["prices"]) / len(v["prices"]) for k, v in CROP_DATA.items()}
COST_DICT = {k: v["cost"] for k, v in CROP_DATA.items()}
