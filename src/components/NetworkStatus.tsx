import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";
import { createElement } from "react";

export function NetworkStatus() {
  const offlineToastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const goOffline = () => {
      if (offlineToastId.current != null) return;
      offlineToastId.current = toast.error("No internet — please check your connection.", {
        duration: Infinity,
        icon: createElement(WifiOff, { className: "w-4 h-4" }),
      });
    };
    const goOnline = () => {
      if (offlineToastId.current != null) {
        toast.dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      toast.success("Back online", {
        icon: createElement(Wifi, { className: "w-4 h-4" }),
      });
    };

    if (!navigator.onLine) goOffline();

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return null;
}
