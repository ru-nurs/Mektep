const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const pageHostname = window.location.hostname;

  if (envUrl) {
    try {
      const url = new URL(envUrl);
      const envPointsToLocalhost = LOCAL_HOSTS.has(url.hostname);
      const pageIsLocalhost = LOCAL_HOSTS.has(pageHostname);

      if (envPointsToLocalhost && !pageIsLocalhost) {
        url.hostname = pageHostname;
      }

      if (url.hostname === "0.0.0.0") {
        url.hostname = pageHostname;
      }

      return url.toString().replace(/\/$/, "");
    } catch {
      return envUrl.replace(/\/$/, "");
    }
  }

  return `${window.location.protocol}//${pageHostname}:3001`;
}
