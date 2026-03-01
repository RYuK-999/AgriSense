"""
Weather API integration using OpenWeather API.
Fetches temperature, humidity, and rainfall for agricultural advisory.
"""

import os
from typing import Dict, Tuple

import requests
from dotenv import load_dotenv

load_dotenv()

# OpenWeather API configuration
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
OPENWEATHER_GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/direct"
OPENWEATHER_REVERSE_GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/reverse"


def _ensure_api_key():
    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY.strip() in (
        "",
        "your_openweather_api_key_here",
    ):
        raise ValueError(
            "OPENWEATHER_API_KEY not set or invalid. Add your key to .env file. "
            "Get a free key at https://openweathermap.org/api"
        )


def _call_weather_api(params: Dict) -> Dict:
    _ensure_api_key()
    try:
        response = requests.get(OPENWEATHER_WEATHER_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        if hasattr(e, "response") and e.response is not None:
            status_code = e.response.status_code
            if status_code == 404:
                raise ValueError("Location not found. Please check the location name.") from e
            if status_code == 401:
                raise ValueError("Invalid OpenWeather API key. Check your .env configuration.") from e
        raise ValueError(f"Weather API request failed: {str(e)}") from e


def fetch_weather(location: str) -> dict:
    """
    Backwards-compatible helper used by existing ML endpoints.

    Fetches weather for a free-text location using the older city-name
    based query. Newer code should prefer get_coordinates() + get_weather().
    """
    data = _call_weather_api(
        {
            "q": location,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric",  # Celsius
        }
    )
    return _extract_weather_fields(data)


def get_coordinates(location: str) -> Tuple[float, float]:
    """
    Geocode a free-text location to (latitude, longitude) using
    the OpenWeather Geocoding API.
    """
    _ensure_api_key()
    try:
        response = requests.get(
            OPENWEATHER_GEOCODE_URL,
            params={
                "q": location,
                "limit": 1,
                "appid": OPENWEATHER_API_KEY,
            },
            timeout=10,
        )
        response.raise_for_status()
        results = response.json()
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Geocoding request failed: {str(e)}") from e

    if not results:
        raise ValueError(f"Location '{location}' not found. Please check the name.")

    first = results[0]
    lat = float(first.get("lat"))
    lon = float(first.get("lon"))
    return lat, lon


def reverse_geocode(lat: float, lon: float) -> str:
    """
    Convert (lat, lon) to a human-readable location name (city/village, state).
    Uses OpenWeather reverse geocoding API.
    """
    _ensure_api_key()
    try:
        response = requests.get(
            OPENWEATHER_REVERSE_GEOCODE_URL,
            params={
                "lat": lat,
                "lon": lon,
                "limit": 1,
                "appid": OPENWEATHER_API_KEY,
            },
            timeout=10,
        )
        response.raise_for_status()
        results = response.json()
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Reverse geocoding failed: {str(e)}") from e

    if not results:
        return f"GPS: {lat:.4f}, {lon:.4f}"

    first = results[0]
    name = first.get("name") or ""
    state = first.get("state") or ""
    if name and state:
        return f"{name}, {state}"
    return name or f"GPS: {lat:.4f}, {lon:.4f}"


def _fetch_forecast_rainfall_24h(lat: float, lon: float) -> float:
    """
    Fetch 5-day forecast and sum rainfall for next 24 hours (first 8 x 3h entries).
    Returns total rainfall in mm. Returns 0.0 on failure or if no rain data.
    """
    _ensure_api_key()
    try:
        response = requests.get(
            OPENWEATHER_FORECAST_URL,
            params={
                "lat": lat,
                "lon": lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        if hasattr(e, "response") and e.response is not None:
            status_code = e.response.status_code
            if status_code == 401:
                raise ValueError("Invalid OpenWeather API key. Check your .env configuration.") from e
        raise ValueError(f"Forecast API request failed: {str(e)}") from e

    items = data.get("list", [])
    total_rain = 0.0
    for entry in items[:8]:  # First 8 x 3h = 24 hours
        rain = entry.get("rain") or {}
        val = rain.get("3h")
        if val is not None:
            total_rain += float(val)
    return round(total_rain, 2)


def get_weather_data(lat: float, lon: float) -> dict:
    """
    Fetch weather for agriculture: current temp/humidity + 24h rainfall from forecast.

    - Temperature and humidity: from Current Weather API.
    - Rainfall: total expected rainfall for next 24h from 5-Day Forecast API
      (sum of rain["3h"] for first 8 forecast entries).

    Returns:
        {"temperature": float, "humidity": float, "rainfall": float}
    """
    _ensure_api_key()

    # 1) Current weather for temperature and humidity
    try:
        response = requests.get(
            OPENWEATHER_WEATHER_URL,
            params={
                "lat": lat,
                "lon": lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",
            },
            timeout=10,
        )
        response.raise_for_status()
        current = response.json()
    except requests.exceptions.RequestException as e:
        if hasattr(e, "response") and e.response is not None:
            status_code = e.response.status_code
            if status_code == 404:
                raise ValueError("Location not found. Please check the location name.") from e
            if status_code == 401:
                raise ValueError("Invalid OpenWeather API key. Check your .env configuration.") from e
        raise ValueError(f"Weather API request failed: {str(e)}") from e

    main_data = current.get("main", {})
    temperature = main_data.get("temp", 25.0)
    humidity = main_data.get("humidity", 70.0)
    if temperature is None:
        temperature = 25.0
    if humidity is None:
        humidity = 70.0

    # 2) 24h rainfall from forecast
    try:
        rainfall = _fetch_forecast_rainfall_24h(lat, lon)
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to get rainfall forecast: {str(e)}") from e

    return {
        "temperature": round(float(temperature), 2),
        "humidity": round(float(humidity), 2),
        "rainfall": rainfall,
    }


def get_weather(lat: float, lon: float) -> dict:
    """
    Fetch weather data for a given (lat, lon).
    Uses get_weather_data: current temp/humidity + 24h rainfall from forecast.
    """
    return get_weather_data(lat, lon)


def _extract_weather_fields(data: Dict) -> Dict:
    """
    Extract temperature, humidity from OpenWeather current-weather response.
    Used by fetch_weather(location) for backward compatibility.
    Rainfall is not available from current weather; use get_weather_data for rainfall.
    """
    main_data = data.get("main", {})
    temperature = main_data.get("temp", 25.0)
    humidity = main_data.get("humidity", 70.0)
    rain_data = data.get("rain", {})
    rainfall = rain_data.get("1h", rain_data.get("3h", 0.0))
    if rainfall is None:
        rainfall = 0.0
    return {
        "temperature": round(float(temperature), 2),
        "humidity": round(float(humidity), 2),
        "rainfall": round(float(rainfall), 2),
    }

