import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '~/components/Card';
import { Input } from '~/components/forms/Input';
import { SimpleSelect, type SelectOption } from '~/components/forms/Select';
import Button from '~/components/Button';
import { useCreateFormTemplate } from '~/hooks/useAdminFormTemplates';
import { useOrganizations } from '~/hooks/useOrganizations';
import { toast } from 'react-toastify';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface FormData {
  formNumber: string;
  title: string;
  revision: string;
  pdfTemplateUrl: string;
  organizationId: string;
}

interface FormErrors {
  formNumber?: string;
  title?: string;
}

export default function FormTemplateCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateFormTemplate();
  const { data: organizationsData, isLoading: organizationsLoading } = useOrganizations({
    pageSize: 100,
  });

  const [formData, setFormData] = useState<FormData>({
    formNumber: '',
    title: '',
    revision: '',
    pdfTemplateUrl: '',
    organizationId: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const organizationOptions: SelectOption[] = [
    { value: '', label: 'Global (Available to all organizations)' },
    ...(organizationsData?.data ?? []).map((org) => ({
      value: org.id,
      label: org.name,
    })),
  ];

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleOrganizationChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      organizationId: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.formNumber.trim()) {
      newErrors.formNumber = 'Form number is required';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        formNumber: formData.formNumber.trim(),
        title: formData.title.trim(),
        revision: formData.revision.trim() || null,
        pdfTemplateUrl: formData.pdfTemplateUrl.trim() || null,
        organizationId: formData.organizationId || null,
      });

      toast.success('Form template created successfully');
      navigate(`/form-templates/${result.data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create form template'
      );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/form-templates"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Form Templates
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Form Template</h1>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Template Details</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the basic information for the new form template.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Input
              label="Form Number"
              name="formNumber"
              placeholder="e.g., I-130, DS-160"
              value={formData.formNumber}
              onChange={handleInputChange('formNumber')}
              error={errors.formNumber}
            />

            <Input
              label="Title"
              name="title"
              placeholder="e.g., Petition for Alien Relative"
              value={formData.title}
              onChange={handleInputChange('title')}
              error={errors.title}
            />

            <Input
              label="Revision"
              name="revision"
              placeholder="e.g., 03/2024 (optional)"
              value={formData.revision}
              onChange={handleInputChange('revision')}
            />

            <Input
              label="PDF Template URL"
              name="pdfTemplateUrl"
              placeholder="https://example.com/form.pdf (optional)"
              value={formData.pdfTemplateUrl}
              onChange={handleInputChange('pdfTemplateUrl')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <SimpleSelect
                options={organizationOptions}
                value={formData.organizationId}
                onChange={handleOrganizationChange}
                placeholder="Select an organization"
                disabled={organizationsLoading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave as "Global" to make this template available to all organizations.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/form-templates')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
            >
              Create Template
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
