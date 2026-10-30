import type{ImageRef}from'./content-api';
export type PageText={title:string;description:string;contentHtml:string;seoTitle:string;seoDescription:string;menuLabel:string};
export type SitePage=PageText&{id:string;slug:string;kind:'PAGE'|'CONTACT';cover:ImageRef|null;contact:{phone:string;email:string;address:string;hours:string;mapUrl:string}|null;updatedAt?:string;localePaths:Partial<Record<'vi'|'en',string>>;languages:string[]};
export type AdminPage=Omit<SitePage,'localePaths'|'languages'>&{version:number;status:'DRAFT'|'PUBLISHED'|'TRASH';showInMenu:boolean;showInFooter:boolean;sortOrder:number;english:(PageText&{slug:string;published:boolean})|null};
export type PageNav={id:string;label:string;href:string;menu:boolean;footer:boolean};
