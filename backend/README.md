# AgriSense AI – Intelligent Crop Advisory System

FastAPI backend for crop recommendation, yield prediction, profit estimation, and disease detection.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
python train_models.py
uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000/docs** for Swagger UI.

## Setup

1. **Environment**: Copy `.env` and add your OpenWeather API key:
   ```
   OPENWEATHER_API_KEY=your_key_here
   ```
   Get a free key at: https://openweathermap.org/api

2. **Models**: Run `python train_models.py` to generate `crop_model.pkl`, `yield_model.pkl`, and `disease_model.h5` in `models/`.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict-crop` | Crop recommendation from soil + weather |
| POST | `/predict-yield` | Yield prediction (kg/ha) |
| POST | `/predict-profit` | Profit estimation |
| POST | `/detect-disease` | Disease detection from leaf image |
| GET | `/health` | Health check |

## Project Structure

```
backend/
├── main.py           # FastAPI app & endpoints
├── ml_crop.py        # Crop, yield, profit ML logic
├── ml_disease.py     # Disease detection CNN
├── weather.py        # OpenWeather API integration
├── schemas.py        # Pydantic models
├── train_models.py   # Generate ML models
├── models/           # crop_model.pkl, yield_model.pkl, disease_model.h5
├── requirements.txt
└── .env
```
