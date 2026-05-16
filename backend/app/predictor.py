import math

def calculate_flood_risk(water_level, rainfall_rate, humidity, temperature):
    """
    Simulates an AI model predicting flood risk.
    Inputs:
    - water_level (0.0 to 1.0, representing percentage of capacity)
    - rainfall_rate (mm/hr)
    - humidity (%)
    - temperature (C)
    
    Returns:
    - risk_percentage (0.0 to 100.0)
    - status (Normal, Advisory, Danger)
    """
    
    # Weights for our 'proper' AI model
    w_water = 0.6
    w_rain = 0.3
    w_weather = 0.1
    
    # Normalize rainfall rate (assuming 50mm/hr is extremely high)
    norm_rain = min(rainfall_rate / 50.0, 1.0)
    
    # Weather factor: high humidity and moderate temp increases risk (storm conditions)
    weather_factor = (humidity / 100.0) * (1.0 if 15 < temperature < 35 else 0.5)
    
    risk_score = (water_level * w_water) + (norm_rain * w_rain) + (weather_factor * w_weather)
    risk_percentage = min(risk_score * 100.0, 100.0)
    
    if risk_percentage < 30:
        status = "Normal"
    elif risk_percentage < 70:
        status = "Advisory"
    else:
        status = "Danger"
    
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status,
        "recommendation": get_recommendation(status)
    }

def get_recommendation(status):
    if status == "Normal":
        return "No immediate action required. Stay tuned for updates."
    elif status == "Advisory":
        return "Prepare for potential rising waters. Secure valuables."
    else:
        return "IMMEDIATE EVACUATION ADVISED. Follow safe routes on the map."

def calculate_quake_risk(vib_x, vib_y, vib_z, shock_alert):
    # Mock AI calculation for earthquake
    magnitude = math.sqrt(vib_x**2 + vib_y**2 + vib_z**2)
    risk_score = magnitude * 10
    if shock_alert:
        risk_score += 50
    risk_percentage = min(risk_score, 100.0)
    
    if risk_percentage < 30:
        status = "Normal"
    elif risk_percentage < 70:
        status = "Moderate Tremor"
    else:
        status = "Structural Threat"
        
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status
    }

def calculate_fire_risk(gas_ppm, temperature, humidity, flame_detected):
    # Adjusted for ESP32 12-bit ADC (0-4095)
    # Subtracting a baseline of 300 to ignore normal air fluctuations
    normalized_gas = max(0, (gas_ppm - 300) / 3700.0)
    
    risk_score = (normalized_gas * 60) + (temperature / 60.0) * 20 + ((100 - humidity) / 100.0) * 10
    
    if flame_detected:
        risk_score += 80 # Heavy priority on actual fire
        
    risk_percentage = min(risk_score, 100.0)
    
    if risk_percentage < 35:
        status = "Normal"
    elif risk_percentage < 75:
        status = "Elevated Smoke"
    else:
        status = "High Fire Risk"
        
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status
    }
