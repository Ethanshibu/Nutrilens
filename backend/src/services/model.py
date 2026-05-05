import joblib
from pathlib import Path
from typing import Dict, Optional

class NutritionRiskModel:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            model_path = Path(__file__).parent / "models" / "nutrilens_xgb_model.pkl"
        self.model_path = Path(model_path)
        self.model = None
        self.is_loaded = False
        self.feature_order = [
            "age",
            "bmi",
            "sugars",
            "kcal",
            "sodium",
            "saturated_fats",
            "diabetes",
            "heart_disease",
            "hypertension",
            "allergen_match_count",
        ]
        self._load_model()

    def _load_model(self):
        if not self.model_path.exists():
            print(f"⚠️ Model file not found: {self.model_path}")
            return
        try:
            self.model = joblib.load(self.model_path)
            self.is_loaded = True
            print(f"✓ Loaded model from {self.model_path}")
        except Exception as exc:
            print(f"✗ Failed to load model: {exc}")
            self.is_loaded = False

    def predict_risk(self, features: Dict) -> Optional[Dict]:
        if not self.is_loaded or self.model is None:
            print("⚠️ Model not loaded")
            return None
        try:
            row = [features[name] for name in self.feature_order]
            prediction = int(self.model.predict([row])[0])
            categories = {0: "safe", 1: "moderate_risk", 2: "severe_risk"}
            return {
                "risk_level": prediction,
                "risk_category": categories.get(prediction, "unknown"),
            }
        except Exception as exc:
            print(f"✗ Prediction failed: {exc}")
            return None

nutrition_model = NutritionRiskModel()