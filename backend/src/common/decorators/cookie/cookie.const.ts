import { CookieOptions } from 'express';

const COOKIE_CONFIG_DEFAULT: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
};

export { COOKIE_CONFIG_DEFAULT };
