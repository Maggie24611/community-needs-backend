// src/bot/botFlow.js — Member 4 Final Master Version

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

const CATEGORIES = {
  en: ['Food & Water','Medical','Shelter','Education','Safety','Environment','Sanitation','Something else'],
  hi: ['खाना और पानी','चिकित्सा','आश्रय','शिक्षा','सुरक्षा','पर्यावरण','स्वच्छता','अन्य'],
  mr: ['अन्न आणि पाणी','वैद्यकीय','निवारा','शिक्षण','सुरक्षा','पर्यावरण','स्वच्छता','इतर'],
};

const VOLUNTEER_CATEGORIES = {
  en: ['Food & Water','Medical','Shelter','Education','Safety','Environment','Sanitation','All'],
};

const URGENCY = {
  en: ['Critical','High','Medium'],
  hi: ['तत्काल','अधिक','सामान्य'],
  mr: ['अत्यंत तातडीची','जास्त','सामान्य'],
};

const STEPS = {
  LANGUAGE: 'LANGUAGE',
  CATEGORY: 'CATEGORY',
  URGENCY: 'URGENCY',
  LOCATION: 'LOCATION',
  DESCRIPTION: 'DESCRIPTION',
  CONSENT: 'CONSENT',
  DONE: 'DONE',
  VOLUNTEER: 'VOLUNTEER',
  VOLUNTEER_CATS: 'VOLUNTEER_CATS',
};

function generateRefId() {
  return `MUM-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function handleMessage(userPhone, incomingText, sessionState) {
  const text = (incomingText || '').trim();
  const upperText = text.toUpperCase();

  // 0. GLOBAL RESET & NAVIGATION
  if (upperText === 'HI' || upperText === 'HELLO' || upperText === 'RESTART') {
    return {
      reply: STRINGS.en.welcome,
      newSessionState: { step: STEPS.LANGUAGE },
      reportPayload: null,
    };
  }

  if (upperText === 'VOLUNTEER') {
    return {
      reply: STRINGS.en.volunteerWelcome,
      newSessionState: { step: STEPS.VOLUNTEER, lang: sessionState?.lang || 'en' },
      reportPayload: null,
    };
  }

  // 1. START NEW SESSION IF EMPTY
  if (!sessionState || !sessionState.step) {
    return {
      reply: STRINGS.en.welcome,
      newSessionState: { step: STEPS.LANGUAGE },
      reportPayload: null,
    };
  }

  const { step, lang = 'en', data = {} } = sessionState;
  const s = STRINGS[lang] || STRINGS.en;

  // 2. VOLUNTEER FLOW
  if (step === STEPS.VOLUNTEER) {
    if (upperText === 'YES') {
      return { reply: s.volunteerConfirm, newSessionState: { step: STEPS.VOLUNTEER_CATS, lang } };
    }
    return { reply: "Registration cancelled. Type *HI* to go back.", newSessionState: { step: STEPS.DONE } };
  }

  if (step === STEPS.VOLUNTEER_CATS) {
    const idx = parseInt(text, 10);
    if (!idx || idx < 1 || idx > 8) return { reply: s.invalid, newSessionState: sessionState };
    
    // TECHNICAL FIX: Option 8 splits Environment and Sanitation into two distinct strings
    const selectedCats = idx === 8
      ? ['Food & Water', 'Medical', 'Shelter', 'Education', 'Safety', 'Environment', 'Sanitation']
      : [VOLUNTEER_CATEGORIES.en[idx - 1]];

    return {
      reply: s.volunteerDone(selectedCats.join(', ')),
      newSessionState: { step: STEPS.DONE, lang, data: { volunteer: true } },
      reportPayload: {
        type: 'VOLUNTEER_OPTIN',
        userPhone,
        categories: selectedCats,
        registeredAt: new Date().toISOString(),
      },
    };
  }

  // 3. REPORT FLOW (SWITCH CASE)
  switch (step) {
    case STEPS.LANGUAGE:
      const lMap = { '1': 'en', '2': 'hi', '3': 'mr' };
      if (!lMap[text]) return { reply: s.invalid, newSessionState: sessionState };
      const nextLang = lMap[text];
      return { 
        reply: STRINGS[nextLang].category, 
        newSessionState: { step: STEPS.CATEGORY, lang: nextLang, data: {} } 
      };

    case STEPS.CATEGORY:
      const cIdx = parseInt(text, 10);
      if (!cIdx || cIdx < 1 || cIdx > 8) return { reply: s.invalid, newSessionState: sessionState };
      return {
        reply: s.urgency,
        newSessionState: { step: STEPS.URGENCY, lang, data: { ...data, category: CATEGORIES[lang][cIdx-1] } }
      };

    case STEPS.URGENCY:
      const uIdx = parseInt(text, 10);
      if (!uIdx || uIdx < 1 || uIdx > 3) return { reply: s.invalid, newSessionState: sessionState };
      return {
        reply: s.location,
        newSessionState: { 
          step: STEPS.LOCATION, lang, 
          data: { ...data, urgencyLabel: URGENCY[lang][uIdx-1], urgencyCode: ['CRITICAL','HIGH','MEDIUM'][uIdx-1] } 
        }
      };

    case STEPS.LOCATION:
      if (!text) return { reply: s.invalidText, newSessionState: sessionState };
      return { reply: s.description, newSessionState: { step: STEPS.DESCRIPTION, lang, data: { ...data, location: text } } };

    case STEPS.DESCRIPTION:
      if (!text) return { reply: s.invalidText, newSessionState: sessionState };
      return { reply: s.consent, newSessionState: { step: STEPS.CONSENT, lang, data: { ...data, description: text } } };

    case STEPS.CONSENT:
      if (upperText !== 'YES' && upperText !== 'NO') return { reply: s.invalid, newSessionState: sessionState };
      
      const refId = generateRefId();
      const reportPayload = {
        type: 'NEED_REPORT',
        referenceId: refId,
        userPhone: upperText === 'YES' ? userPhone : 'ANONYMOUS',
        consented: upperText === 'YES',
        category: data.category,
        urgencyCode: data.urgencyCode,
        location: data.location,
        description: data.description,
        language: lang,
        reportedAt: new Date().toISOString(),
      };

      return {
        reply: s.confirm(refId, data.category, data.urgencyLabel),
        newSessionState: { step: STEPS.DONE, lang, data: { refId } },
        reportPayload
      };

    case STEPS.DONE:
      if (upperText === 'NEW') return { reply: STRINGS.en.welcome, newSessionState: { step: STEPS.LANGUAGE } };
      return { reply: "Your report is saved. Type *NEW* for a new report or *VOLUNTEER* to help.", newSessionState: sessionState };

    default:
      return { reply: STRINGS.en.welcome, newSessionState: { step: STEPS.LANGUAGE } };
  }
}