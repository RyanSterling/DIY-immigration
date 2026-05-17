import type { ReactNode } from "react";

interface TableRowProps {
  children: ReactNode;
  noHover?: boolean;
}

export default function TableRow({ children, noHover }: TableRowProps) {
  const classes = noHover ? "" : "hover:bg-gray-50 transition-colors";
  return <tr className={classes}>{children}</tr>;
}
