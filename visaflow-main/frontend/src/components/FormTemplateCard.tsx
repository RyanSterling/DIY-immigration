import { Card } from '~/components/Card';
import { cn } from '~/utils/cn';

interface FormTemplateInfo {
  id: string;
  formNumber: string;
  title: string;
  revision: string;
  description?: string;
}

interface FormTemplateCardProps {
  template: FormTemplateInfo;
  onClick: () => void;
}

export default function FormTemplateCard({
  template,
  onClick,
}: FormTemplateCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer ring-1 ring-gray-300',
        'hover:border-gray-300 hover:shadow-sm transition-all'
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="text-lg font-semibold text-gray-900">
          {template.formNumber}
        </div>
        <div className="mt-1 text-sm font-medium text-gray-800">
          {template.title}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Revision: {template.revision}
        </div>
        {template.description && (
          <div className="mt-2 text-sm text-gray-600">
            {template.description}
          </div>
        )}
      </div>
    </Card>
  );
}
