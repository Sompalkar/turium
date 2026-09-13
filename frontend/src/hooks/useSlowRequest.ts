import { useEffect, useState } from "react";

// True once a request has been pending longer than the delay. Used to explain a
// wait rather than leaving someone staring at a spinner.
export function useSlowRequest(isPending: boolean, delayMs = 3000): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isPending, delayMs]);

  return isSlow;
}
