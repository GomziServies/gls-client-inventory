export const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "https://api.fggroup.in/public/v1";
  }
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  const port = typeof window !== "undefined" && window.location.port ? window.location.port : "81";
  return `http://${host}:${port}/public/v1`;
};

export const BASE_API_URL = getApiBaseUrl();
