import i18next from 'i18next';
import FsBackend, { FsBackendOptions } from 'i18next-fs-backend';
import { LanguageDetector } from 'i18next-http-middleware';

i18next
  .use(FsBackend)
  .use(LanguageDetector)
  .init<FsBackendOptions>({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    backend: {
      loadPath: './locales/{{lng}}/translation.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

export default i18next;
