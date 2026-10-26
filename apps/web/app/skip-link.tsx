'use client';
export function SkipLink(){return <a className="skip-link" href="#main" onClick={event=>{const main=document.getElementById('main');if(main){event.preventDefault();main.setAttribute('tabindex','-1');main.focus();main.scrollIntoView();}}}>Đến nội dung</a>;}
