"""
AgriSense AI - Intelligent Crop Advisory System
FastAPI backend with crop recommendation, yield prediction, profit estimation, and disease detection.
"""

from contextlib import asynccontextmanager
import re

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    CropInput,
    CropResponse,
    YieldResponse,
    ProfitResponse,
    DiseaseResponse,
    FarmerCropInput,
    FarmerAdvisoryResponse,
    TopCropEntry,
)
from weather import fetch_weather, get_coordinates, get_weather, reverse_geocode
from ml_crop import (
    predict_crop,
    predict_yield,
    calculate_profit,
    get_top3_advisory,
    PRICE_DICT,
    COST_DICT,
)
from ml_disease import predict_disease
from soil_profiles import get_soil_by_state


# ============ LIFESPAN & ERROR HANDLING ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload crop model on startup; log and continue if disease model missing."""
    try:
        from ml_crop import _load_model
        _load_model()
        print("[OK] Crop model (crop40_brain1.joblib) loaded.")
    except FileNotFoundError as e:
        print(f"[WARN] Crop model not loaded: {e}")
    except Exception as e:
        print(f"[WARN] Crop model not loaded: {e}")
    try:
        from ml_disease import _load_disease_model, _load_class_names
        _load_class_names()
        _load_disease_model()
        print("[OK] Disease model (YOLOv8 best.pt) and classes loaded.")
    except Exception as e:
        print(
            f"[WARN] Disease model not loaded: {e}. "
            f"Place best.pt and classes.txt in backend/models/."
        )
    yield
    pass


app = FastAPI(
    title="AgriSense AI",
    description="Intelligent Crop Advisory System - Crop recommendation, yield prediction, profit estimation, and disease detection",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for all origins (hackathon-friendly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ HELPER: WEATHER & LOCATION UTILITIES ============

def _merge_weather_with_input(crop_input: CropInput) -> dict:
    """Fetch weather for location and merge with crop input for ML."""
    weather = fetch_weather(crop_input.location)
    return {
        "N": crop_input.N,
        "P": crop_input.P,
        "K": crop_input.K,
        "temperature": weather["temperature"],
        "humidity": weather["humidity"],
        "ph": crop_input.ph,
        "rainfall": weather["rainfall"],
    }


def _parse_coordinates_from_location(location: str):
    """
    Best-effort parser for latitude/longitude inside a free-text location.

    Supports strings like:
    - "GPS: 12.8439, 80.1543"
    - "Chennai (12.84, 80.15)"
    - "12.84,80.15"
    """
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)", location)
    if not match:
        return None
    return float(match.group(1)), float(match.group(2))


def build_model_input(farmer_input: FarmerCropInput) -> dict:
    """
    Build ML-ready feature dictionary from farmer-friendly input.

    Steps:
    1) Geocode location to (lat, lon)
    2) Fetch weather for coordinates
    3) Override with farmer-provided weather values if present
    4) Use manual soil if provided, else region-based defaults

    Returns:
        dict with keys: N, P, K, ph, temperature, humidity, rainfall
    """
    # 1) Geocode location, but allow direct GPS coordinates embedded in the string.
    coords = _parse_coordinates_from_location(farmer_input.location)
    if coords:
        lat, lon = coords
    else:
        lat, lon = get_coordinates(farmer_input.location)

    # 2) Fetch weather
    weather = get_weather(lat, lon)

    # 3) Apply farmer overrides if provided
    if farmer_input.temperature is not None:
        weather["temperature"] = farmer_input.temperature
    if farmer_input.humidity is not None:
        weather["humidity"] = farmer_input.humidity
    if farmer_input.rainfall is not None:
        weather["rainfall"] = farmer_input.rainfall

    # 4) Soil values: manual override or region-based defaults
    if farmer_input.manual_soil is not None:
        soil = {
            "N": farmer_input.manual_soil.N,
            "P": farmer_input.manual_soil.P,
            "K": farmer_input.manual_soil.K,
            "ph": farmer_input.manual_soil.ph,
        }
    else:
        soil = get_soil_by_state(farmer_input.location)

    return {
        "N": soil["N"],
        "P": soil["P"],
        "K": soil["K"],
        "ph": soil["ph"],
        "temperature": weather["temperature"],
        "humidity": weather["humidity"],
        "rainfall": weather["rainfall"],
    }


# ============ ENDPOINTS ============

@app.post("/predict-crop", response_model=CropResponse)
async def predict_crop_endpoint(crop_input: CropInput):
    """
    Recommend the best crop based on soil nutrients (N, P, K, pH) and weather at the given location.
    """
    try:
        data = _merge_weather_with_input(crop_input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        crop_name, confidence = predict_crop(data)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {str(e)}")

    return CropResponse(
        recommended_crop=crop_name,
        confidence=round(confidence, 4),
        location=crop_input.location,
    )


@app.post("/predict-yield", response_model=YieldResponse)
async def predict_yield_endpoint(crop_input: CropInput):
    """
    Predict crop yield (kg/ha) based on soil and weather conditions.
    First recommends a crop, then predicts its yield.
    """
    try:
        data = _merge_weather_with_input(crop_input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        crop_name, _ = predict_crop(data)
        yield_value = predict_yield(data, crop=crop_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {str(e)}")

    return YieldResponse(
        predicted_yield=yield_value,
        crop=crop_name,
        location=crop_input.location,
    )


@app.post("/predict-profit", response_model=ProfitResponse)
async def predict_profit_endpoint(crop_input: CropInput):
    """
    Estimate profit using recommended crop, predicted yield, and mock price/cost data.
    """
    try:
        data = _merge_weather_with_input(crop_input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        crop_name, _ = predict_crop(data)
        yield_value = predict_yield(data, crop=crop_name)
        price = PRICE_DICT.get(crop_name.title(), 20)
        cost = COST_DICT.get(crop_name.title(), 200)
        profit = calculate_profit(yield_value, price, cost)
        revenue = yield_value * price
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {str(e)}")

    return ProfitResponse(
        estimated_profit=profit,
        crop=crop_name,
        predicted_yield=yield_value,
        revenue=revenue,
        cost=cost,
        location=crop_input.location,
    )


@app.post("/detect-disease", response_model=DiseaseResponse)
async def detect_disease_endpoint(file: UploadFile = File(...)):
    """
    Detect crop disease from an uploaded leaf image.
    Accepts common image formats (JPEG, PNG, etc.).
    """
    # Validate file type if provided
    allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a JPEG, PNG, or WebP image.",
        )

    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        disease_name, confidence, treatment_advice = predict_disease(image_bytes)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"Disease model unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Image processing failed. Ensure a valid leaf image. Error: {str(e)}",
        )

    return DiseaseResponse(
        disease_name=disease_name,
        confidence=round(confidence, 4),
        treatment_advice=treatment_advice,
    )


@app.post("/farmer-crop-advisory", response_model=FarmerAdvisoryResponse)
async def farmer_crop_advisory_endpoint(farmer_input: FarmerCropInput):
    """
    Farmer-friendly endpoint that accepts simple inputs and:

    - Auto-detects soil profile by region (with optional manual override)
    - Fetches weather by location (with optional manual override)
    - Builds ML-ready feature dict
    - Calls existing predict_crop / predict_yield / calculate_profit
    - Returns a unified response summarising the advisory.
    """
    try:
        model_input = build_model_input(farmer_input)
    except ValueError as e:
        # Geocoding / weather errors are surfaced as 400 to the frontend
        raise HTTPException(status_code=400, detail=str(e))

    try:
        top_crops_raw = get_top3_advisory(model_input)
        if not top_crops_raw:
            raise ValueError("No crop recommendations generated")
        crop_name = top_crops_raw[0]["crop_name"]
        expected_yield = top_crops_raw[0]["expected_yield"]
        estimated_profit = top_crops_raw[0]["estimated_profit"]
        top_crops = [TopCropEntry(**c) for c in top_crops_raw]
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503, detail=f"ML model unavailable: {str(e)}"
        )

    soil_source = "manual" if farmer_input.manual_soil is not None else "auto-detected"
    weather_source = (
        "farmer"
        if any(
            v is not None
            for v in (
                farmer_input.temperature,
                farmer_input.humidity,
                farmer_input.rainfall,
            )
        )
        else "api"
    )

    return FarmerAdvisoryResponse(
        recommended_crop=crop_name,
        expected_yield=round(float(expected_yield), 2),
        estimated_profit=round(float(estimated_profit), 2),
        top_crops=top_crops,
        soil_source=soil_source,
        weather_source=weather_source,
    )


@app.get("/reverse-geocode")
async def reverse_geocode_endpoint(lat: float, lon: float):
    """
    Convert GPS coordinates to city/village name for location confirmation.
    """
    try:
        location_name = reverse_geocode(lat, lon)
        return {"location": location_name, "lat": lat, "lon": lon}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/farmer-crop-advisory-preview")
async def farmer_crop_advisory_preview_endpoint(farmer_input: FarmerCropInput):
    """
    Preview what data will be used for the recommendation (weather + soil)
    without running the ML model. Use for confirmation step before submitting.
    """
    try:
        model_input = build_model_input(farmer_input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    soil_source = "manual" if farmer_input.manual_soil is not None else "auto-detected"
    weather_source = (
        "farmer"
        if any(
            v is not None
            for v in (
                farmer_input.temperature,
                farmer_input.humidity,
                farmer_input.rainfall,
            )
        )
        else "api"
    )

    return {
        "location": farmer_input.location,
        "weather": {
            "temperature": model_input["temperature"],
            "humidity": model_input["humidity"],
            "rainfall": model_input["rainfall"],
        },
        "soil": {
            "N": model_input["N"],
            "P": model_input["P"],
            "K": model_input["K"],
            "ph": model_input["ph"],
        },
        "soil_source": soil_source,
        "weather_source": weather_source,
    }


# ============ HEALTH CHECK ============

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment and monitoring."""
    return {"status": "healthy", "service": "AgriSense AI"}


@app.get("/")
async def root():
    """Root redirect to docs."""
    return {"message": "AgriSense AI API", "docs": "/docs", "health": "/health"}


# ============ CLI ENTRY POINT ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
