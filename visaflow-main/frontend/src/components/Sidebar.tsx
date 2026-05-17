import { Link, useLocation } from "react-router-dom";
import {
  UsersIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

const navigation = [
  { name: "Clients", href: "/clients", icon: UsersIcon },
  { name: "Forms", href: "/forms", icon: DocumentTextIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/clients") {
      return (
        location.pathname === "/" || location.pathname.startsWith("/clients")
      );
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col pr-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-16">
        <span className="text-white text-2xl font-bold">VisaFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5 ml-1.5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
