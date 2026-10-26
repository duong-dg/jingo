'use client';
import{createContext,useContext}from'react';
import type{Locale}from'../../lib/i18n';
export const LocaleContext=createContext<Locale>('vi');
export const useLocale=()=>useContext(LocaleContext);
