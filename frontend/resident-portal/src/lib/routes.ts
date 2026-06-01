/** Resident portal paths */
export const residentRoutes = {
  home: '/',
  homeAlt: '/home',
  book: '/book-appointment',
  bookService: (serviceId: number | string) => `/book-appointment/${serviceId}`,
  track: '/track-appointment',
  edit: '/edit-appointment',
  cancel: '/cancel-appointment',
  feedback: '/feedback',
  services: '/services',
} as const;
