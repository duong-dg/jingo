import{headers}from'next/headers';
import type{Locale}from'./i18n';
export async function requestLocale():Promise<Locale>{return(await headers()).get('x-jingo-locale')==='en'?'en':'vi';}
