import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import Button from "~/atoms/Button";
import { Input } from "~/atoms/Input";
import { AccordionSection } from "~/components/forms/AccordionSection";
import ConfirmationModal from "~/components/ConfirmationModal";
import {
  ClientFieldInput,
  type StackedFieldValue,
} from "~/components/forms/ClientFieldInput";
import { useClients } from "~/hooks/useClients";
import { useDocuments, type Document } from "~/hooks/useDocuments";
import { useClientFieldValues } from "~/hooks/useClientFieldValues";
import DocumentItem from "~/components/forms/DocumentItem";
import {
  FIELD_CATEGORIES,
  CONTACT_FIELD_LABELS,
} from "~/config/canonicalFields";
import {
  getFieldDisplayName,
  getFieldType,
} from "~/config/canonicalFields";
import type { ClientDetailContext } from "./ClientDetailLayout";

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

// Form values type for RHF
type ProfileFormValues = Record<string, string>;

/**
 * Get the display value from an active field value.
 * Uses normalizedValue.display when available, falls back to rawValue.
 */
function getDisplayValue(activeValue: ActiveValue | undefined): string {
  if (!activeValue) return "-";

  const normalized = activeValue.normalizedValue as {
    display?: string;
    original?: string;
  } | null;

  if (normalized?.display) {
    return normalized.display;
  }

  return activeValue.rawValue || "-";
}

export default function ClientProfile() {
  const { client, refetch } = useOutletContext<ClientDetailContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { useDelete } = useClients();
  const { useGetByClient, useBulkCreate } = useClientFieldValues();

  const [isEditing, setIsEditing] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [retryingDocId, setRetryingDocId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);

  // Form for editing
  const methods = useForm<ProfileFormValues>({ defaultValues: {} });

  // Fetch stacked values for historical selection (only when editing)
  const { data: stackedValues, isLoading: isLoadingStackedValues } =
    useGetByClient(isEditing ? client.id : undefined);

  // Documents hooks
  const {
    data: documentsData,
    isLoading: isLoadingDocs,
    useDelete: useDeleteDocument,
    useRetry: useRetryDocument,
    useCheckStatus: useCheckDocumentStatus,
  } = useDocuments({ clientId: client.id, enabled: true });
  const deleteDocMutation = useDeleteDocument();
  const retryDocMutation = useRetryDocument();
  const checkStatusMutation = useCheckDocumentStatus();
  const deleteClientMutation = useDelete();

  // Bulk create mutation for saving
  const bulkCreateMutation = useBulkCreate();

  // Build document ID to type mapping for display
  const documentTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (documentsData) {
      for (const doc of documentsData) {
        map[doc.id] = doc.documentType;
      }
    }
    return map;
  }, [documentsData]);

  // Initialize form values when entering edit mode
  useEffect(() => {
    if (isEditing && client?.activeValues) {
      const formValues: ProfileFormValues = {};
      // Initialize all canonical fields
      for (const category of FIELD_CATEGORIES) {
        for (const fieldKey of category.fields) {
          const activeValue = client.activeValues[fieldKey];
          if (activeValue?.rawValue) {
            // For dates, use ISO format from normalizedValue if available
            if (getFieldType(fieldKey) === "date") {
              const normalized = activeValue.normalizedValue as { iso?: string } | null;
              formValues[fieldKey] = normalized?.iso || activeValue.rawValue;
            }
            // For countries, use code from normalizedValue if available
            else if (getFieldType(fieldKey) === "country") {
              const normalized = activeValue.normalizedValue as { code?: string } | null;
              formValues[fieldKey] = normalized?.code || activeValue.rawValue;
            } else {
              formValues[fieldKey] = activeValue.rawValue;
            }
          }
        }
      }
      // Initialize contact fields
      formValues.email = client.activeValues.email?.rawValue || "";
      formValues.phone = client.activeValues.phone?.rawValue || "";
      formValues.address = client.activeValues.address?.rawValue || "";
      methods.reset(formValues);
    }
  }, [isEditing, client, methods]);

  // Poll check-status for documents stuck in "processing" state
  // This syncs with QueueBear to detect failed jobs that didn't trigger the webhook
  useEffect(() => {
    if (!documentsData || documentsData.length === 0) return;

    // Find documents that are processing and might be stuck
    const processingDocs = documentsData.filter(
      (doc) => doc.extraction?.status === "processing" && doc.extraction?.startedAt
    );

    if (processingDocs.length === 0) return;

    // Check if any document has been processing for more than 10 seconds
    const now = Date.now();
    const stuckDocs = processingDocs.filter((doc) => {
      const startedAt = new Date(doc.extraction!.startedAt!).getTime();
      return now - startedAt > 10000; // 10 seconds
    });

    if (stuckDocs.length === 0) return;

    // Set up polling interval for stuck documents
    const intervalId = setInterval(() => {
      for (const doc of stuckDocs) {
        // Don't check if we're already checking
        if (!checkStatusMutation.isPending) {
          checkStatusMutation.mutate(doc.id);
        }
      }
    }, 5000); // Poll every 5 seconds

    // Also check immediately
    for (const doc of stuckDocs) {
      checkStatusMutation.mutate(doc.id);
    }

    return () => clearInterval(intervalId);
  }, [documentsData, checkStatusMutation]);

  // Get client display name
  const getClientName = useCallback(() => {
    if (!client?.activeValues) return "Unnamed Client";
    const firstName = client.activeValues.first_name?.rawValue || "";
    const lastName = client.activeValues.last_name?.rawValue || "";
    const name = [firstName, lastName].filter(Boolean).join(" ");
    return name || "Unnamed Client";
  }, [client]);

  // Get historical values for a field with document types added
  const getHistoricalValues = useCallback(
    (fieldKey: string): StackedFieldValue[] => {
      const values = stackedValues?.[fieldKey] || [];
      return values.map((v) => ({
        ...v,
        documentType: v.documentId ? documentTypeMap[v.documentId] : undefined,
      }));
    },
    [stackedValues, documentTypeMap]
  );

  // Start editing
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    methods.reset({});
  }, [methods]);

  // Save changes
  const handleSave = useCallback(async () => {
    const formValues = methods.getValues();
    const valuesToSave: Array<{
      canonicalField: string;
      rawValue: string;
      valueType: "text" | "date" | "number" | "boolean" | "country";
      setActive: boolean;
    }> = [];

    // Check all canonical fields for changes
    for (const category of FIELD_CATEGORIES) {
      for (const fieldKey of category.fields) {
        const newValue = formValues[fieldKey]?.trim() || "";
        const originalValue = client?.activeValues?.[fieldKey]?.rawValue || "";

        // For dates and countries, compare normalized values
        let originalCompareValue = originalValue;
        if (getFieldType(fieldKey) === "date") {
          const normalized = client?.activeValues?.[fieldKey]?.normalizedValue as { iso?: string } | null;
          originalCompareValue = normalized?.iso || originalValue;
        } else if (getFieldType(fieldKey) === "country") {
          const normalized = client?.activeValues?.[fieldKey]?.normalizedValue as { code?: string } | null;
          originalCompareValue = normalized?.code || originalValue;
        }

        if (newValue && newValue !== originalCompareValue) {
          valuesToSave.push({
            canonicalField: fieldKey,
            rawValue: newValue,
            valueType: getFieldType(fieldKey) as "text" | "date" | "number" | "boolean" | "country",
            setActive: true,
          });
        }
      }
    }

    // Check contact fields for changes
    const contactFields = ["email", "phone", "address"] as const;
    for (const field of contactFields) {
      const newValue = formValues[field]?.trim() || "";
      const originalValue = client?.activeValues?.[field]?.rawValue || "";
      if (newValue !== originalValue) {
        valuesToSave.push({
          canonicalField: field,
          rawValue: newValue,
          valueType: "text",
          setActive: true,
        });
      }
    }

    if (valuesToSave.length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      await bulkCreateMutation.mutateAsync({
        clientId: client.id,
        values: valuesToSave,
      });

      // Invalidate and refetch client data
      await queryClient.invalidateQueries({
        queryKey: ["clients", "detail", client.id],
      });

      setIsEditing(false);
      methods.reset({});
      refetch();
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  }, [
    methods,
    client,
    bulkCreateMutation,
    queryClient,
    refetch,
  ]);

  // Handle client deletion confirmation
  const handleConfirmDeleteClient = useCallback(() => {
    deleteClientMutation.mutate(client.id, {
      onSuccess: () => {
        navigate("/clients");
      },
    });
  }, [client.id, deleteClientMutation, navigate]);

  // Handle document deletion confirmation
  const handleConfirmDeleteDocument = useCallback(async () => {
    if (!documentToDelete) return;
    setDeletingDocId(documentToDelete.id);
    try {
      await deleteDocMutation.mutateAsync(documentToDelete.id);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingDocId(null);
      setDocumentToDelete(null);
    }
  }, [documentToDelete, deleteDocMutation]);

  // Handle document download
  const handleDownloadDocument = useCallback((downloadUrl: string) => {
    window.open(downloadUrl, "_blank");
  }, []);

  // Handle document retry
  const handleRetryDocument = useCallback(async (docId: string) => {
    setRetryingDocId(docId);
    try {
      await retryDocMutation.mutateAsync(docId);
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetryingDocId(null);
    }
  }, [retryDocMutation]);

  // Count fields with data in a category
  const getFieldsWithDataCount = useCallback(
    (fields: string[]): number => {
      return fields.filter((field) => {
        const value = client?.activeValues?.[field]?.rawValue;
        return value && value.trim() !== "";
      }).length;
    },
    [client]
  );

  return (
    <>
      {/* Actions */}
      <div className="flex justify-end gap-2 mb-6">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={bulkCreateMutation.isPending}
            >
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleEdit}>
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowDeleteClientModal(true)}
              isLoading={deleteClientMutation.isPending}
            >
              Delete
            </Button>
          </>
        )}
      </div>

      {/* Error message */}
      {bulkCreateMutation.isError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            Failed to save changes. Please try again.
          </p>
        </div>
      )}

      {/* Client Information - Organized by Categories */}
      {isEditing && isLoadingStackedValues ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Loading field history...</span>
        </div>
      ) : isEditing ? (
        <FormProvider {...methods}>
          <div className="space-y-4">
            {/* Field Categories */}
            {FIELD_CATEGORIES.map((category, index) => {
              const fieldsWithData = getFieldsWithDataCount(category.fields);

              return (
                <AccordionSection
                  key={category.id}
                  title={category.title}
                  defaultExpanded={index === 0}
                  rightContent={
                    fieldsWithData > 0 ? (
                      <span className="text-sm text-gray-500">
                        {fieldsWithData} field{fieldsWithData !== 1 ? "s" : ""}{" "}
                        with data
                      </span>
                    ) : undefined
                  }
                >
                  <div className="space-y-4">
                    {category.fields.map((fieldKey) => (
                      <ClientFieldInput
                        key={fieldKey}
                        name={fieldKey}
                        label={getFieldDisplayName(fieldKey)}
                        historicalValues={getHistoricalValues(fieldKey)}
                        valueType={getFieldType(fieldKey)}
                      />
                    ))}
                  </div>
                </AccordionSection>
              );
            })}

            {/* Contact Information - Always Manual Entry */}
            <AccordionSection title="Contact Information" defaultExpanded={false}>
              <div className="space-y-4">
                <Input
                  name="email"
                  label={CONTACT_FIELD_LABELS.email}
                  type="email"
                  placeholder="client@example.com"
                />
                <Input
                  name="phone"
                  label={CONTACT_FIELD_LABELS.phone}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                />
                <Input
                  name="address"
                  label={CONTACT_FIELD_LABELS.address}
                  type="text"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
            </AccordionSection>
          </div>
        </FormProvider>
      ) : (
        <div className="space-y-4">
          {/* Field Categories - Read Only */}
          {FIELD_CATEGORIES.map((category, index) => {
            const fieldsWithData = getFieldsWithDataCount(category.fields);

            return (
              <AccordionSection
                key={category.id}
                title={category.title}
                defaultExpanded={index === 0}
                rightContent={
                  fieldsWithData > 0 ? (
                    <span className="text-sm text-gray-500">
                      {fieldsWithData} field{fieldsWithData !== 1 ? "s" : ""}{" "}
                      with data
                    </span>
                  ) : undefined
                }
              >
                <dl className="grid grid-cols-2 gap-4">
                  {category.fields.map((fieldKey) => {
                    const activeValue = client.activeValues?.[fieldKey];
                    const displayValue = getDisplayValue(activeValue);

                    return (
                      <div key={fieldKey}>
                        <dt className="text-sm font-medium text-gray-500">
                          {getFieldDisplayName(fieldKey)}
                        </dt>
                        <dd className="mt-1 text-gray-900">{displayValue}</dd>
                      </div>
                    );
                  })}
                </dl>
              </AccordionSection>
            );
          })}

          {/* Contact Information - Read Only */}
          <AccordionSection title="Contact Information" defaultExpanded={false}>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {CONTACT_FIELD_LABELS.email}
                </dt>
                <dd className="mt-1 text-gray-900">
                  {getDisplayValue(client.activeValues?.email)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {CONTACT_FIELD_LABELS.phone}
                </dt>
                <dd className="mt-1 text-gray-900">
                  {getDisplayValue(client.activeValues?.phone)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">
                  {CONTACT_FIELD_LABELS.address}
                </dt>
                <dd className="mt-1 text-gray-900">
                  {getDisplayValue(client.activeValues?.address)}
                </dd>
              </div>
            </dl>
          </AccordionSection>
        </div>
      )}

      {/* Documents Section */}
      <AccordionSection
        title="Documents"
        defaultExpanded={false}
        className="mt-4"
        rightContent={
          documentsData && documentsData.length > 0 ? (
            <span className="text-sm text-gray-500">
              {documentsData.length} document{documentsData.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      >
        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : documentsData && documentsData.length > 0 ? (
          <div className="space-y-2">
            {documentsData.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                onDelete={() => setDocumentToDelete(doc)}
                onDownload={
                  doc.downloadUrl
                    ? () => handleDownloadDocument(doc.downloadUrl!)
                    : undefined
                }
                onRetry={() => handleRetryDocument(doc.id)}
                isDeleting={deletingDocId === doc.id}
                isRetrying={retryingDocId === doc.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No documents uploaded yet.
          </p>
        )}
      </AccordionSection>

      {/* Delete Client Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteClientModal}
        onClose={() => setShowDeleteClientModal(false)}
        onConfirm={handleConfirmDeleteClient}
        title="Delete Client"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-medium">{getClientName()}</span>? This will
            also delete all associated documents and form data. This action
            cannot be undone.
          </>
        }
        confirmText="Delete"
        isLoading={deleteClientMutation.isPending}
      />

      {/* Delete Document Confirmation Modal */}
      <ConfirmationModal
        isOpen={documentToDelete !== null}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleConfirmDeleteDocument}
        title="Delete Document"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-medium">
              {documentToDelete?.originalFilename}
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        isLoading={deletingDocId === documentToDelete?.id}
      />
    </>
  );
}
