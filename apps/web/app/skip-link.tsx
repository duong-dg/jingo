'use client';
import { useLocale } from './components/locale-context';
import { translator, localizedPath, dateLocale, errorText } from '../lib/i18n';
export function SkipLink() { const locale = useLocale(), t = translator(locale); return <a className="skip-link" href="#main" onClick={event => { const main = document.getElementById('main'); if (main) {
    event.preventDefault();
    main.setAttribute('tabindex', '-1');
    main.focus();
    main.scrollIntoView();
} }}>{t("Đến nội dung")}</a>; }
