# Contact and content pages

Admin: Settings → Content pages & menu (`/admin/trang-noi-dung`).

- The Contact page is seeded once without made-up phone/email/address. Edit its contact tab to publish real contact channels and support hours. `/lien-he`, `/en/contact`.
- Create custom pages (privacy, terms, support, about) as drafts. Enter and review your own content before publishing. No legal policy is automatically published.
- Menu & publication: choose top menu (Information dropdown on desktop, normal links in mobile menu), footer, short labels and order. Only published pages and separately published English translations appear publicly. Long menus scroll rather than overflow.
- English is edited in the same page, with its own slug and content. `/trang/:slug` and `/en/pages/:englishSlug`; hreflang and the language switcher use per-page locale paths.
- Published pages have canonical/social metadata, breadcrumbs and sitemap entries. Alias URLs redirect permanently after a slug change; old aliases are reserved.
- Custom pages support recoverable trash; restore as a draft. Contact can be unpublished, but not trashed. Saves use optimistic version checks and an audit record.
- HTML is sanitized and embedded images must exist in JinGo media. Public responses exclude draft/English draft content and internal versions. Only the admin guard permits edits.
- Contact uses direct phone/email/map links and booking lookup. It does not pretend to send a contact form or create an email workflow.
