import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{WeatherEditor}from'./weather-editor';import'../admin.css';import'../shared/content-admin.css';
export const metadata:Metadata={title:'Thời tiết & gợi ý',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Thời tiết & gợi ý" active="weather"><WeatherEditor/></AdminFrame>;}
