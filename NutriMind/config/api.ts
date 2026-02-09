import Constants from "expo-constants";

const isExpoTunnelUrl = (url: string): boolean => {
  return url.includes(".exp.direct") || url.includes(".exp.host") || url.includes("exp.direct") || url.includes("exp.host");
};

const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    const debuggerHost = Constants.expoConfig?.debuggerHost;
    
    if (hostUri && !isExpoTunnelUrl(hostUri)) {
      const localIP = hostUri.split(":")[0];
      if (localIP && localIP !== "localhost" && localIP !== "127.0.0.1") {
        return `http://${localIP}:3000`;
      }
    }
    
    if (debuggerHost && !isExpoTunnelUrl(debuggerHost)) {
      const localIP = debuggerHost.split(":")[0];
      if (localIP && localIP !== "localhost" && localIP !== "127.0.0.1") {
        return `http://${localIP}:3000`;
      }
    }
    
    if (Constants.expoConfig?.extra?.apiUrl) {
      return Constants.expoConfig.extra.apiUrl;
    }
    
    return "http://localhost:3000";
  }
  
  return process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
};

export const API_BASE_URL = getApiBaseUrl();

