import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface VersionBadgeProps {
  position?: "bottom-left" | "bottom-right" | "top-right";
}

function VersionBadge({ position = "bottom-right" }: VersionBadgeProps) {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await invoke<string>("get_app_version");
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("?.?.?");
      }
    };
    fetchVersion();
  }, []);

  if (!version) return null;

  return (
    <div className={`version-badge version-badge-${position}`}>
      v{version}
    </div>
  );
}

export default VersionBadge;
