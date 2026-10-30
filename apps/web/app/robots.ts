import{publicRobotRules}from'../lib/share-metadata';
import type{MetadataRoute}from'next';
import{siteBase}from'../lib/content-api';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return{rules:publicRobotRules(),sitemap:new URL('/sitemap.xml',siteBase()).toString()};}
