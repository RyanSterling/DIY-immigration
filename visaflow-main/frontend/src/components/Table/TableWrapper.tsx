import type { ReactNode } from "react";

interface TableWrapperProps {
  children: ReactNode;
  noBorder?: boolean;
}

export default function TableWrapper({ children, noBorder }: TableWrapperProps) {
  if (noBorder) {
    return <table className="min-w-full">{children}</table>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">{children}</table>
    </div>
  );
}
