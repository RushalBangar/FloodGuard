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
    gx = vib_x / 16384.0
    gy = vib_y / 16384.0
    gz = vib_z / 16384.0
    
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

def calculate_fire_risk(gas_raw, temperature, humidity, flame_detected):
    """
    Logarithmic Smoke Calculation.
    MQ sensors are exponential.
    """
    # Normalize gas (0-4095 to 0.0-1.0)
    ratio = gas_raw / 4095.0
    
    # Logarithmic curve approximation for MQ sensors
    # PPM increases exponentially as ratio increases
    smoke_factor = math.pow(ratio, 2.5) * 100 
    
    # Heat factor (Standard fire triangle logic)
    # High temp (>45C) + Low humidity (<30%) = Extreme Ignition Risk
    heat_factor = (temperature / 60.0) * 20 + ((100 - humidity) / 100.0) * 10
    
    risk_percentage = smoke_factor + heat_factor
    if flame_detected: risk_percentage += 80
    
    risk_percentage = min(risk_percentage, 100.0)
    
    if risk_percentage < 25: status = "Normal"
    elif risk_percentage < 70: status = "Elevated Smoke"
    else: status = "High Fire Risk"
        
    return {
        "risk_percentage": round(risk_percentage, 2),
        "status": status,
        "smoke_index": round(smoke_factor, 1)
    }
