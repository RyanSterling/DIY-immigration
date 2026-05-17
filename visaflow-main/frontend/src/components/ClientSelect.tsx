import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useClients, useClientById, type Client } from "~/hooks/useClients";
import { cn } from "~/utils/cn";
import Spinner from "~/atoms/Spinner";

interface ClientSelectProps {
  value: string | null;
  onChange: (clientId: string | null) => void;
  placeholder?: string;
}

function getClientDisplayName(client: Client): string {
  const parts: string[] = [];
  if (client.firstName) parts.push(client.firstName);
  if (client.lastName) parts.push(client.lastName);
  return parts.length > 0 ? parts.join(" ") : "Unnamed Client";
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default function ClientSelect({
  value,
  onChange,
  placeholder = "Select a client...",
}: ClientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use base hook (no URL state)
  const { data: clients, isLoading } = useClients({ search });

  // Find selected client in search results first (instant, no fetch)
  const selectedClientFromSearch = useMemo(() => {
    if (!value) return null;
    return clients.find(c => c.id === value) ?? null;
  }, [value, clients]);

  // Only fetch detail if not found in search results (handles preselected clients)
  const { data: selectedClientFromDetail, isLoading: isLoadingDetail } = useClientById(
    selectedClientFromSearch ? null : value
  );

  // Prefer search result, fall back to detail fetch
  const selectedClient = selectedClientFromSearch || selectedClientFromDetail;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (clientId: string) => {
      onChange(clientId);
      setIsOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSearch("");
    },
    [onChange]
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const inputClasses = cn(
    "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 shadow-sm sm:text-sm sm:leading-6",
    "ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600"
  );

  // Determine what to display in the button
  const getDisplayText = () => {
    if (!value) return placeholder;
    if (selectedClient) return getClientDisplayName(selectedClient);
    if (isLoadingDetail) return "Loading...";
    return placeholder;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected value / trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          inputClasses,
          "flex items-center justify-between text-left cursor-pointer",
          !value && "text-gray-400"
        )}
      >
        <span className="truncate">
          {getDisplayText()}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            >
              <ClearIcon />
            </span>
          )}
          <ChevronDownIcon />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <SearchIcon />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className={cn(inputClasses, "pl-8")}
              />
            </div>
          </div>

          {/* Client list */}
          <div className="max-h-60 overflow-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : clients.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {search ? "No clients found" : "No clients available"}
              </div>
            ) : (
              clients.map((clientItem) => (
                <button
                  key={clientItem.id}
                  type="button"
                  onClick={() => handleSelect(clientItem.id)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                    value === clientItem.id && "bg-primary-50 text-primary-900"
                  )}
                >
                  <div className="font-medium">
                    {getClientDisplayName(clientItem)}
                  </div>
                  {clientItem.nationality && (
                    <div className="text-xs text-gray-500">
                      {clientItem.nationality}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
