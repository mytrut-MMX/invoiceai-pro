import React from "react";

export const Ic = ({ d, size=18, sw=1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{__html:d}} />
);

export const Icons = {
  Home:     () => <Ic d='<path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>'/>,
  Customers:() => <Ic d='<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.85"/>'/>,
  Items:    () => <Ic d='<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'/>,
  Quotes:   () => <Ic d='<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>'/>,
  Invoices: () => <Ic d='<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'/>,
  Payments: () => <Ic d='<rect x="1" y="5" width="22" height="14" rx="2"/><path d="M1 10h22"/>'/>,
  Settings: () => <Ic d='<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'/>,
  Plus:     () => <Ic d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' size={16} sw={2}/>,
  ChevDown: () => <Ic d='<polyline points="6 9 12 15 18 9"/>' size={14} sw={2}/>,
  ChevRight:() => <Ic d='<polyline points="9 18 15 12 9 6"/>' size={14} sw={2}/>,
  Search:   () => <Ic d='<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' size={16} sw={2}/>,
  Send:     () => <Ic d='<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' size={16} sw={2}/>,
  X:        () => <Ic d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' size={16} sw={2}/>,
  Building: () => <Ic d='<rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 22V12h6v10M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/>'/>,
  Bot:      () => <Ic d='<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 8V6a4 4 0 018 0v2"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M9 18h6"/>' size={20}/>,
  Download: () => <Ic d='<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' size={16} sw={2}/>,
  Check:    () => <Ic d='<polyline points="20 6 9 17 4 12"/>' size={14} sw={2.5}/>,
  Trash:    () => <Ic d='<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>' size={15}/>,
  Edit:     () => <Ic d='<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>' size={15}/>,
  Save:     () => <Ic d='<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>' size={15}/>,
  Eye:      () => <Ic d='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' size={15}/>,
  Info:     () => <Ic d='<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5"/><line x1="12" y1="12" x2="12" y2="16"/>' size={15}/>,
  User:     () => <Ic d='<circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/>'/>,
  Drive:    () => <Ic d='<path d="M12 2L2 19h7.5L12 14l2.5 5H22L12 2z"/><path d="M7.5 19L12 11l4.5 8H7.5z"/>' size={16}/>,
  Pen:      () => <Ic d='<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>' size={14}/>,
  Alert:    () => <Ic d='<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' size={16}/>,
  Link:     () => <Ic d='<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' size={15}/>,
  Unlink:   () => <Ic d='<path d="M18.84 12.25l1.72-1.71a4.9 4.9 0 000-6.93 4.9 4.9 0 00-6.93 0l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a4.9 4.9 0 000 6.93 4.9 4.9 0 006.93 0l1.72-1.72M8 16l8-8"/>' size={15}/>,
  Bank:     () => <Ic d='<path d="M3 10l9-7 9 7v11H3V10z"/><path d="M12 3v7"/><path d="M7 21V14h10v7"/>' size={16}/>,
  Filter:   () => <Ic d='<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' size={15}/>,
  Receipt:  () => <Ic d='<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M8 10h8M8 14h5"/>' size={16}/>,
};
