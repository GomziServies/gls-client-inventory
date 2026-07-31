export const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "https://api.fggroup.in/public/v1";
  }
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  return `http://${host}:80/public/v1`;
};

export const BASE_API_URL = getApiBaseUrl();
