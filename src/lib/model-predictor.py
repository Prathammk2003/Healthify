import sys
import json
import numpy as np
import joblib
import tensorflow as tf
import os

def load_and_predict(model_path, scaler_path, input_data, model_type="sklearn"):
    """
    Load a model and make predictions
    
    Args:
        model_path (str): Path to the model file
        scaler_path (str): Path to the scaler file (optional)
        input_data (list): Input data for prediction
        model_type (str): Type of model ("sklearn", "tensorflow", "keras")
    
    Returns:
        dict: Prediction results
    """
    try:
        print(f"🔍 Loading model from {model_path}", file=sys.stderr)
        # Convert input data to numpy array
        input_array = np.array(input_data)
        print(f"📊 Input data shape: {input_array.shape}", file=sys.stderr)
        if len(input_array.shape) == 1:
            input_array = input_array.reshape(1, -1)
            print(f"🔄 Reshaped input data to: {input_array.shape}", file=sys.stderr)
        
        # Load scaler if provided
        if scaler_path and scaler_path != "none" and os.path.exists(scaler_path):
            try:
                print(f"🔍 Loading scaler from {scaler_path}", file=sys.stderr)
                scaler = joblib.load(scaler_path)
                # Safeguard: only scale if feature dims match
                expected_features = getattr(scaler, 'n_features_in_', None)
                if expected_features is not None and expected_features != input_array.shape[1]:
                    print(f"⚠️  Scaler expects {expected_features} features, but input has {input_array.shape[1]}. Skipping scaling.", file=sys.stderr)
                else:
                    input_array = scaler.transform(input_array)
                    print(f"✅ Data scaled", file=sys.stderr)
            except Exception as e:
                print(f"⚠️  Warning: Could not load scaler: {e}", file=sys.stderr)
        else:
            print("⏭️  Skipping scaler (not provided or not found)", file=sys.stderr)
        
        # Load model based on type
        if model_type == "sklearn":
            print(f"🔍 Loading scikit-learn model from {model_path}", file=sys.stderr)
            model = joblib.load(model_path)
            print(f"✅ scikit-learn model loaded", file=sys.stderr)
        elif model_type in ["tensorflow", "keras"]:
            print(f"🔍 Loading TensorFlow/Keras model from {model_path}", file=sys.stderr)
            model = tf.keras.models.load_model(model_path)
            print(f"✅ TensorFlow/Keras model loaded", file=sys.stderr)
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        # Make prediction
        print("🔮 Making prediction...", file=sys.stderr)
        if hasattr(model, 'predict_proba'):
            # For models with probability prediction
            probabilities = model.predict_proba(input_array)
            predictions = model.predict(input_array)
            result = {
                "predictions": predictions.tolist(),
                "probabilities": probabilities.tolist()
            }
            print(f"✅ Prediction completed with probabilities", file=sys.stderr)
        else:
            # For models without probability prediction
            predictions = model.predict(input_array)
            result = {
                "predictions": predictions.tolist()
            }
            
            # If it's a neural network, try to get probabilities
            if len(predictions.shape) > 1 and predictions.shape[1] > 1:
                result["probabilities"] = predictions.tolist()
                print(f"✅ Prediction completed with probabilities", file=sys.stderr)
            else:
                print(f"✅ Prediction completed", file=sys.stderr)
        
        return result
        
    except Exception as e:
        print(f"❌ Error in prediction: {str(e)}", file=sys.stderr)
        raise e

if __name__ == "__main__":
    print("🚀 Starting model predictor script", file=sys.stderr)
    if len(sys.argv) < 4:
        print("Usage: python model-predictor.py <model_path> <scaler_path> <input_data_json> [model_type]", file=sys.stderr)
        sys.exit(1)
    
    model_path = sys.argv[1]
    scaler_path = sys.argv[2] if sys.argv[2].lower() != "none" else None
    input_data_json = sys.argv[3]
    model_type = sys.argv[4] if len(sys.argv) > 4 else "sklearn"
    
    print(f"📁 Model path: {model_path}", file=sys.stderr)
    print(f"📁 Scaler path: {scaler_path}", file=sys.stderr)
    print(f"📊 Model type: {model_type}", file=sys.stderr)
    
    # Parse input data
    print(f"📥 Input data JSON: {input_data_json}", file=sys.stderr)
    input_data = json.loads(input_data_json)
    print(f"🔢 Parsed input data: {input_data}", file=sys.stderr)
    
    # Make prediction
    print("⚙️  Starting prediction process", file=sys.stderr)
    result = load_and_predict(model_path, scaler_path, input_data, model_type)
    
    # Output result as JSON
    print("📤 Outputting result as JSON", file=sys.stderr)
    print(json.dumps(result))
    print("🏁 Script completed", file=sys.stderr)