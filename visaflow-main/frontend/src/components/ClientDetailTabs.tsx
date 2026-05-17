import { NavLink, useParams } from "react-router-dom";

interface ClientDetailTabsProps {
  className?: string;
}

export default function ClientDetailTabs({ className }: ClientDetailTabsProps) {
  const { id } = useParams<{ id: string }>();

  const baseTabClass =
    "px-4 py-1.5 text-sm font-medium rounded-md transition-colors";
  const activeTabClass = "bg-white text-gray-900 shadow-sm";
  const inactiveTabClass = "text-gray-500 hover:text-gray-700";

  return (
    <div
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 ${className || ""}`}
    >
      <NavLink
        to={`/clients/${id}`}
        end
        className={({ isActive }) =>
          `${baseTabClass} ${isActive ? activeTabClass : inactiveTabClass}`
        }
      >
        Client Profile
      </NavLink>
      <NavLink
        to={`/clients/${id}/forms`}
        className={({ isActive }) =>
          `${baseTabClass} ${isActive ? activeTabClass : inactiveTabClass}`
        }
      >
        Forms
      </NavLink>
    </div>
  );
}
