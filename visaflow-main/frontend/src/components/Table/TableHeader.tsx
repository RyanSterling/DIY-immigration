export interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  hideLabel?: boolean;
}

interface TableHeaderProps {
  columns: Column[];
}

export default function TableHeader({ columns }: TableHeaderProps) {
  return (
    <thead>
      <tr className="border-b border-gray-200">
        {columns.map((col) => (
          <th
            key={col.key}
            className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
              col.align === "right" ? "text-right" : "text-left"
            }`}
          >
            {col.hideLabel ? (
              <span className="sr-only">{col.label}</span>
            ) : (
              col.label
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}
