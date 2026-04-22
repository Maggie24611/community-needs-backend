// src/bot/botFlow.js — Final Unified Version (Feature Complete + DB Schema Matched)

const STRINGS = {
  en: {
    welcome: `🙏 Welcome to Sahyog Mumbai.\nWhat language do you prefer?\n\n1️⃣ English\n2️⃣ Hindi\n3️⃣ Marathi`,
    category: `Please select the type of need:\n\n1️⃣ Food & water\n2️⃣ Medical\n3️⃣ Shelter\n4️⃣ Education\n5️⃣ Safety\n6️⃣ Environment\n7️⃣ Sanitation\n8️⃣ Something else`,
    urgency: `How urgent is this?\n\n1️⃣ 🔴 Critical — immediate danger\n2️⃣ 🟠 High — needed today\n3️⃣ 🟡 Medium — needed soon\n4️⃣ ⚪ Low — general inquiry`,
    location: `📍 Please share your location.\nType a landmark or area name.\n(e.g. "Near Dadar station, west side")`,
    description: `📝 Briefly describe what is needed.\n(e.g. "Community tap leaking for 2 days")`,
    consent: `🔒 *Data Consent (DPDP Act 2023)*\n\nTo help you faster, we may share your contact number with verified volunteers near you.\n\nReply *YES* — allow volunteers to contact me\nReply *NO* — keep my report anonymous`,
    confirm: (refId, cat, urgency) => 
      `✅ *Report received!*\n\nReference ID: *${refId}*\nCategory: ${cat}\nUrgency: ${urgency}\n\nNearby volunteers have been notified. 🙏`,
    invalid: `❌ Invalid choice. Please reply with the number shown.`,
    invalidText: `Please type and send your location/description.`,
    volunteerWelcome: `🙋 *Volunteer Registration*\n\nReply *YES* to receive alerts near you.\nReply *NO* to cancel.`,
    volunteerConfirm: `✅ Registered! What help can you offer? (Reply numbers):\n\n1️⃣ Food & water\n2️⃣ Medical\n3️⃣ Shelter\n4️⃣ Education\n5️⃣ Safety\n6️⃣ Environment\n7️⃣ Sanitation\n8️⃣ All of the above`,
    volunteerDone: (cats) => `✅ *Setup Complete!*\n\nYou will receive alerts for: *${cats}*\n\nThank you for helping Mumbai! 🙏`,
  },
  hi: {
    welcome: `🙏 मुंबई सहयोग में आपका स्वागत है।\nभाषा चुनें:\n\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ मराठी`,
    category: `कृपया आवश्यकता का प्रकार चुनें:\n\n1️⃣ भोजन और पानी\n2️⃣ चिकित्सा\n3️⃣ आश्रय\n4️⃣ शिक्षा\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ कुछ और`,
    urgency: `यह कितना महत्वपूर्ण है?\n\n1️⃣ 🔴 गंभीर\n2️⃣ 🟠 उच्च\n3️⃣ 🟡 मध्यम\n4️⃣ ⚪ कम`,
    location: `📍 कृपया अपना स्थान साझा करें।\n(उदा. "दादर स्टेशन के पास")`,
    description: `📝 संक्षेप में बताएं क्या चाहिए।`,
    consent: `🔒 *डेटा सहमति (DPDP 2023)*\n\nReply *YES* — संपर्क की अनुमति दें\nReply *NO* — गुमनाम रहें`,
    confirm: (refId, cat, urgency) => 
      `✅ *रिपोर्ट प्राप्त हुई!*\n\nआईडी: *${refId}*\nश्रेणी: ${cat}\nमहत्व: ${urgency}\n\n🙏`,
    invalid: `❌ अमान्य विकल्प।`,
    invalidText: `कृपया अपना स्थान/विवरण टाइप करें।`,
    volunteerWelcome: `🙋 *स्वयंसेवक पंजीकरण*\n\nअलर्ट पाने के लिए *YES* लिखें।\nरद्द करने के लिए *NO* लिखें।`,
    volunteerConfirm: `✅ आप क्या मदद दे सकते हैं? (नंबर):\n\n1️⃣ भोजन और पानी...\n[8] उपरोक्त सभी`,
    volunteerDone: (cats) => `✅ *पूर्ण!*\n\nश्रेणी: *${cats}*\n\nधन्यवाद! 🙏`,
  },
  mr: {
    welcome: '🙏 मुंबई सहयोगमध्ये आपले स्वागत आहे.\nभाषा निवडा:\n\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ मराठी',
    category: 'कृपया गरजेचा प्रकार निवडा:\n\n1️⃣ अन्न आणि पाणी\n2️⃣ वैद्यकीय\n3️⃣ निवारा\n4️⃣ शिक्षण\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ इतर काही',
    urgency: 'हे किती तातडीचे आहे?\n\n1️⃣ 🔴 गंभीर — त्वरित धोका\n2️⃣ 🟠 उच्च — आजच हवे आहे\n3️⃣ 🟡 मध्यम — लवकरच हवे आहे\n4️⃣ ⚪ कमी — सामान्य चौकशी',
    location: '📍 कृपया आपले ठिकाण सांगा।\nपरिसराचे किंवा महत्त्वाच्या ठिकाणाचे नाव लिहा।',
    description: '📝 काय हवे आहे त्याचे थोडक्यात वर्णन करा।',
    consent: '🔒 *डेटा संमती (DPDP कायदा 2023)*\n\nReply *YES* — संपर्कास परवानगी द्या\nReply *NO* — निनावी रहा',
    confirm: (refId, cat, urgency) => 
      '✅ *अहवाल प्राप्त झाला!*\n\nआयडी: *${refId}*\nश्रेणी: ${cat}\nनिकड: ${urgency}\n\n🙏',
    invalid: '❌ चुकीचा पर्याय।',
    invalidText: 'कृपया आपले ठिकाण/वर्णन टाइप करून पाठवा।',
    volunteerWelcome: '🙋 *स्वयंसेवक नोंदणी*\n\nअलर्ट मिळवण्यासाठी *YES* लिहा।\nरद्द करण्यासाठी *NO* लिहा।',
    volunteerConfirm: '✅ आपण काय मदत करू शकता? (क्रमांक लिहा):\n\n1️⃣ अन्न आणि पाणी\n2️⃣ वैद्यकीय\n3️⃣ निवारा\n4️⃣ शिक्षण\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ वरील सर्व',
    volunteerDone: (cats) => '✅ *सेटअप पूर्ण!*\n\nअलर्ट श्रेणी: *${cats}*\n\nधन्यवाद! 🙏',
  }
};

// M2's exact DB values (Don't change capitalization)
const CATEGORIES_EN = ["Food & water", "Medical", "Shelter", "Education", "Safety", "Environment", "Sanitation", "Other"];
const URGENCY_EN = ["Critical", "High", "Medium", "Low"];

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

  // GLOBAL KEYWORDS
  if (upperText === 'HI' || upperText === 'HELLO' || upperText === 'RESTART') {
    return { reply: STRINGS.en.welcome, newSessionState: { step: STEPS.LANGUAGE }, reportPayload: null };
  }
  if (upperText === 'VOLUNTEER') {
    return { reply: STRINGS.en.volunteerWelcome, newSessionState: { step: STEPS.VOLUNTEER }, reportPayload: null };
  }

  if (!sessionState?.step) {
    return { reply: STRINGS.en.welcome, newSessionState: { step: STEPS.LANGUAGE }, reportPayload: null };
  }

  const { step, lang = 'en', data = {} } = sessionState;
  const s = STRINGS[lang] || STRINGS.en;

  // VOLUNTEER FLOW
  if (step === STEPS.VOLUNTEER) {
    if (upperText === 'YES') return { reply: s.volunteerConfirm, newSessionState: { step: STEPS.VOLUNTEER_CATS, lang } };
    return { reply: "Cancelled. Type HI to go back.", newSessionState: { step: STEPS.DONE } };
  }

  if (step === STEPS.VOLUNTEER_CATS) {
    const idx = parseInt(text, 10);
    if (!idx || idx < 1 || idx > 8) return { reply: s.invalid, newSessionState: sessionState };
    const selected = idx === 8 ? CATEGORIES_EN.slice(0,7) : [CATEGORIES_EN[idx-1]];
    return {
      reply: s.volunteerDone(selected.join(', ')),
      newSessionState: { step: STEPS.DONE },
      reportPayload: { type: 'VOLUNTEER_OPTIN', userPhone, categories: selected }
    };
  }

  // REPORT FLOW
  switch (step) {
    case STEPS.LANGUAGE:
      const lMap = { '1': 'en', '2': 'hi', '3': 'mr' };
      if (!lMap[text]) return { reply: s.invalid, newSessionState: sessionState };
      return { reply: STRINGS[lMap[text]].category, newSessionState: { step: STEPS.CATEGORY, lang: lMap[text] } };

    case STEPS.CATEGORY:
      const cIdx = parseInt(text, 10);
      if (!cIdx || cIdx < 1 || cIdx > 8) return { reply: s.invalid, newSessionState: sessionState };
      return { reply: s.urgency, newSessionState: { step: STEPS.URGENCY, lang, data: { category: CATEGORIES_EN[cIdx-1] } } };

    case STEPS.URGENCY:
      const uIdx = parseInt(text, 10);
      if (!uIdx || uIdx < 1 || uIdx > 4) return { reply: s.invalid, newSessionState: sessionState };
      return { reply: s.location, newSessionState: { step: STEPS.LOCATION, lang, data: { ...data, urgencyCode: URGENCY_EN[uIdx-1] } } };

    case STEPS.LOCATION:
      return { reply: s.description, newSessionState: { step: STEPS.DESCRIPTION, lang, data: { ...data, location: text } } };

    case STEPS.DESCRIPTION:
      return { reply: s.consent, newSessionState: { step: STEPS.CONSENT, lang, data: { ...data, description: text } } };

    case STEPS.CONSENT:
      if (upperText !== 'YES' && upperText !== 'NO') return { reply: s.invalid, newSessionState: sessionState };
      const refId = generateRefId();
      const isYes = upperText === 'YES';
      return {
        reply: s.confirm(refId, data.category, data.urgencyCode),
        newSessionState: { step: STEPS.DONE, data: { refId } },
        reportPayload: {
          referenceId: refId,
          rawText: [
    `Category: ${data.category}`,
    `Urgency: ${data.urgencyCode}`,
    `Location: ${data.location}`,
    `Description: ${data.description}`,
  ].join("\n"),     
          userPhone: isYes ? userPhone : null,
          consented: isYes,
          category: data.category,
          urgencyCode: data.urgencyCode,
          location: data.location,
          description: data.description,
          reportedAt: new Date().toISOString()
        }
      };

    default:
      return { reply: "Type HI to restart.", newSessionState: { step: STEPS.DONE } };
  }
}