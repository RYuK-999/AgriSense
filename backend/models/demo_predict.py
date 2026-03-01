"""
Standalone demo script showing how the crop prediction model works.

This file demonstrates the ML pipeline used in the AgriSense AI backend:
1. Load the trained model (crop40_brain1.joblib)
2. Build the 10-feature input vector (N, P, K, temp, humidity, pH, rainfall + ratios)
3. Get top 10 ML predictions
4. Filter through profit engine to get top 3 most profitable crops

This is NOT used by the backend server — it's for testing/demo purposes only.
The backend uses ml_crop.py which contains the same logic as a proper module.
"""

import joblib
import numpy as np
from pathlib import Path

# ==============================
# LOAD TRAINED MODEL
# ==============================
MODEL_PATH = Path(__file__).parent / "crop40_brain1.joblib"
model = joblib.load(MODEL_PATH)

# ==============================
# GOVERNMENT PROFIT DATABASE
# ==============================
crop_data = {
    # Cereals & Grains
    "Barley": {"prices": [2086.69, 2213.89, 2300.00], "yield": 20, "cost": 22000},
    "Maize": {"prices": [1550.93, 1554.56, 1570.41], "yield": 38, "cost": 30000},
    "Millet": {"prices": [2354.43, 2300.95], "yield": 15, "cost": 25000},
    "Ragi": {"prices": [5200.00, 5196.50, 4886.00], "yield": 18, "cost": 22000},
    "Rice": {"prices": [3382.79, 3237.81, 2484.56], "yield": 50, "cost": 40000},
    "Sorghum": {"prices": [5138.33, 4949.06], "yield": 12, "cost": 20000},
    "Wheat": {"prices": [2464.92, 2457.67, 2289.96], "yield": 45, "cost": 35000},
    # Pulses
    "Blackgram": {"prices": [7327.82, 6362.12], "yield": 10, "cost": 26000},
    "Chickpea": {"prices": [5442.65, 5360.90], "yield": 13, "cost": 28000},
    "Groundnut": {"prices": [8578.27, 8827.37], "yield": 18, "cost": 32000},
    "Lentil": {"prices": [6419.29, 6508.34], "yield": 11, "cost": 27000},
    "Mungbean": {"prices": [7046.28, 7298.20], "yield": 9, "cost": 25000},
    "Pigeonpeas": {"prices": [7779.07, 7865.89], "yield": 12, "cost": 30000},
    "Soybean": {"prices": [5145.90, 5053.12], "yield": 15, "cost": 26000},
    # Vegetables
    "Brinjal": {"prices": [1800, 1700], "yield": 250, "cost": 90000},
    "Cabbage": {"prices": [1200, 1300], "yield": 220, "cost": 85000},
    "Cauliflower": {"prices": [1400, 1500], "yield": 200, "cost": 80000},
    "Chili": {"prices": [6000, 5800], "yield": 20, "cost": 50000},
    "Onion": {"prices": [1196.22, 1236.59], "yield": 200, "cost": 80000},
    "Potato": {"prices": [651.26, 617.63], "yield": 250, "cost": 90000},
    "Tomato": {"prices": [1425.28, 1464.46], "yield": 300, "cost": 100000},
    # Fruits & Plantation
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
    # Cash Crops
    "Cotton": {"prices": [7731.62, 7712.83], "yield": 20, "cost": 60000},
    "Jute": {"prices": [5000, 5200], "yield": 15, "cost": 40000},
    "Mustard": {"prices": [5910.68, 5939.46], "yield": 14, "cost": 28000},
    "Sesame": {"prices": [9539.34, 9219.93], "yield": 5, "cost": 15000},
    "Sugarcane": {"prices": [340, 350], "yield": 700, "cost": 120000},
    "Sunflower": {"prices": [6500, 6700], "yield": 12, "cost": 30000},
}


def calculate_top3(crop_names, crop_probs):
    """Top 3 most profitable crops using probability-weighted (risk-adjusted) profit."""
    results = []
    for crop, prob in zip(crop_names, crop_probs):
        crop = crop.strip().title()
        if crop in crop_data:
            prices = crop_data[crop]["prices"]
            avg_price = sum(prices) / len(prices)
            revenue = avg_price * crop_data[crop]["yield"]
            raw_profit = revenue - crop_data[crop]["cost"]
            expected_profit = prob * raw_profit
            results.append((crop, expected_profit))
    results.sort(key=lambda x: x[1], reverse=True)
    return results[:3]


def predict(soil_input):
    """Run full prediction pipeline for given soil/weather input dict."""
    N = soil_input["N"]
    P = soil_input["P"] if soil_input["P"] != 0 else 0.0001
    K = soil_input["K"] if soil_input["K"] != 0 else 0.0001

    N_P_Ratio = N / P
    N_K_Ratio = N / K
    P_K_Ratio = P / K

    input_features = np.array([[
        soil_input["N"],
        soil_input["P"],
        soil_input["K"],
        soil_input["temperature"],
        soil_input["humidity"],
        soil_input["ph"],
        soil_input["rainfall"],
        N_P_Ratio,
        N_K_Ratio,
        P_K_Ratio,
    ]])

    probs = model.predict_proba(input_features)[0]
    top_indices = np.argsort(probs)[::-1][:10]
    top_crop_names = model.classes_[top_indices]
    top_crop_probs = probs[top_indices]

    print("\nTop 10 ML Recommended Crops (by suitability):")
    for name, p in zip(top_crop_names, top_crop_probs):
        print(f"  {name}: {p:.4f}")

    top3 = calculate_top3(top_crop_names, top_crop_probs)
    print("\nTop 3 Most Profitable Crops (Risk-Adjusted):")
    for crop_name, profit in top3:
        print(f"  {crop_name} → Expected Profit: ₹ {round(profit, 2)}")

    return top3


if __name__ == "__main__":
    # Example input — modify these values to test
    sample_input = {
        "N": 90,
        "P": 40,
        "K": 40,
        "temperature": 25,
        "humidity": 80,
        "ph": 6.5,
        "rainfall": 120,
    }
    print("=" * 50)
    print("AgriSense AI - Crop Prediction Demo")
    print("=" * 50)
    print(f"Input: {sample_input}")
    predict(sample_input)
