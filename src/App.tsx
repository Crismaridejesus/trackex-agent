import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import LoginScreen from "./components/LoginScreen";
import ConsentWizard from "./components/ConsentWizard";
import MainView from "./components/MainView";
import UpdateDialog from "./components/UpdateDialog";
import { SSEConnectionStatus } from "./components/SSEConnectionStatus";
import { clearCachedToken } from "./utils/license-listener";
import PermissionsHelper from "./components/PermissionsHelper";
import "./App.css";

interface AuthStatus {
  is_authenticated: boolean;
  email?: string;
  device_id?: string;
}

interface ConsentStatus {
  accepted: boolean;
  accepted_at?: string;
  version: string;
}

interface PermissionsStatus {
  screen_recording: boolean;
  accessibility: boolean;
}

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  // Track license validity (prefixed with _ to indicate intentionally unused for now)
  const [_licenseValid, setLicenseValid] = useState<boolean | null>(null);
  const [permissionsStatus, setPermissionsStatus] = useState<PermissionsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout checking status")), 15000)
      );
      
      const [auth, consent, permissions] = await Promise.race([
        Promise.all([
          invoke<AuthStatus>("get_auth_status"),
          invoke<ConsentStatus>("get_consent_status"),
          invoke<PermissionsStatus>("get_permissions_status")
        ]),
        timeoutPromise
      ]);

      setAuthStatus(auth);
      setConsentStatus(consent);
      setPermissionsStatus(permissions);
    } catch (error) {
      console.error("Failed to check status:", error);
      // On error, assume not authenticated and not consented
      // This allows the app to show login screen instead of hanging
      setAuthStatus({ is_authenticated: false });
      setConsentStatus({ accepted: false, version: "1.0" });
      setPermissionsStatus({ screen_recording: false, accessibility: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    // Force refresh auth status after login
    setLoading(true);
    await checkStatus();
  };

  const handleConsent = async () => {
    // Force refresh status after consent
    setLoading(true);
    await checkStatus();
  };

  const handleLogout = async () => {
    // Clear auth status and refresh
    setAuthStatus(null);
    setConsentStatus(null);
    setLicenseValid(null);
    setPermissionsStatus(null);
    // Clear cached token
    clearCachedToken();
    setLoading(true);
    await checkStatus();
  };



  // Mount UpdateDialog immediately to establish SSE connection ASAP
  // This ensures we don't miss version broadcasts during login/consent/permissions flow
  const updateDialog = <UpdateDialog autoCheck={true} />;
  const connectionStatus = <SSEConnectionStatus />;

  if (loading) {
    return (
      <>
        {updateDialog}
        {connectionStatus}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading TrackEx Agent...</p>
        </div>
      </>
    );
  }

  // Show login if not authenticated
  if (!authStatus?.is_authenticated) {
    return (
      <>
        {updateDialog}
        {connectionStatus}
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // After login: Show consent wizard if consent not given
  if (!consentStatus?.accepted) {
    return (
      <>
        {updateDialog}
        {connectionStatus}
        <ConsentWizard onConsent={handleConsent} />
      </>
    );
  }

  // After consent: Show permissions helper if screen recording not granted
  if (permissionsStatus && !permissionsStatus.screen_recording) {
    return (
      <>
        {updateDialog}
        {connectionStatus}
        <PermissionsHelper permissionsStatus={permissionsStatus} onPermissionsGranted={handleConsent} />
      </>
    );
  }

  // Show main application after login, consent, and permissions
  return (
    <>
      {updateDialog}
      {connectionStatus}
      <MainView authStatus={authStatus} onLogout={handleLogout} />
    </>
  );
}

export default App;