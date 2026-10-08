const configuredApiBaseUrl = process.env.REACT_APP_API_URL?.trim();

if (!configuredApiBaseUrl) {
  throw new Error('REACT_APP_API_URL must be configured with the backend API base URL');
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, '');
