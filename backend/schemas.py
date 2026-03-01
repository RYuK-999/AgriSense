"""
Pydantic schemas for AgriSense AI API validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ============ INPUT SCHEMAS ============

class CropInput(BaseModel):
    """Input schema for crop and yield prediction endpoints."""
    N: float = Field(..., description="Nitrogen content in soil", ge=0, le=140)
    P: float = Field(..., description="Phosphorus content in soil", ge=0, le=145)
    K: float = Field(..., description="Potassium content in soil", ge=0, le=205)
    ph: float = Field(..., description="Soil pH level", ge=3.5, le=9.5)
    location: str = Field(..., description="Location/city name for weather data", min_length=1)

    model_config = {"json_schema_extra": {"example": {"N": 90, "P": 42, "K": 43, "ph": 6.5, "location": "Mumbai"}}}


# ============ FARMER-FRIENDLY INPUT SCHEMA ============


class ManualSoil(BaseModel):
    """Optional manual soil measurements provided by farmer."""

    N: float = Field(..., description="Nitrogen content in soil", ge=0, le=140)
    P: float = Field(..., description="Phosphorus content in soil", ge=0, le=145)
    K: float = Field(..., description="Potassium content in soil", ge=0, le=205)
    ph: float = Field(..., description="Soil pH level", ge=3.5, le=9.5)


class FarmerCropInput(BaseModel):
    """
    Farmer-friendly input used by /farmer-crop-advisory.

    This schema keeps fields understandable to farmers while still allowing
    the backend to auto-detect or infer the ML-ready features.
    """

    location: str = Field(..., description="Village / district / region", min_length=1)
    previous_crop: Optional[str] = Field(
        default=None, description="Previous crop grown on this land (if known)"
    )
    land_size: Optional[float] = Field(
        default=None, description="Land area in acres", ge=0
    )
    irrigation_type: Optional[str] = Field(
        default=None,
        description="Irrigation type such as Rainfed, Canal Irrigation, Drip Irrigation, Borewell",
    )
    goal: Optional[str] = Field(
        default=None,
        description="Farmer goal, e.g. Maximum Profit / Soil Sustainability / Low Risk Crop",
    )

    # Optional weather overrides – when omitted, backend uses API values.
    temperature: Optional[float] = Field(
        default=None, description="Temperature in °C (optional manual override)"
    )
    humidity: Optional[float] = Field(
        default=None, description="Relative humidity in % (optional manual override)"
    )
    rainfall: Optional[float] = Field(
        default=None, description="Rainfall in mm (optional manual override)"
    )

    # Optional manual soil values (N, P, K, pH).
    manual_soil: Optional[ManualSoil] = Field(
        default=None,
        description="Optional manual soil test values; if omitted, backend uses region-based defaults.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "location": "Nashik, Maharashtra",
                "previous_crop": "Wheat",
                "land_size": 3.5,
                "irrigation_type": "Drip Irrigation",
                "goal": "Maximum Profit",
                "temperature": None,
                "humidity": None,
                "rainfall": None,
                "manual_soil": {
                    "N": 80,
                    "P": 40,
                    "K": 35,
                    "ph": 6.8,
                },
            }
        }
    }


# ============ RESPONSE SCHEMAS ============

class CropResponse(BaseModel):
    """Response schema for crop recommendation endpoint."""
    recommended_crop: str
    confidence: float
    location: str
    message: str = "Crop recommendation generated successfully"

    model_config = {"json_schema_extra": {"example": {"recommended_crop": "rice", "confidence": 0.92, "location": "Mumbai", "message": "Crop recommendation generated successfully"}}}


class YieldResponse(BaseModel):
    """Response schema for yield prediction endpoint."""
    predicted_yield: float
    unit: str = "kg/ha"
    crop: str
    location: str
    message: str = "Yield prediction generated successfully"

    model_config = {"json_schema_extra": {"example": {"predicted_yield": 4500.5, "unit": "kg/ha", "crop": "rice", "location": "Mumbai", "message": "Yield prediction generated successfully"}}}


class ProfitResponse(BaseModel):
    """Response schema for profit estimation endpoint."""
    estimated_profit: float
    currency: str = "INR"
    crop: str
    predicted_yield: float
    revenue: float
    cost: float
    location: str
    message: str = "Profit estimation generated successfully"

    model_config = {"json_schema_extra": {"example": {"estimated_profit": 125000.0, "currency": "INR", "crop": "rice", "predicted_yield": 4500.0, "revenue": 225000.0, "cost": 100000.0, "location": "Mumbai", "message": "Profit estimation generated successfully"}}}


class DiseaseResponse(BaseModel):
    """Response schema for disease detection endpoint."""
    disease_name: str
    confidence: float
    treatment_advice: dict
    message: str = "Disease detection completed successfully"

    model_config = {"json_schema_extra": {"example": {"disease_name": "Leaf Blight", "confidence": 0.87, "treatment_advice": {"immediate": "Remove affected leaves", "long_term": "Apply fungicide"}, "message": "Disease detection completed successfully"}}}


class TopCropEntry(BaseModel):
    """One of the top 3 recommended crops with yield and profit."""
    crop_name: str
    expected_yield: float
    estimated_profit: float


class FarmerAdvisoryResponse(BaseModel):
    """
    Unified response for /farmer-crop-advisory.

    Includes top 3 recommended crops with full details; first is the primary recommendation.
    """
    recommended_crop: str
    expected_yield: float
    estimated_profit: float
    top_crops: list[TopCropEntry]  # All 3 crops, first = highly recommended
    soil_source: str  # "manual" | "auto-detected"
    weather_source: str  # "api" | "farmer"

    model_config = {
        "json_schema_extra": {
            "example": {
                "recommended_crop": "rice",
                "expected_yield": 4.8,
                "estimated_profit": 120000.0,
                "top_crops": [
                    {"crop_name": "Rice", "expected_yield": 50.0, "estimated_profit": 120000.0},
                    {"crop_name": "Wheat", "expected_yield": 45.0, "estimated_profit": 95000.0},
                    {"crop_name": "Maize", "expected_yield": 38.0, "estimated_profit": 78000.0},
                ],
                "soil_source": "auto-detected",
                "weather_source": "api",
            }
        }
    }
