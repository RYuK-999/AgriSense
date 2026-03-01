"""
ML module for crop disease detection using YOLOv8 classification.
Processes uploaded leaf images and returns disease name with treatment advice.
"""

import io
from pathlib import Path

# Model and classes paths
MODEL_PATH = Path(__file__).parent / "models" / "best.pt"
CLASSES_PATH = Path(__file__).parent / "models" / "classes.txt"

# Model cache
_disease_model = None
_class_names = None


# Treatment advice for common diseases (mapped from class names)
TREATMENT_ADVICE = {
    "apple_scab": {
        "immediate": "Remove and destroy infected leaves and fruit.",
        "long_term": "Apply fungicide (captan, mancozeb) during wet periods.",
        "prevention": "Use resistant varieties. Improve air circulation by pruning.",
    },
    "black_rot": {
        "immediate": "Remove mummified fruit and infected branches.",
        "long_term": "Apply fungicide sprays from bud break to harvest.",
        "prevention": "Maintain good sanitation. Remove fallen debris.",
    },
    "cedar_apple_rust": {
        "immediate": "Apply fungicide when orange spore masses appear.",
        "long_term": "Remove nearby cedar/juniper trees if possible.",
        "prevention": "Plant rust-resistant apple varieties.",
    },
    "powdery_mildew": {
        "immediate": "Apply sulfur-based or neem oil fungicide.",
        "long_term": "Reduce humidity. Increase sunlight exposure.",
        "prevention": "Plant resistant varieties. Ensure proper spacing.",
    },
    "cercospora_leaf_spot": {
        "immediate": "Remove infected leaves. Apply fungicide.",
        "long_term": "Rotate crops. Use resistant hybrids.",
        "prevention": "Avoid overhead irrigation. Maintain proper spacing.",
    },
    "gray_leaf_spot": {
        "immediate": "Apply foliar fungicide if infection is early.",
        "long_term": "Use resistant corn hybrids.",
        "prevention": "Rotate crops. Till under crop residue.",
    },
    "common_rust": {
        "immediate": "Apply fungicide if rust pustules are spreading.",
        "long_term": "Plant resistant hybrids.",
        "prevention": "Early planting to avoid peak rust season.",
    },
    "northern_leaf_blight": {
        "immediate": "Apply fungicide at first sign of lesions.",
        "long_term": "Use resistant corn varieties.",
        "prevention": "Crop rotation. Residue management.",
    },
    "esca": {
        "immediate": "Prune infected wood. Apply wound protectant.",
        "long_term": "Remove severely infected vines.",
        "prevention": "Avoid large pruning wounds. Use clean tools.",
    },
    "leaf_blight": {
        "immediate": "Remove and destroy affected leaves.",
        "long_term": "Apply copper-based fungicide.",
        "prevention": "Use resistant varieties. Avoid overhead irrigation.",
    },
    "citrus_greening": {
        "immediate": "Remove and destroy infected trees to prevent spread.",
        "long_term": "Control Asian citrus psyllid population.",
        "prevention": "Use certified disease-free nursery stock.",
    },
    "bacterial_spot": {
        "immediate": "Remove infected plant parts. Apply copper bactericide.",
        "long_term": "Avoid working in wet fields. Sanitize tools.",
        "prevention": "Use certified disease-free seeds. Crop rotation.",
    },
    "early_blight": {
        "immediate": "Remove infected lower leaves. Apply fungicide.",
        "long_term": "Improve air circulation. Mulch around plants.",
        "prevention": "Use resistant varieties. Rotate crops.",
    },
    "late_blight": {
        "immediate": "Remove and destroy all infected plant material.",
        "long_term": "Apply preventive fungicide in humid conditions.",
        "prevention": "Use certified seed. Avoid overhead irrigation.",
    },
    "leaf_mold": {
        "immediate": "Improve ventilation. Apply fungicide.",
        "long_term": "Reduce humidity in greenhouse.",
        "prevention": "Use resistant varieties. Space plants properly.",
    },
    "septoria_leaf_spot": {
        "immediate": "Remove infected leaves. Apply fungicide.",
        "long_term": "Mulch to prevent soil splash.",
        "prevention": "Crop rotation. Use disease-free seeds.",
    },
    "spider_mites": {
        "immediate": "Spray plants with water to dislodge mites.",
        "long_term": "Apply miticide or insecticidal soap.",
        "prevention": "Maintain plant health. Encourage natural predators.",
    },
    "target_spot": {
        "immediate": "Remove infected leaves. Apply fungicide.",
        "long_term": "Improve air circulation.",
        "prevention": "Rotate crops. Use resistant varieties.",
    },
    "mosaic_virus": {
        "immediate": "Remove and destroy infected plants immediately.",
        "long_term": "Control aphid vectors with insecticide.",
        "prevention": "Use virus-free seeds. Control weeds.",
    },
    "leaf_scorch": {
        "immediate": "Remove severely scorched leaves.",
        "long_term": "Ensure adequate watering during dry periods.",
        "prevention": "Mulch to retain moisture. Avoid salt buildup.",
    },
    "healthy": {
        "immediate": "No action required. Continue regular monitoring.",
        "long_term": "Maintain good irrigation and nutrient levels.",
        "prevention": "Regular crop rotation and soil health management.",
    },
    "default": {
        "immediate": "Isolate affected plants. Consult local agricultural extension.",
        "long_term": "Improve overall plant health through balanced fertilization.",
        "prevention": "Regular scouting and early detection.",
    },
}


def _load_class_names():
    """Load class names from classes.txt."""
    global _class_names
    if _class_names is None:
        if not CLASSES_PATH.exists():
            raise FileNotFoundError(f"Classes file not found at {CLASSES_PATH}")
        with open(CLASSES_PATH, "r") as f:
            _class_names = [line.strip() for line in f if line.strip()]
    return _class_names


def _load_disease_model():
    """Load YOLOv8 classification model."""
    global _disease_model
    if _disease_model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Disease model not found at {MODEL_PATH}. "
                "Place best.pt in backend/models/."
            )
        from ultralytics import YOLO
        _disease_model = YOLO(str(MODEL_PATH))
    return _disease_model


def _get_treatment_key(class_name: str) -> str:
    """
    Convert class name like 'Apple___Apple_scab' to treatment key like 'apple_scab'.
    """
    lower = class_name.lower()
    if "healthy" in lower:
        return "healthy"
    if "apple_scab" in lower or "scab" in lower:
        return "apple_scab"
    if "black_rot" in lower:
        return "black_rot"
    if "cedar_apple_rust" in lower:
        return "cedar_apple_rust"
    if "powdery_mildew" in lower:
        return "powdery_mildew"
    if "cercospora" in lower or "gray_leaf_spot" in lower:
        return "cercospora_leaf_spot"
    if "common_rust" in lower:
        return "common_rust"
    if "northern_leaf_blight" in lower:
        return "northern_leaf_blight"
    if "esca" in lower or "black_measles" in lower:
        return "esca"
    if "leaf_blight" in lower or "isariopsis" in lower:
        return "leaf_blight"
    if "citrus_greening" in lower or "haunglongbing" in lower:
        return "citrus_greening"
    if "bacterial_spot" in lower:
        return "bacterial_spot"
    if "early_blight" in lower:
        return "early_blight"
    if "late_blight" in lower:
        return "late_blight"
    if "leaf_mold" in lower:
        return "leaf_mold"
    if "septoria" in lower:
        return "septoria_leaf_spot"
    if "spider_mite" in lower:
        return "spider_mites"
    if "target_spot" in lower:
        return "target_spot"
    if "mosaic_virus" in lower:
        return "mosaic_virus"
    if "leaf_scorch" in lower:
        return "leaf_scorch"
    return "default"


def predict_disease(image_bytes: bytes) -> tuple[str, float, dict]:
    """
    Predict disease from leaf image using YOLOv8 classification.

    Args:
        image_bytes: Raw image file bytes (JPEG, PNG, etc.)

    Returns:
        Tuple of (disease_name, confidence, treatment_advice_dict)
    """
    from PIL import Image

    model = _load_disease_model()
    class_names = _load_class_names()

    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    results = model.predict(img, verbose=False)
    result = results[0]

    probs = result.probs
    if probs is None:
        raise ValueError("Model did not return classification probabilities")

    top1_idx = int(probs.top1)
    confidence = float(probs.top1conf)

    if top1_idx < len(class_names):
        disease_name = class_names[top1_idx]
    else:
        disease_name = f"class_{top1_idx}"

    treatment_key = _get_treatment_key(disease_name)
    treatment = TREATMENT_ADVICE.get(treatment_key, TREATMENT_ADVICE["default"])

    return disease_name, confidence, treatment
