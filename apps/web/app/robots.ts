import{publicRobotRules}from'../lib/share-metadata';
import type{MetadataRoute}from'next';
import{indexing,siteBase}from'../lib/content-api';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return{rules:publicRobotRules(indexing()),sitemap:new URL('/sitemap.xml',siteBase()).toString()};}
