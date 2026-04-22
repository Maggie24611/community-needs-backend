// src/bot/botFlow.js
// M4's bot flow — converted to ES modules by M1.
// Day 6: Updated categories to match M2's schema exactly.

const STRINGS = {
  en: {
    welcome: `🙏 Welcome to Sahyog Mumbai.\nWhat language do you prefer?\n\n1️⃣ English\n2️⃣ Hindi\n3️⃣ Marathi`,
    category: `Please select the type of need:\n\n1️⃣ Food & Water\n2️⃣ Medical\n3️⃣ Shelter\n4️⃣ Education\n5️⃣ Safety\n6️⃣ Environment\n7️⃣ Sanitation\n8️⃣ Something else`,
    urgency: `How urgent is this?\n\n1️⃣ 🔴 Critical — immediate danger\n2️⃣ 🟠 High — needed today\n3️⃣ 🟡 Medium — needed soon`,
    location: `📍 Please share your location.\nType a landmark or area name.\n(e.g. "Near Dadar station, west side")`,
    description: `📝 Briefly describe what is needed.\n(e.g. "Community tap leaking for 2 days")`,
    consent: `🔒 *Data Consent (DPDP Act 2023)*\n\nTo connect you with help, we may share your number with verified volunteers.\n\nReply *YES* — allow contact\nReply *NO* — stay anonymous`,
    confirm: (refId, cat, urgency) => 
      `✅ *Report Registered!*\n\nRef ID: *${refId}*\nCategory: ${cat}\nUrgency: ${urgency}\n\nNearby volunteers have been notified. 🙏`,
    invalid: `❌ Invalid choice. Please reply with the number shown.`,
    invalidText: `Please type and send your location/description.`,
    volunteerWelcome: `🙋 *Volunteer Registration*\n\nReply *YES* to receive alerts near you.\nReply *NO* to cancel.`,
    volunteerConfirm: `✅ Registered! What help can you offer? (Reply numbers):\n\n1️⃣ Food & Water\n2️⃣ Medical\n3️⃣ Shelter\n4️⃣ Education\n5️⃣ Safety\n6️⃣ Environment\n7️⃣ Sanitation\n8️⃣ All of the above`,
    volunteerDone: (cats) => `✅ *Setup Complete!*\n\nYou will receive alerts for: *${cats}*\n\nThank you for helping Mumbai! 🙏`,
  },
  hi: {
    welcome: `🙏 मुंबई कम्युनिटी हेल्प में आपका स्वागत है।\nभाषा चुनें:\n\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ मराठी`,
    category: `जरूरत का प्रकार चुनें:\n\n1️⃣ खाना और पानी\n2️⃣ चिकित्सा\n3️⃣ आश्रय\n4️⃣ शिक्षा\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ अन्य`,
    urgency: `यह कितना जरूरी है?\n\n1️⃣ 🔴 तत्काल\n2️⃣ 🟠 अधिक\n3️⃣ 🟡 सामान्य`,
    location: `📍 अपना स्थान बताएं।\nलैंडमार्क या इलाके का नाम लिखें।`,
    description: `📝 संक्षेप में बताएं क्या चाहिए।`,
    consent: `🔒 *डेटा सहमति (DPDP 2023)*\n\nReply *YES* — स्वयंसेवक संपर्क कर सकते हैं\nReply *NO* — रिपोर्ट गुमनाम रहे`,
    confirm: (refId, cat, urgency) => 
      `✅ रिपोर्ट मिल गई!\n\nRef ID: *${refId}*\nश्रेणी: ${cat}\nजरूरत: ${urgency}\n\n🙏`,
    invalid: `माफ करें, नंबर से जवाब दें।`,
    invalidText: `कृपया जवाब टाइप करके भेजें।`,
    volunteerWelcome: `🙋 *स्वयंसेवक पंजीकरण*\n\nमुंबई की मदद करने के लिए धन्यवाद!\n\n*YES* लिखें — अलर्ट पाने के लिए\n*NO* लिखें — रद्द करें`,
    volunteerConfirm: `✅ आप पंजीकृत हैं! आप कहाँ मदद कर सकते हैं? (नंबर):\n\n1️⃣ खाना और पानी\n2️⃣ चिकित्सा\n3️⃣ आश्रय\n4️⃣ शिक्षा\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ सभी`,
    volunteerDone: (cats) => `✅ *पूर्ण!*\n\nअलर्ट श्रेणी: *${cats}*\n\nधन्यवाद! 🙏`,
  },
  mr: {
    welcome: `🙏 मुंबई कम्युनिटी हेल्पमध्ये स्वागत!\nभाषा निवडा:\n\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ मराठी`,
    category: `गरजेचा प्रकार निवडा:\n\n1️⃣ अन्न आणि पाणी\n2️⃣ वैद्यकीय\n3️⃣ निवारा\n4️⃣ शिक्षण\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ इतर`,
    urgency: `किती तातडीची?\n\n1️⃣ 🔴 अत्यंत तातडीची\n2️⃣ 🟠 जास्त\n3️⃣ 🟡 सामान्य`,
    location: `📍 ठिकाण सांगा।\nखूणपट्टी किंवा परिसराचे नाव लिहा।`,
    description: `📝 काय हवे आहे ते सांगा।`,
    consent: `🔒 *डेटा संमती (DPDP 2023)*\n\nReply *YES* — स्वयंसेवक संपर्क करू शकतात\nReply *NO* — रिपोर्ट गुप्त ठेवा`,
    confirm: (refId, cat, urgency) => 
      `✅ अहवाल मिळाला!\n\nRef ID: *${refId}*\nश्रेणी: ${cat}\nनिकड: ${urgency}\n\n🙏`,
    invalid: `माफ करा, दिलेल्या क्रमांकाने उत्तर द्या।`,
    invalidText: `उत्तर टाइप करून पाठवा।`,
    volunteerWelcome: `🙋 *स्वयंसेवक नोंदणी*\n\nमदत करण्यासाठी धन्यवाद!\n\n*YES* लिहा — अलर्ट मिळवण्यासाठी\n*NO* लिहा — रद्द करा`,
    volunteerConfirm: `✅ तुम्ही नोंदणीकृत आहात! तुम्ही कुठे मदत करू शकता? (नंबर):\n\n1️⃣ अन्न आणि पाणी\n2️⃣ वैद्यकीय\n3️⃣ निवारा\n4️⃣ शिक्षण\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ सर्व`,
    volunteerDone: (cats) => `✅ *पूर्ण!*\n\nअलर्ट श्रेणी: *${cats}*\n\nधन्यवाद! 🙏`,
  }
};

// Always use English category value for DB
const CATEGORIES_EN = ["Food & water", "Medical", "Shelter", "Education", "Safety", "Environment", "Sanitation", "Other"];

const URGENCY = {
  en: ["Critical", "High", "Medium", "Low"],
  hi: ["तत्काल", "अधिक", "सामान्य", "कम"],
  mr: ["अत्यंत तातडीची", "जास्त", "सामान्य", "कमी"],
};

const URGENCY_EN = ["Critical", "High", "Medium", "Low"];

const VOLUNTEER_CATEGORIES = {
  en: ['Food & Water','Medical','Shelter','Education','Safety','Environment','Sanitation','All'],
};

const STEPS = {
  LANGUAGE:    "LANGUAGE",
  CATEGORY:    "CATEGORY",
  URGENCY:     "URGENCY",
  LOCATION:    "LOCATION",
  DESCRIPTION: "DESCRIPTION",
  CONSENT:     "CONSENT",
  DONE:        "DONE",
};

function generateRefId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MUM-${num}`;
}

export async function handleMessage(userPhone, incomingText, sessionState) {
  const text = (incomingText || "").trim();

  if (!sessionState || !sessionState.step) {
    return {
      reply: STRINGS.en.welcome,
      newSessionState: { step: STEPS.LANGUAGE },
      reportPayload: null,
    };
  }

  const { step, lang = "en", data = {} } = sessionState;
  const s = STRINGS[lang] || STRINGS.en;

  if (step === STEPS.LANGUAGE) {
    const map = { "1": "en", "2": "hi", "3": "mr" };
    const selectedLang = map[text];
    if (!selectedLang) {
      return { reply: s.invalid, newSessionState: sessionState, reportPayload: null };
    }
    return {
      reply: STRINGS[selectedLang].category,
      newSessionState: { step: STEPS.CATEGORY, lang: selectedLang, data: {} },
      reportPayload: null,
    };
  }

  if (step === STEPS.CATEGORY) {
    const idx = parseInt(text, 10);
    if (!idx || idx < 1 || idx > 8) {
      return { reply: s.invalid, newSessionState: sessionState, reportPayload: null };
    }
    return {
      reply: s.urgency,
      newSessionState: {
        step: STEPS.URGENCY, lang,
        data: { ...data, category: CATEGORIES_EN[idx - 1] },
      },
      reportPayload: null,
    };
  }

  if (step === STEPS.URGENCY) {
    const idx = parseInt(text, 10);
    if (!idx || idx < 1 || idx > 4) {
      return { reply: s.invalid, newSessionState: sessionState, reportPayload: null };
    }
    return {
      reply: s.location,
      newSessionState: {
        step: STEPS.LOCATION, lang,
        data: {
          ...data,
          urgencyLabel: URGENCY[lang][idx - 1],
          urgencyCode:  URGENCY_EN[idx - 1],
        },
      },
      reportPayload: null,
    };
  }

  if (step === STEPS.LOCATION) {
    if (!text) return { reply: s.invalidText, newSessionState: sessionState, reportPayload: null };
    return {
      reply: s.description,
      newSessionState: { step: STEPS.DESCRIPTION, lang, data: { ...data, location: text } },
      reportPayload: null,
    };
  }

  if (step === STEPS.DESCRIPTION) {
    if (!text) return { reply: s.invalidText, newSessionState: sessionState, reportPayload: null };
    return {
      reply: s.consent,
      newSessionState: { step: STEPS.CONSENT, lang, data: { ...data, description: text } },
      reportPayload: null,
    };
  }

  if (step === STEPS.CONSENT) {
    const upper = text.toUpperCase();
    if (upper !== "YES" && upper !== "NO") {
      return {
        reply: `Please reply *YES* or *NO* only.\n\n${s.consent}`,
        newSessionState: sessionState,
        reportPayload: null,
      };
    }

    const consentGiven = upper === "YES";
    const refId = generateRefId();
    const { category, urgencyLabel, urgencyCode, location, description } = data;

    const rawText = [
      `Category: ${category}`,
      `Urgency: ${urgencyCode}`,
      `Location: ${location}`,
      `Description: ${description}`,
      `Language: ${lang}`,
    ].join("\n");

    return {
      reply: s.confirm(refId, category, urgencyLabel),
      newSessionState: { step: STEPS.DONE, lang, data: { refId } },
      reportPayload: {
        referenceId: refId,
        rawText,
        consented:   consentGiven,
        userPhone:   consentGiven ? userPhone : null,
        category,
        urgencyCode,
        location,
        description,
        language:    lang,
        consentGiven,
        reportedAt:  new Date().toISOString(),
      },
    };
  }

  if (step === STEPS.DONE) {
    if (text.toUpperCase() === "NEW") {
      return {
        reply: STRINGS.en.welcome,
        newSessionState: { step: STEPS.LANGUAGE },
        reportPayload: null,
      };
    }
    return {
      reply: `Your report is already submitted (ID: *${data.refId}*).\n\nTo submit a new report, reply *NEW*.`,
      newSessionState: sessionState,
      reportPayload: null,
    };
  }

  return {
    reply: STRINGS.en.welcome,
    newSessionState: { step: STEPS.LANGUAGE },
    reportPayload: null,
  };
}