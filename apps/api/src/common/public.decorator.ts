import { SetMetadata } from '@nestjs/common';

export const ACCESS = 'access';
export const SESSION_COOKIE_ACCESS = 'session-cookie-access';
export type Access = 'public' | 'any-identity' | 'registration';

/** Opts a route out of the global auth guard. */
export const Public = () => SetMetadata(ACCESS, 'public' satisfies Access);
/** Any identity state may call the route, guests included. */
export const AnyIdentity = () =>
  SetMetadata(ACCESS, 'any-identity' satisfies Access);
/** Only a registering identity may call the route. */
export const RegistrationOnly = () =>
  SetMetadata(ACCESS, 'registration' satisfies Access);
/** Allows a same-origin Clerk session cookie on this route's GET requests. */
export const SessionCookieAccess = () =>
  SetMetadata(SESSION_COOKIE_ACCESS, true);
