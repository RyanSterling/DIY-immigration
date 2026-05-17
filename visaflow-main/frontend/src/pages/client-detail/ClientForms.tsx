import { Link, useOutletContext } from "react-router-dom";
import { useFormInstancesList } from "~/hooks/useFormInstancesApi";
import Button from "~/atoms/Button";
import Spinner from "~/atoms/Spinner";
import type { ClientDetailContext } from "./ClientDetailLayout";

export default function ClientForms() {
  const { client } = useOutletContext<ClientDetailContext>();

  // Fetch form instances for this client from API
  const { data: instances, isLoading, isError, error } = useFormInstancesList({
    clientId: client.id,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center py-8">
        <p className="text-red-500 text-center mb-4">
          {error instanceof Error ? error.message : "Failed to load forms"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary-600 hover:text-primary-800"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (instances.length === 0) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center py-8">
        <p className="text-gray-500 text-center mb-4">
          No forms started yet. Go to the Forms page to create a new form for
          this client.
        </p>
        <Button href={`/forms?clientId=${client.id}`}>Start New Form</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with action */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Form Instances</h2>
        <Button href={`/forms?clientId=${client.id}`} variant="outline" size="sm">
          Start New Form
        </Button>
      </div>

      {/* Form instances table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Form
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Last Updated
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {instances.map((instance) => {
              // formNumber and title come from joined template data
              const formNumber = instance.formNumber || "Unknown Form";
              const formTitle = instance.title || "";

              return (
                <tr key={instance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formNumber}
                    </div>
                    {formTitle && (
                      <div className="text-sm text-gray-500">{formTitle}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        instance.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {instance.status === "completed"
                        ? "Completed"
                        : instance.status === "in_progress"
                          ? "In Progress"
                          : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(instance.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/forms/${instance.formTemplateId}/${instance.id}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {instance.status === "completed" ? "View" : "Continue"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
