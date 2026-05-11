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
          sidebar_sos_title: "Active SOS Signals",
          section_how_title: "Intelligent Disaster Management", section_how_subtitle: "How Life Guard protects communities through AI & IoT",
          step1_title: "Real-time Sensing", step1_text: "Distributed IoT sensors monitor water levels, tremors, and atmospheric gas levels 24/7 across critical nodes.",
          step2_title: "AI Risk Analysis", step2_text: "Our proprietary machine learning models analyze sensor data streams to predict disaster probability with high precision.",
          step3_title: "Automated Response", step3_text: "System instantly triggers emergency broadcasts, SOS protocols, and dynamic evacuation routing for at-risk areas."
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
          sidebar_sos_title: "सक्रिय एसओएस संकेत",
          section_how_title: "बुद्धिमान आपदा प्रबंधन", section_how_subtitle: "लाइफ गार्ड एआई और आईओटी के माध्यम से समुदायों की रक्षा कैसे करता है",
          step1_title: "रियल-टाइम सेंसिंग", step1_text: "वितरित आईओटी सेंसर महत्वपूर्ण नोड्स पर 24/7 जल स्तर, झटके और वायुमंडलीय गैस के स्तर की निगरानी करते हैं।",
          step2_title: "एआई जोखिम विश्लेषण", step2_text: "हमारे मालिकाना मशीन लर्निंग मॉडल उच्च सटीकता के साथ आपदा की संभावना का अनुमान लगाने के लिए सेंसर डेटा स्ट्रीम का विश्लेषण करते हैं।",
          step3_title: "स्वचालित प्रतिक्रिया", step3_text: "सिस्टम तुरंत आपातकालीन प्रसारण, एसओएस प्रोटोकॉल और जोखिम वाले क्षेत्रों के लिए गतिशील निकासी मार्ग को ट्रिगर करता है।"
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
          sidebar_sos_title: "सक्रिय एसओएस सिग्नल",
          section_how_title: "बुद्धिमान आपत्ती व्यवस्थापन", section_how_subtitle: "लाइफ गार्ड एआय आणि आयओटी द्वारे समुदायांचे संरक्षण कसे करते",
          step1_title: "रिअल-टाइम सेन्सिंग", step1_text: "वितरित आयओटी सेन्सर्स महत्त्वाच्या नोड्सवर २४/७ पाण्याची पातळी, हादरे आणि वातावरणातील वायूच्या पातळीवर लक्ष ठेवतात।",
          step2_title: "एआय जोखीम विश्लेषण", step2_text: "आमचे प्रोप्रायटरी मशीन लर्निंग मॉडेल्स उच्च अचूकतेसह आपत्तीच्या संभाव्यतेचा अंदाज लावण्यासाठी सेन्सर डेटा स्ट्रीमचे विश्लेषण करतात।",
          step3_title: "स्वयंचलित प्रतिसाद", step3_text: "सिस्टम त्वरित आपत्कालीन प्रसारण, एसओएस प्रोटोकॉल आणि जोखमीच्या क्षेत्रांसाठी डायनॅमिक निर्वासन मार्ग ट्रिगर करते।"
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

      // Mobile Menu Toggle
      const menuToggle = document.getElementById('menuToggle');
      const nav = document.querySelector('.nav');
      if (menuToggle && nav) {
          menuToggle.addEventListener('click', () => {
              nav.classList.toggle('open');
          });
      }
  });
})();
