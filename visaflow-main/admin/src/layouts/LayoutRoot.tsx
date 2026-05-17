import { Outlet } from 'react-router-dom';
import DevBanner from '~/components/DevBanner';
import { useDevTitle } from '~/hooks/useDevTitle';

export default function LayoutRoot() {
  useDevTitle();

  return (
    <>
      <Outlet />
      <DevBanner />
    </>
  );
}
