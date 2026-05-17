import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface TableCellProps {
  children: ReactNode;
  href?: string;
  className?: string;
  align?: "left" | "right";
}

export default function TableCell({
  children,
  href,
  className,
  align = "left",
}: TableCellProps) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  const cellClass = `whitespace-nowrap ${alignClass} ${className || ""}`.trim();
  const contentClass = "block px-6 py-4";

  if (href) {
    return (
      <td className={cellClass}>
        <Link to={href} className={contentClass}>
          {children}
        </Link>
      </td>
    );
  }

  return (
    <td className={cellClass}>
      <div className={contentClass}>{children}</div>
    </td>
  );
}
