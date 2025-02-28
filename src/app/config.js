const processEnv = typeof process !== 'undefined' ? process.env : {};
const injectedEnv = window && window.injectedEnv ? window.injectedEnv : {};

export const env = {
  ...processEnv,
  ...injectedEnv,
  ...{ARPAV_BACKEND_API_BASE_URL: 'https://arpav.geobeyond.dev'}
};