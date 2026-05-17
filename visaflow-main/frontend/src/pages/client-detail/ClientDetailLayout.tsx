import { Link, Outlet, useParams } from "react-router-dom";
import { useClients } from "~/hooks/useClients";
import ClientDetailTabs from "~/components/ClientDetailTabs";
import Button from "~/atoms/Button";

// Active value type from API
interface ActiveValue {
  id: string;
  rawValue: string;
  valueType: string;
  normalizedValue: unknown;
  documentId: string | null;
  confidenceScore: string | null;
  source: string;
  createdAt: string;
}

// Extended client type with activeValues
export interface ClientWithActiveValues {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string;
  activeValues?: Record<string, ActiveValue>;
}

export interface ClientDetailContext {
  client: ClientWithActiveValues;
  refetch: () => void;
}

export default function ClientDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const { useGet } = useClients();

  const { data, isLoading, isError, refetch } = useGet(id);
  const client = data as ClientWithActiveValues | undefined;

  // Get client display name
  const getClientName = () => {
    if (!client?.activeValues) return "Unnamed Client";
    const firstName = client.activeValues.first_name?.rawValue || "";
    const lastName = client.activeValues.last_name?.rawValue || "";
    const name = [firstName, lastName].filter(Boolean).join(" ");
    return name || "Unnamed Client";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Error state
  if (isError || !client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Client not found
        </h2>
        <p className="text-gray-600 mb-4">
          The client you're looking for doesn't exist or has been deleted.
        </p>
        <Button href="/clients">Clients</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/clients"
          className="text-primary-600 hover:text-primary-800 text-sm mb-2 inline-block"
        >
          &larr; Clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{getClientName()}</h1>
        <p className="text-gray-600">
          Created {new Date(client.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Tabs */}
      <ClientDetailTabs className="mb-6" />

      {/* Child route content */}
      <Outlet context={{ client, refetch } satisfies ClientDetailContext} />
    </div>
  );
}
