// src/bot/botFlow.js — Member 4 Final Master Version (Patched)
// Fixes applied:
//   1. VOLUNTEER_CATS now uses CATEGORIES_EN (English keys for M2 backend)
//   2. CONSENT step uses s.invalid instead of undefined s.invalidYesNo
//   3. Urgency confirm uses localized label, not raw English code

const STRINGS = {
  en: {
    welcome: `🙏 Welcome to Sahyog Mumbai.\nWhat language do you prefer?\n\n1️⃣ English\n2️⃣ Hindi\n3️⃣ Marathi`,
    category: `Please select the type of need:\n\n1️⃣ Food & water\n2️⃣ Medical\n3️⃣ Shelter\n4️⃣ Education\n5️⃣ Safety\n6️⃣ Environment\n7️⃣ Sanitation\n8️⃣ Something else`,
    urgency: `How urgent is this?\n\n1️⃣ 🔴 Critical — immediate danger\n2️⃣ 🟠 High — needed today\n3️⃣ 🟡 Medium — needed soon\n4️⃣ ⚪ Low — general inquiry`,
    location: `📍 Please share your location.\nType a landmark or area name.\n(e.g. "Near Dadar station, west side")`,
    description: `📝 Briefly describe what is needed.\n(e.g. "Community tap leaking for 2 days")`,
    consent: `🔒 *Data Consent (DPDP Act 2023)*\n\nTo connect you with help, we may share your number with verified volunteers.\n\nReply *YES* — allow contact\nReply *NO* — stay anonymous`,
    confirm: (refId, cat, urgency) =>
      `✅ *Report Registered!*\n\nRef ID: *${refId}*\nCategory: ${cat}\nUrgency: ${urgency}\n\nNearby volunteers have been notified. 🙏`,
    invalid: `❌ Invalid choice. Please reply with the number shown.`,
    invalidText: `Please type and send your location/description.`,
    volunteerWelcome: `🙋 *Volunteer Registration*\n\nReply *YES* to receive alerts near you.\nReply *NO* to cancel.`,
    volunteerConfirm: `✅ Registered! What help can you offer?\n\n1️⃣ Food & water\n2️⃣ Medical\n3️⃣ Shelter\n4️⃣ Education\n5️⃣ Safety\n6️⃣ Environment\n7️⃣ Sanitation\n8️⃣ All of the above`,
    volunteerDone: (cats) => `✅ *Setup Complete!*\n\nYou will receive alerts for: *${cats}*\n\nThank you for helping Mumbai! 🙏`,
  },
  hi: {
    welcome: `🙏 मुंबई सहयोग में आपका स्वागत है।\nभाषा चुनें:\n\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ मराठी`,
    category: `कृपया आवश्यकता का प्रकार चुनें:\n\n1️⃣ भोजन और पानी\n2️⃣ चिकित्सा\n3️⃣ आश्रय\n4️⃣ शिक्षा\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ कुछ और`,
    urgency: `यह कितना महत्वपूर्ण है?\n\n1️⃣ 🔴 गंभीर — तत्काल खतरा\n2️⃣ 🟠 उच्च — आज ही चाहिए\n3️⃣ 🟡 मध्यम — जल्द ही चाहिए\n4️⃣ ⚪ कम — सामान्य पूछताछ`,
    location: `📍 कृपया अपना स्थान साझा करें।\nलैंडमार्क या क्षेत्र का नाम लिखें।\n(उदा. "दादर स्टेशन के पास, पश्चिम")`,
    description: `📝 संक्षेप में बताएं कि क्या आवश्यकता है।\n(उदा. "2 दिनों से सामुदायिक नल लीक हो रहा है")`,
    consent: `🔒 *डेटा सहमति (DPDP अधिनियम 2023)*\n\nआपको मदद से जोड़ने के लिए, हम आपका नंबर सत्यापित स्वयंसेवकों के साथ साझा कर सकते हैं।\n\nजवाब दें *YES* — संपर्क की अनुमति दें\nजवाब दें *NO* — गुमनाम रहें`,
    confirm: (refId, cat, urgency) =>
      `✅ *रिपोर्ट प्राप्त हुई!*\n\nरेफरेंस आईडी: *${refId}*\nश्रेणी: ${cat}\nमहत्व: ${urgency}\n\nनिकटतम स्वयंसेवकों को सूचित कर दिया गया है। 🙏`,
    invalid: `❌ अमान्य विकल्प। कृपया दिखाए गए नंबर के साथ उत्तर दें।`,
    invalidText: `कृपया अपना स्थान/विवरण टाइप करें और भेजें।`,
    volunteerWelcome: `🙋 *स्वयंसेवक पंजीकरण*\n\nअलर्ट प्राप्त करने के लिए *YES* लिखें।\nरद्द करने के लिए *NO* लिखें।`,
    volunteerConfirm: `✅ पंजीकृत! आप क्या मदद दे सकते हैं? (नंबर लिखें):\n\n1️⃣ भोजन और पानी\n2️⃣ चिकित्सा\n3️⃣ आश्रय\n4️⃣ शिक्षा\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ उपरोक्त सभी`,
    volunteerDone: (cats) => `✅ *सेटअप पूर्ण!*\n\nअलर्ट श्रेणी: *${cats}*\n\nमुंबई की मदद करने के लिए धन्यवाद! 🙏`,
  },
  mr: {
    welcome: `🙏 मुंबई सहयोगमध्ये आपले स्वागत आहे.\nकृपया तुमची भाषा निवडा:\n\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ मराठी`,
    category: `कृपया गरजेचा प्रकार निवडा:\n\n1️⃣ अन्न आणि पाणी\n2️⃣ वैद्यकीय\n3️⃣ निवारा\n4️⃣ शिक्षण\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ इतर काही`,
    urgency: `हे किती तातडीचे आहे?\n\n1️⃣ 🔴 अत्यंत तातडीची — त्वरित धोका\n2️⃣ 🟠 जास्त — आजच हवे आहे\n3️⃣ 🟡 मध्यम — लवकरच हवे आहे\n4️⃣ ⚪ कमी — सामान्य चौकशी`,
    location: `📍 कृपया तुमचे ठिकाण सांगा.\nपरिसराचे किंवा महत्त्वाच्या खुणेचे नाव लिहा.\n(उदा. "दादर स्टेशन जवळ, पश्चिम")`,
    description: `📝 काय हवे आहे त्याचे थोडक्यात वर्णन करा.\n(उदा. "२ दिवसांपासून सार्वजनिक नळ गळत आहे")`,
    consent: `🔒 *डेटा संमती (DPDP कायदा २०२३)*\n\nमदतीसाठी, आम्ही तुमचा मोबाईल नंबर पडताळणी केलेल्या स्वयंसेवकांशी शेअर करू शकतो.\n\nउत्तर द्या *YES* — संपर्कास परवानगी द्या\nउत्तर द्या *NO* — निनावी रहा`,
    confirm: (refId, cat, urgency) =>
      `✅ *अहवाल यशस्वीरित्या नोंदवला!*\n\nरेफरन्स आयडी: *${refId}*\nश्रेणी: ${cat}\nनिकड: ${urgency}\n\nजवळपासच्या स्वयंसेवकांना सूचित करण्यात आले आहे. 🙏`,
    invalid: `❌ चुकीचा पर्याय. कृपया दिलेल्या क्रमांकाने उत्तर द्या.`,
    invalidText: `कृपया तुमचे ठिकाण किंवा वर्णन टाईप करून पाठवा.`,
    volunteerWelcome: `🙋 *स्वयंसेवक नोंदणी*\n\nतुमच्या परिसरातील अलर्ट मिळवण्यासाठी *YES* लिहा.\nरद्द करण्यासाठी *NO* लिहा.`,
    volunteerConfirm: `✅ तुमची नोंदणी झाली आहे! तुम्ही कशामध्ये मदत करू शकता? (क्रमांक निवडा):\n\n1️⃣ अन्न आणि पाणी\n2️⃣ वैद्यकीय\n3️⃣ निवारा\n4️⃣ शिक्षण\n5️⃣ सुरक्षा\n6️⃣ पर्यावरण\n7️⃣ स्वच्छता\n8️⃣ वरील सर्व`,
    volunteerDone: (cats) => `✅ *सेटअप पूर्ण झाला!*\n\nतुम्हाला यासाठी अलर्ट मिळतील: *${cats}*\n\nमुंबईला मदत केल्याबद्दल धन्यवाद! 🙏`,
  },
};

// FIX 1: VOLUNTEER_CATS uses this array — English keys only, for M2 backend
const CATEGORIES_EN = [
  "Food & water",
  "Medical",
  "Shelter",
  "Education",
  "Safety",
  "Environment",
  "Sanitation",
  "Other",
];

const CATEGORIES = {
  en: ["Food & water","Medical","Shelter","Education","Safety","Environment","Sanitation","Something else"],
  hi: ["भोजन और पानी","चिकित्सा","आश्रय","शिक्षा","सुरक्षा","पर्यावरण","स्वच्छता","कुछ और"],
  mr: ["अन्न आणि पाणी","वैद्यकीय","निवारा","शिक्षण","सुरक्षा","पर्यावरण","स्वच्छता","इतर काही"],
};

const URGENCY_EN = ["Critical", "High", "Medium", "Low"];

// FIX 3: Localized urgency labels for confirm() messages
const URGENCY_LABELS = {
  en: ["Critical", "High", "Medium", "Low"],
  hi: ["गंभीर", "उच्च", "मध्यम", "कम"],
  mr: ["अत्यंत तातडीची", "जास्त", "मध्यम", "कमी"],
};

const STEPS = {
  LANGUAGE:       'LANGUAGE',
  CATEGORY:       'CATEGORY',
  URGENCY:        'URGENCY',
  LOCATION:       'LOCATION',
  DESCRIPTION:    'DESCRIPTION',
  CONSENT:        'CONSENT',
  DONE:           'DONE',
  VOLUNTEER:      'VOLUNTEER',
  VOLUNTEER_CATS: 'VOLUNTEER_CATS',
};

/* ---------------------------------- */
/* HELPERS                            */
/* ---------------------------------- */

function generateRefId() {
  const ts   = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  return `MUM-${ts}${rand}`;
}

function extractNumber(text) {
  const cleaned = text.replace(/\D/g, '');
  return parseInt(cleaned, 10);
}

function isValidText(text) {
  return text && text.length >= 3;
}

/* ---------------------------------- */
/* MAIN HANDLER                       */
/* ---------------------------------- */

export async function handleMessage(userPhone, incomingText, sessionState) {
  const text      = (incomingText || '').trim();
  const upperText = text.toUpperCase();

  /* GLOBAL COMMANDS */

  if (upperText === 'HI' || upperText === 'HELLO' || upperText === 'RESTART') {
    return {
      reply:         STRINGS.en.welcome,
      newSessionState: { step: STEPS.LANGUAGE },
      reportPayload: null,
    };
  }

  if (upperText === 'VOLUNTEER') {
    return {
      reply:         STRINGS.en.volunteerWelcome,
      newSessionState: { step: STEPS.VOLUNTEER, lang: sessionState?.lang || 'en' },
      reportPayload: null,
    };
  }

  /* NEW SESSION */

  if (!sessionState?.step) {
    return {
      reply:         STRINGS.en.welcome,
      newSessionState: { step: STEPS.LANGUAGE },
      reportPayload: null,
    };
  }

  const { step, lang = 'en', data = {} } = sessionState;
  const s = STRINGS[lang];

  /* VOLUNTEER FLOW */

  if (step === STEPS.VOLUNTEER) {
    if (upperText === 'YES') {
      return {
        reply:         s.volunteerConfirm,
        newSessionState: { step: STEPS.VOLUNTEER_CATS, lang },
        reportPayload: null,
      };
    }
    return {
      reply:         `Cancelled. Type HI to restart.`,
      newSessionState: { step: STEPS.DONE },
      reportPayload: null,
    };
  }

  if (step === STEPS.VOLUNTEER_CATS) {
    const idx = extractNumber(text);

    if (!idx || idx < 1 || idx > 8) {
      return {
        reply:         s.invalid,
        newSessionState: sessionState,
        reportPayload: null,
      };
    }

    // FIX 1: Use CATEGORIES_EN — backend (M2) needs standardised English keys
    const selected = idx === 8
      ? CATEGORIES_EN.slice(0, 7)
      : [CATEGORIES_EN[idx - 1]];

    return {
      reply:         s.volunteerDone(selected.join(', ')),
      newSessionState: { step: STEPS.DONE },
      reportPayload: {
        type:         'VOLUNTEER_OPTIN',
        userPhone,
        categories:   selected,
        registeredAt: new Date().toISOString(),
      },
    };
  }

  /* MAIN FLOW */

  switch (step) {

    case STEPS.LANGUAGE: {
      const idx = extractNumber(text);
      const map = { 1: 'en', 2: 'hi', 3: 'mr' };

      if (!map[idx]) {
        return {
          reply:         s.invalid,
          newSessionState: sessionState,
          reportPayload: null,
        };
      }

      const newLang = map[idx];
      return {
        reply:         STRINGS[newLang].category,
        newSessionState: { step: STEPS.CATEGORY, lang: newLang, data: {} },
        reportPayload: null,
      };
    }

    case STEPS.CATEGORY: {
      const idx = extractNumber(text);

      if (!idx || idx < 1 || idx > 8) {
        return {
          reply:         s.invalid,
          newSessionState: sessionState,
          reportPayload: null,
        };
      }

      return {
        reply:         s.urgency,
        newSessionState: {
          step: STEPS.URGENCY,
          lang,
          data: {
            categoryCode:  CATEGORIES_EN[idx - 1],
            categoryLabel: CATEGORIES[lang][idx - 1],
            // FIX 3: store urgency index so we can look up localized label later
            categoryIdx:   idx - 1,
          },
        },
        reportPayload: null,
      };
    }

    case STEPS.URGENCY: {
      const idx = extractNumber(text);

      if (!idx || idx < 1 || idx > 4) {
        return {
          reply:         s.invalid,
          newSessionState: sessionState,
          reportPayload: null,
        };
      }

      return {
        reply:         s.location,
        newSessionState: {
          step: STEPS.LOCATION,
          lang,
          data: {
            ...data,
            urgencyCode:  URGENCY_EN[idx - 1],
            urgencyLabel: URGENCY_LABELS[lang][idx - 1], // FIX 3: localized
          },
        },
        reportPayload: null,
      };
    }

    case STEPS.LOCATION: {
      if (!isValidText(text)) {
        return {
          reply:         s.invalidText,
          newSessionState: sessionState,
          reportPayload: null,
        };
      }

      return {
        reply:         s.description,
        newSessionState: { step: STEPS.DESCRIPTION, lang, data: { ...data, location: text } },
        reportPayload: null,
      };
    }

    case STEPS.DESCRIPTION: {
      if (!isValidText(text)) {
        return {
          reply:         s.invalidText,
          newSessionState: sessionState,
          reportPayload: null,
        };
      }

      return {
        reply:         s.consent,
        newSessionState: { step: STEPS.CONSENT, lang, data: { ...data, description: text } },
        reportPayload: null,
      };
    }

    case STEPS.CONSENT: {
      // FIX 2: was s.invalidYesNo (undefined) — now uses s.invalid
      if (upperText !== 'YES' && upperText !== 'NO') {
        return {
          reply:         s.invalid,
          newSessionState: sessionState,
          reportPayload: null,
        };
      }

      const refId = generateRefId();
      const isYes = upperText === 'YES';

      const rawText = [
        `Category: ${data.categoryCode}`,
        `Urgency: ${data.urgencyCode}`,
        `Location: ${data.location}`,
        `Description: ${data.description}`,
        `Language: ${lang}`,
      ].join('\n');

      return {
        reply: s.confirm(refId, data.categoryLabel, data.urgencyLabel), // FIX 3: localized urgency
        newSessionState: { step: STEPS.DONE, lang, data: { refId } },
        reportPayload: {
          referenceId:   refId,
          rawText,
          userPhone:     isYes ? userPhone : null,
          consented:     isYes,
          category:      data.categoryCode,
          categoryLabel: data.categoryLabel,
          urgencyCode:   data.urgencyCode,
          location:      data.location,
          description:   data.description,
          language:      lang,
          reportedAt:    new Date().toISOString(),
        },
      };
    }

    case STEPS.DONE: {
      if (upperText === 'NEW') {
        return {
          reply:         STRINGS.en.welcome,
          newSessionState: { step: STEPS.LANGUAGE },
          reportPayload: null,
        };
      }

      return {
        reply: `Your report is submitted (ID: *${data.refId || 'N/A'}*).\n\nReply NEW to submit another.\nReply VOLUNTEER to register.`,
        newSessionState: sessionState,
        reportPayload:   null,
      };
    }

    default:
      return {
        reply:         STRINGS.en.welcome,
        newSessionState: { step: STEPS.LANGUAGE },
        reportPayload: null,
      };
  }
}