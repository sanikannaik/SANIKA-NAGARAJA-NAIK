import { Language } from "../types/database";

export const TRANSLATIONS: Record<
  Language,
  {
    brand: string;
    tagline: string;
    heroHeadline: string;
    heroDescription: string;
    ctaNeedHelp: string;
    ctaBecomeVolunteer: string;
    navFindAssistance: string;
    navVolunteer: string;
    navHowItWorks: string;
    navServices: string;
    navAbout: string;
    signIn: string;
    dashboard: string;
    createRequest: string;
    trackRequests: string;
    notifications: string;
    largeText: string;
    standardText: string;
    languageLabel: string;
    howItWorksTitle: string;
    categoriesTitle: string;
    whyChooseTitle: string;
    verifiedVolunteersTitle: string;
    communityImpactTitle: string;
    testimonialsTitle: string;
    emergencyBanner: string;
    aiAssistantTitle: string;
    aiAssistantPlaceholder: string;
  }
> = {
  en: {
    brand: "ElderCare Connect",
    tagline: "Small Acts of Kindness, Stronger Communities.",
    heroHeadline: "Because No Elder Should Feel Alone.",
    heroDescription:
      "Connecting elderly individuals with trusted community volunteers who care, support, and make everyday life easier.",
    ctaNeedHelp: "I Need Assistance",
    ctaBecomeVolunteer: "Become a Volunteer",
    navFindAssistance: "Find Assistance",
    navVolunteer: "Volunteer",
    navHowItWorks: "How It Works",
    navServices: "Services",
    navAbout: "About",
    signIn: "Sign In",
    dashboard: "Dashboard",
    createRequest: "Create Request",
    trackRequests: "Track Request",
    notifications: "Notifications",
    largeText: "Large Text",
    standardText: "Standard Text",
    languageLabel: "ಕನ್ನಡ",
    howItWorksTitle: "How ElderCare Connect Works",
    categoriesTitle: "Everyday Assistance Categories",
    whyChooseTitle: "Built Around Dignity, Safety, and Trust",
    verifiedVolunteersTitle: "Verified Community Volunteers",
    communityImpactTitle: "Live Community Impact",
    testimonialsTitle: "Voices From Our Community",
    emergencyBanner:
      "For medical emergencies (chest pain, breathing difficulty, severe falls), please call your local emergency number (112 / 108 / 911) immediately.",
    aiAssistantTitle: "ElderCare AI Assistant",
    aiAssistantPlaceholder: "Ask how to request help, track a volunteer, or simplify instructions...",
  },
  kn: {
    brand: "ElderCare Connect",
    tagline: "ಸಣ್ಣ ದಯೆಯ ಕಾರ್ಯಗಳು, ಬಲಿಷ್ಠ ಸಮುದಾಯಗಳು.",
    heroHeadline: "ಯಾವುದೇ ಹಿರಿಯರು ಒಂಟಿಯಾಗಿರಬಾರದು.",
    heroDescription:
      "ದೈನಂದಿನ ಜೀವನವನ್ನು ಸುಲಭಗೊಳಿಸಲು ಕಾಳಜಿ ಮತ್ತು ಬೆಂಬಲ ನೀಡುವ ವಿಶ್ವಾಸಾರ್ಹ ಸಮುದಾಯ ಸ್ವಯಂಸೇವಕರೊಂದಿಗೆ ಹಿರಿಯರನ್ನು ಸಂಪರ್ಕಿಸುವುದು.",
    ctaNeedHelp: "ನನಗೆ ಸಹಾಯ ಬೇಕು",
    ctaBecomeVolunteer: "ಸ್ವಯಂಸೇವಕರಾಗಿ",
    navFindAssistance: "ಸಹಾಯ ಹುಡುಕಿ",
    navVolunteer: "ಸ್ವಯಂಸೇವಕ",
    navHowItWorks: "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    navServices: "ಸೇವೆಗಳು",
    navAbout: "ನಮ್ಮ ಬಗ್ಗೆ",
    signIn: "ಸೈನ್ ಇನ್",
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    createRequest: "ವಿನಂತಿ ರಚಿಸಿ",
    trackRequests: "ವಿನಂತಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    notifications: "ಸೂಚನೆಗಳು",
    largeText: "ದೊಡ್ಡ ಅಕ್ಷರ",
    standardText: "ಸಾಮಾನ್ಯ ಅಕ್ಷರ",
    languageLabel: "English",
    howItWorksTitle: "ಎಲ್ಡರ್‌ಕೇರ್ ಕನೆಕ್ಟ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    categoriesTitle: "ದೈನಂದಿನ ಸಹಾಯದ ವಿಭಾಗಗಳು",
    whyChooseTitle: "ಗೌರವ, ಸುರಕ್ಷತೆ ಮತ್ತು ನಂಬಿಕೆಯ ಆಧಾರದ ಮೇಲೆ",
    verifiedVolunteersTitle: "ಪರಿಶೀಲಿಸಿದ ಸಮುದಾಯ ಸ್ವಯಂಸೇವಕರು",
    communityImpactTitle: "ಸಮುದಾಯದ ನೇರ ಅಂಕಿಅಂಶಗಳು",
    testimonialsTitle: "ಸಮುದಾಯದ ಅನುಭವಗಳು",
    emergencyBanner:
      "ತುರ್ತು ವೈದ್ಯಕೀಯ ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ (ಎದೆ ನೋವು, ಉಸಿರಾಟದ ತೊಂದರೆ, ಗಂಭೀರ ಬೀಳುವಿಕೆ), ದಯವಿಟ್ಟು ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸಂಖ್ಯೆಗೆ (112 / 108) ಕರೆ ಮಾಡಿ.",
    aiAssistantTitle: "ಎಲ್ಡರ್‌ಕೇರ್ AI ಸಹಾಯಕ",
    aiAssistantPlaceholder: "ಸಹಾಯ ಕೇಳುವುದು ಅಥವಾ ವೆಬ್‌ಸೈಟ್ ಬಳಸುವ ಬಗ್ಗೆ ಕೇಳಿ...",
  },
};

export const CATEGORY_LABELS_KN: Record<string, string> = {
  "Medical Assistance": "ವೈದ್ಯಕೀಯ ಸಹಾಯ",
  "Grocery Shopping": "ಕಿರಾಣಿ ಖರೀದಿ",
  "Medicine Collection": "ಔಷಧಿ ಸಂಗ್ರಹಣೆ",
  "Transportation": "ಸಾರಿಗೆ ಸಹಾಯ",
  "Hospital Visits": "ಆಸ್ಪತ್ರೆ ಭೇಟಿ",
  "Household Assistance": "ಮನೆಕೆಲಸದ ಸಹಾಯ",
  "Digital Assistance": "ಡಿಜಿಟಲ್ ಸಹಾಯ",
  "Bill Payments": "ಬಿಲ್ ಪಾವತಿ",
  "Companionship": "ಒಡನಾಟ ಮತ್ತು ಬೆಂಬಲ",
  "Other Assistance": "ಇತರೆ ಸಹಾಯ",
};

export const STATUS_LABELS_KN: Record<string, string> = {
  "REQUEST SUBMITTED": "ವಿನಂತಿ ಸಲ್ಲಿಸಲಾಗಿದೆ",
  "WAITING FOR VOLUNTEER": "ಸ್ವಯಂಸೇವಕರಿಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
  "VOLUNTEER ACCEPTED": "ಸ್ವಯಂಸೇವಕರು ಒಪ್ಪಿಕೊಂಡಿದ್ದಾರೆ",
  "ASSISTANCE IN PROGRESS": "ಸಹಾಯ ಪ್ರಗತಿಯಲ್ಲಿದೆ",
  "TASK COMPLETED": "ಕಾರ್ಯ ಪೂರ್ಣಗೊಂಡಿದೆ",
  "ELDERLY USER CONFIRMATION": "ಹಿರಿಯ ನಾಗರಿಕರ ದೃಢೀಕರಣ",
  "FEEDBACK AND RATING": "ಪ್ರತಿಕ್ರಿಯೆ ಮತ್ತು ರೇಟಿಂಗ್",
  CANCELLED: "ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ",
};
