import Button from "~/atoms/Button";
import { Card, CardContent } from "~/components/Card";
import { CountryFlag } from "~/atoms/CountryFlag";
import { EmptyState } from "~/atoms/EmptyState";
// import { SearchBar } from "~/components/forms/SearchBar";
import SkeletonLoader from "~/atoms/SkeletonLoader";
import TableWrapper from "~/components/Table/TableWrapper";
import TableHeader, { type Column } from "~/components/Table/TableHeader";
import TableRow from "~/components/Table/TableRow";
import TableCell from "~/components/Table/TableCell";
import { useClientsSearchParams, type Client } from "~/hooks/useClients";

const COLUMNS: Column[] = [
  { key: "country", label: "Country" },
  { key: "client", label: "Client" },
  { key: "caseType", label: "Case Type" },
  { key: "action", label: "View", hideLabel: true, align: "right" },
];

export default function Clients() {
  // const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  const {
    data,
    isLoading,
    isError,
    search,
    // handleSearch,
    page,
    totalPages,
    goToPage,
  } = useClientsSearchParams({
    paramKey: "clients",
  });

  const getClientName = (client: Client) => {
    const name = [client.firstName, client.lastName].filter(Boolean).join(" ");
    return name || "Unnamed Client";
  };

  // Filter clients based on active tab
  const filteredClients = data || [];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Clients</h1>
        <Button href="/clients/new">New Client</Button>
      </div>

      {/* Tabs and Search */}
      {/* <div className="flex justify-between items-center mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "active"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "past"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Past
          </button>
        </div>
        <SearchBar
          placeholder="Search"
          defaultValue={search}
          onSearch={handleSearch}
        />
      </div> */}

      {/* Client Table */}
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="p-6 text-center text-red-600">
              Failed to load clients. Please try again.
            </div>
          ) : !isLoading && filteredClients.length === 0 ? (
            search ? (
              <div className="p-6 text-center text-gray-500">
                No clients found matching your search.
              </div>
            ) : (
              <EmptyState collectionName="clients" />
            )
          ) : (
            <TableWrapper noBorder>
              <TableHeader columns={COLUMNS} />
              <tbody className="divide-y divide-gray-200">
                {isLoading
                  ? // Skeleton rows
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`} noHover>
                        <TableCell>
                          <SkeletonLoader width={150} height={20} />
                        </TableCell>
                        <TableCell>
                          <SkeletonLoader width={180} height={16} />
                        </TableCell>
                        <TableCell>
                          <SkeletonLoader width={120} height={16} />
                        </TableCell>
                        <TableCell align="right">
                          <SkeletonLoader width={40} height={16} />
                        </TableCell>
                      </TableRow>
                    ))
                  : filteredClients.map((client) => {
                      const href = `/clients/${client.id}`;
                      return (
                        <TableRow key={client.id}>
                          <TableCell href={href}>
                            <CountryFlag countryCode={client.nationality} />
                          </TableCell>
                          <TableCell href={href}>
                            <div className="font-medium text-gray-900">
                              {getClientName(client)}
                            </div>
                          </TableCell>
                          <TableCell href={href}>
                            <div className="text-gray-700">
                              {client.caseType || "-"}
                            </div>
                          </TableCell>
                          <TableCell href={href} align="right">
                            <span className="text-primary-600 hover:text-primary-800 font-medium">
                              View
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </tbody>
            </TableWrapper>
          )}

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
