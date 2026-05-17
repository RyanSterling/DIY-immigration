import { Outlet, ScrollRestoration } from "react-router-dom";
import DevBanner from "~/components/DevBanner";
import { useDevTitle } from "~/hooks/useDevTitle";

export default function LayoutRoot() {
  useDevTitle();

  return (
    <div className="min-h-screen bg-gray-950 p-4 pb-8">
      <Outlet />
      <DevBanner />
      <ScrollRestoration />
    </div>
  );
}
