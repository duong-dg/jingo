import{NextResponse,type NextRequest}from'next/server';
export function proxy(request:NextRequest){const headers=new Headers(request.headers);headers.set('x-jingo-locale',request.nextUrl.pathname==='/en'||request.nextUrl.pathname.startsWith('/en/')?'en':'vi');return NextResponse.next({request:{headers}});}
export const config={matcher:['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)']};
