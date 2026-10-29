// Lucide-compatible stroke SVG primitives. No icon fonts or decorative emoji.
const paths={
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 layers:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
 sparkle:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3ZM20 19v4m-2-2h4"/>',
 message:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 21l2.1-5.3A8.5 8.5 0 1 1 21 11.5Z"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 15 4-5 4 3 5-7"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',back:'<path d="m15 18-6-6 6-6"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71"/>',
 check:'<path d="m5 12 4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 loader:'<path d="M12 2a10 10 0 1 1-8 4"/>',filter:'<path d="M4 7h16M7 12h10m-7 5h4"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 lightbulb:'<path d="M9 18h6m-6 3h6M8 14a7 7 0 1 1 8 0c-.8.7-1 2-1 4H9c0-2-.2-3.3-1-4Z"/>',
 trending:'<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 external:'<path d="M13 5h6v6M19 5 10 14"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
 activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};
export function icon(name,size=19,extra=''){return `<svg class="lucide ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.grid}</svg>`}
