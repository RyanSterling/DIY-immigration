import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import FormTemplateCard from '~/components/FormTemplateCard';
import StartFormModal from '~/components/StartFormModal';
import { useFormTemplates, type FormTemplateListItem } from '~/hooks/useFormTemplates';
import Spinner from '~/atoms/Spinner';

export default function Forms() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplateListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch templates from API
  const { data: templates, isLoading, isError, error } = useFormTemplates();

  const handleCardClick = (template: FormTemplateListItem) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleConfirm = (templateId: string, clientId: string) => {
    // Navigate to new form page without creating instance in database
    // The instance will be created when user saves the form
    navigate(`/forms/${templateId}/new?clientId=${clientId}`);
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <DocumentTextIcon className="w-16 h-16 text-red-300 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Forms</h1>
        <p className="text-red-500 max-w-md">
          {error instanceof Error ? error.message : 'Failed to load form templates'}
        </p>
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <DocumentTextIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">No Forms Available</h1>
        <p className="text-gray-500 max-w-md">
          No form templates have been configured yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
        <p className="mt-1 text-gray-500">Select a form template to get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <FormTemplateCard
            key={template.id}
            template={template}
            onClick={() => handleCardClick(template)}
          />
        ))}
      </div>

      <StartFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        template={selectedTemplate}
        onConfirm={handleConfirm}
        preselectedClientId={preselectedClientId}
      />
    </div>
  );
}
