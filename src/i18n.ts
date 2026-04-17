import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from '@/locales/ar.json'
import en from '@/locales/en.json'

function applyDocumentLanguage(lng: string): void {
  const rtl = lng === 'ar'
  document.documentElement.dir = rtl ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: 'en',
    lng: 'ar',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ion_screen_i18n',
    },
  })
  .then(() => {
    applyDocumentLanguage(i18n.language)
  })

i18n.on('languageChanged', applyDocumentLanguage)

export default i18n
