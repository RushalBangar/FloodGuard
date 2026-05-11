(function(){
  const i18n = {
      en: {
          nav_dashboard: "Dashboard", nav_flood: "Flood Guard", nav_quake: "QuakeShield", nav_fire: "Wildfire Guard", nav_safe_routes: "Safe Routes", nav_rescue: "Rescue",
          hero_title: "Life Guard", hero_tagline: "INTEGRATED IOT & AI BASED DISASTER MANAGEMENT SYSTEM",
          hero_flood_title: "Flood Guard", hero_flood_tagline: "AI-DRIVEN FLOOD PREDICTION & EMERGENCY RESPONSE",
          hero_map_title: "Escape Navigation", hero_map_tagline: "OPTIMIZED EVACUATION PATHS BASED ON AI RISK LEVELS",
          hero_rescue_title: "Rescue Operations Center", hero_rescue_tagline: "REAL-TIME SOS TRACKING & HEATMAP VISUALIZATION",
          card_risk_title: "AI Risk Prediction", status_standby: "System Standby",
          card_sensor_title: "Live Sensor Matrix", label_water_level: "Water Level", label_temp: "Temperature", label_humidity: "Humidity", label_rainfall: "Rainfall Forecast",
          btn_test_alert: "Test Alert", btn_share_location: "Share Location", btn_stop_sharing: "Stop Sharing", btn_locate: "Find Safe Routes",
          card_weather_title: "Atmospheric Data", weather_loading: "Loading weather data...",
          card_alert_title: "Emergency Broadcasts", form_sos_title: "Request Emergency Assistance", placeholder_name: "Your Name", btn_sos: "SEND SOS",
          sidebar_sos_title: "Active SOS Signals"
      },
      hi: {
          nav_dashboard: "डैशबोर्ड", nav_flood: "फ्लड गार्ड", nav_quake: "क्वेकशील्ड", nav_fire: "वाइल्डफायर गार्ड", nav_safe_routes: "सुरक्षित मार्ग", nav_rescue: "बचाव",
          hero_title: "लाइफ गार्ड", hero_tagline: "एकीकृत आईओटी और एआई आधारित आपदा प्रबंधन प्रणाली",
          hero_flood_title: "फ्लडगार्ड", hero_flood_tagline: "एआई-संचालित बाढ़ भविष्यवाणी और आपातकालीन प्रतिक्रिया",
          hero_map_title: "एस्केप नेविगेशन", hero_map_tagline: "एआई जोखिम स्तरों के आधार पर अनुकूलित निकासी मार्ग",
          hero_rescue_title: "बचाव अभियान केंद्र", hero_rescue_tagline: "रीयल-टाइम एसओएस ट्रैकिंग और हीटमैप विज़ुअलाइज़ेशन",
          card_risk_title: "एआई जोखिम भविष्यवाणी", status_standby: "सिस्टम स्टैंडबाय",
          card_sensor_title: "लाइव सेंसर मैट्रिक्स", label_water_level: "जल स्तर", label_temp: "तापमान", label_humidity: "नमी", label_rainfall: "वर्षा का पूर्वानुमान",
          btn_test_alert: "परीक्षण अलर्ट", btn_share_location: "स्थान साझा करें", btn_stop_sharing: "साझा करना बंद करें", btn_locate: "सुरक्षित मार्ग खोजें",
          card_weather_title: "वायुमंडलीय डेटा", weather_loading: "मौसम डेटा लोड हो रहा है...",
          card_alert_title: "आपातकालीन प्रसारण", form_sos_title: "आपातकालीन सहायता का अनुरोध करें", placeholder_name: "आपका नाम", btn_sos: "एसओएस भेजें",
          sidebar_sos_title: "सक्रिय एसओएस संकेत"
      },
      mr: {
          nav_dashboard: "डॅशबोर्ड", nav_flood: "फ्लड गार्ड", nav_quake: "क्वेकशील्ड", nav_fire: "वाइल्डफायर गार्ड", nav_safe_routes: "सुरक्षित मार्ग", nav_rescue: "बचाव",
          hero_title: "लाइफ गार्ड", hero_tagline: "एकात्मिक आयओटी आणि एआय आधारित आपत्ती व्यवस्थापन प्रणाली",
          hero_flood_title: "फ्लडगार्ड", hero_flood_tagline: "एआय-आधारित पूर अंदाज आणि आपत्कालीन प्रतिसाद",
          hero_map_title: "एस्केप नेव्हिगेशन", hero_map_tagline: "एआय जोखीम स्तरांवर आधारित इष्टतम निर्वासन मार्ग",
          hero_rescue_title: "बचाव कार्य केंद्र", hero_rescue_tagline: "रिअल-टाइम एसओएस ट्रॅकिंग आणि हीटमॅप व्हिज्युअलायझेशन",
          card_risk_title: "एआय जोखीम अंदाज", status_standby: "सिस्टम स्टँडबाय",
          card_sensor_title: "थेट सेन्सर मॅट्रिक्स", label_water_level: "पाण्याची पातळी", label_temp: "तापमान", label_humidity: "दमटपणा", label_rainfall: "पावसाचा अंदाज",
          btn_test_alert: "चाचणी अलर्ट", btn_share_location: "स्थान शेअर करा", btn_stop_sharing: "शेअर करणे थांबवा", btn_locate: "सुरक्षित मार्ग शोधा",
          card_weather_title: "वातावरण डेटा", weather_loading: "हवामान डेटा लोड होत आहे...",
          card_alert_title: "आणीबाणीचे प्रसारण", form_sos_title: "आणीबाणीच्या मदतीसाठी विनंती करा", placeholder_name: "तुमचे नाव", btn_sos: "एसओएस पाठवा",
          sidebar_sos_title: "सक्रिय एसओएस सिग्नल"
      }
  };

  window.setLang = function(lang) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          if (i18n[lang] && i18n[lang][key]) el.textContent = i18n[lang][key];
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
          const key = el.getAttribute('data-i18n-placeholder');
          if (i18n[lang] && i18n[lang][key]) el.placeholder = i18n[lang][key];
      });
      document.querySelectorAll('.lang-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${lang}'`));
      });
  };

  // Initial language application
  document.addEventListener('DOMContentLoaded', () => {
      const currentLang = localStorage.getItem('selectedLang') || 'en';
      window.setLang(currentLang);
  });
})();
