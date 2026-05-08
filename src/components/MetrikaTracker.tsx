import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackHit } from "@/lib/metrika";

export default function MetrikaTracker() {
  const location = useLocation();

  useEffect(() => {
    const url = location.pathname + location.search;
    trackHit(url);
  }, [location.pathname, location.search]);

  return null;
}
