import joblib
import shap
import numpy as np
from pathlib import Path
from typing import Dict, Optional, List

class NutritionRiskModel:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            model_path = Path(__file__).parent / "models" / "nutrilens_xgb_model.pkl"
        self.model_path = Path(model_path)
        self.model = None
        self.explainer = None
        self.is_loaded = False
        self.feature_order = [
            "age", "bmi", "sugars", "kcal", "sodium", "saturated_fats", 
            "diabetes", "heart_disease", "hypertension", "allergen_match_count"
        ]
        self._load_model()

    def _load_model(self):
        if not self.model_path.exists():
            print(f"⚠️ Model file not found: {self.model_path}")
            return
        try:
            self.model = joblib.load(self.model_path)
            self.explainer = shap.TreeExplainer(self.model)
            self.is_loaded = True
            print(f"✓ Loaded model from {self.model_path}")
        except Exception as exc:
            print(f"✗ Failed to load model: {exc}")
            self.is_loaded = False

    def predict_risk(self, features: Dict) -> Optional[Dict]:
        if not self.is_loaded or self.model is None:
            print("⚠️ Model not loaded")
            return None
            
        # 1. SANITIZE INPUTS (This prevents the truth value array error)
        try:
            clean_row = []
            for name in self.feature_order:
                val = features.get(name, 0.0) # Default to 0.0 if missing
                
                # If the LLM accidentally sent a list like [22] instead of 22, pull the number out
                if isinstance(val, (list, tuple, np.ndarray)):
                    val = val[0]
                    
                clean_row.append(float(val))
                
            # Create a strict 2D numpy array for XGBoost
            X_input = np.array([clean_row], dtype=float)
            
            # Predict the core risk score
            prediction_array = self.model.predict(X_input)
            prediction = int(prediction_array[0])
            categories = {0: "safe", 1: "moderate_risk", 2: "severe_risk"}
            
            base_result = {
                "risk_level": prediction,
                "risk_category": categories.get(prediction, "unknown"),
                "shap_values": [] 
            }
        except Exception as exc:
            # Notice the new error string. If you don't see "💥 CORE PREDICTION CRASHED" 
            # in your terminal next time it breaks, your server isn't reloading the file.
            print(f"💥 CORE PREDICTION CRASHED: {exc}")
            return None

        # 2. RUN SHAP IN ISOLATION
        try:
            base_result["shap_values"] = self._explain_prediction(clean_row, prediction)
        except Exception as exc:
            print(f"⚠️ SHAP CRASHED (Bypassed so UI stays alive): {exc}")
            
        return base_result

    def _explain_prediction(self, row_values: list, prediction: int) -> List[Dict]:
        if self.explainer is None:
            return []
            
        X_array = np.array([row_values], dtype=float)
        shap_vals = self.explainer.shap_values(X_array)
        
        # Safely extract numbers regardless of array shape
        if isinstance(shap_vals, list):
            feature_impacts = np.array(shap_vals[prediction]).flatten()
        else:
            shap_array = np.array(shap_vals)
            if len(shap_array.shape) == 3:
                feature_impacts = shap_array[0, :, prediction].flatten()
            elif len(shap_array.shape) == 2:
                feature_impacts = shap_array[0].flatten()
            else:
                feature_impacts = shap_array.flatten()
                
        explanation = []
        for i, feature_name in enumerate(self.feature_order):
            impact = float(feature_impacts[i])
            if abs(impact) > 0.001: 
                explanation.append({
                    "feature": feature_name.replace("_", " ").title(),
                    "value": float(row_values[i]),
                    "impact": impact
                })
        
        explanation.sort(key=lambda x: abs(x["impact"]), reverse=True)
        return explanation

nutrition_model = NutritionRiskModel()