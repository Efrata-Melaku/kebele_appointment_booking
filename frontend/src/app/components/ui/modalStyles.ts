/** Blurred modal overlay — page remains visible behind */
export const MODAL_BACKDROP_CLASS =
  'fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.25)] backdrop-blur-[10px] p-4';

/** Mobile sidebar overlay — lighter blur, no solid black */
export const MOBILE_MENU_BACKDROP_CLASS =
  'md:hidden fixed inset-0 z-40 bg-[rgba(0,0,0,0.15)] backdrop-blur-[10px]';
