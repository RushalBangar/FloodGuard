import math

def calculate_flood_risk(water_level_pct, rainfall_rate, humidity, temperature):
    """
    Scientific Flood Risk based on Hydrology basics.
    - water_level_pct: 0.0 to 1.0 (Current capacity)
    - rainfall_rate: mm/hr
    """
    # Adjust water level based on temperature (evaporation vs condensation factor)
    # At high humidity and low temp, water level is more critical (less evaporation)
    effective_level = water_level_pct * (1.1 if humidity > 80 else 1.0)
    
    # Rainfall intensity factor (20mm/hr is 'Heavy', 50mm/hr is 'Extreme')
    rain_factor = min(rainfall_rate / 60.0, 1.0)
    
    # Risk = 70% Level + 30% Intensity
    risk_percentage = (effective_level * 70) + (rain_factor * 30)
    risk_percentage = min(risk_percentage, 100.0)
    
    if risk_percentage < 30: status = "Normal"
    elif risk_percentage < 65: status = "Advisory"
    else: status = "Danger"
    
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status,
        "recommendation": "Stay safe!"
    }

def calculate_quake_risk(vib_x, vib_y, vib_z, shock_alert):
    """
    Converts MPU6050 Raw to G-Force (assuming +/- 2g range)
    16384 LSB/g is the standard sensitivity.
    """
    # Convert to G-force
    gx = vib_x 
    gy = vib_y 
    gz = vib_z 
    
    # Resultant Acceleration (Vector Sum)
    # Normal gravity is 1.0g. We subtract 1.0 to get 'Excess Acceleration'
    total_g = math.sqrt(gx**2 + gy**2 + gz**2)
    excess_g = abs(total_g - 1.0)
    
    # Mercalli Scale approximation: 0.1g is 'Strong', 0.5g is 'Violent'
    risk_percentage = min(excess_g * 200, 100.0)
    if shock_alert: risk_percentage = max(risk_percentage, 75.0)
    
    if risk_percentage < 15: status = "Normal"
    elif risk_percentage < 50: status = "Moderate Tremor"
    else: status = "Structural Threat"
        
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status,
        "acceleration_g": round(excess_g, 3)
    }

def calculate_fire_risk(gas_val, temperature, humidity, flame_detected):
    """
    Logarithmic Smoke Calculation.
    Accepts gas_val as raw (0-4095) or ppm (0-2000).
    """
    # If the value is very high (>2000), it's likely raw ADC data (0-4095)
    # If the value is low (<2000), it's either raw or already mapped. 
    # We treat everything as raw if it comes from the ESP32.
    ratio = min(gas_val / 4095.0, 1.0)
    
    # Improved Logarithmic curve
    # At ratio 0.2 (raw ~800), smoke_factor is small (~1.7)
    # At ratio 0.5 (raw ~2000), smoke_factor is moderate (~17)
    # At ratio 0.8 (raw ~3200), smoke_factor is high (~57)
    smoke_factor = math.pow(ratio, 2.5) * 100 
    
    # Heat factor (Normal temp is 25-35C, Normal humidity is 40-60%)
    # Only contributes significantly if temp > 40 or humidity < 20
    temp_score = max(0, (temperature - 30) / 30.0) * 20
    hum_score = max(0, (40 - humidity) / 40.0) * 10
    
    risk_percentage = smoke_factor + temp_score + hum_score
    if flame_detected: risk_percentage += 80
    
    risk_percentage = min(risk_percentage, 100.0)
    
    if risk_percentage < 25: status = "Normal"
    elif risk_percentage < 60: status = "Elevated Smoke"
    else: status = "High Fire Risk"
        
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status,
        "smoke_index": round(smoke_factor, 1)
    }
