import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '~/components/Card';
import { DataTable, type Column } from '~/components/DataTable';
import Spinner from '~/components/Spinner';
import { useOrganization } from '~/hooks/useOrganizations';
import { useOrganizationCosts } from '~/hooks/useOrganizationCosts';

interface MonthlyCost {
  billingPeriod: string;
  totalCostUsd: string;
  operationCount: number;
}

function formatBillingPeriod(period: string): string {
  if (period === 'unknown') return 'Unknown';
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export default function PageOrganizationCosts() {
  const { id } = useParams<{ id: string }>();

  const { data: orgData, isLoading: orgLoading } = useOrganization(id!);
  const { data: costsData, isLoading: costsLoading } = useOrganizationCosts(id!);

  const org = orgData?.data;

  if (orgLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Organization not found</p>
      </div>
    );
  }

  const totalCost = parseFloat(costsData?.data?.totalCostUsd ?? '0');
  const totalOperations = costsData?.data?.totalOperations ?? 0;
  const monthlyCosts = costsData?.data?.monthlyCosts ?? [];

  const columns: Column<MonthlyCost>[] = [
    {
      key: 'billingPeriod',
      header: 'Period',
      render: (cost) => (
        <span className="font-medium text-gray-900">
          {formatBillingPeriod(cost.billingPeriod)}
        </span>
      ),
    },
    {
      key: 'operationCount',
      header: 'Operations',
      render: (cost) => (
        <span className="text-gray-500">{cost.operationCount}</span>
      ),
    },
    {
      key: 'totalCostUsd',
      header: 'Cost',
      render: (cost) => (
        <span className="text-gray-900 font-medium">
          ${parseFloat(cost.totalCostUsd).toFixed(4)}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Costs</h1>
        <p className="text-gray-500">{org.name}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500">Total Cost</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              ${totalCost.toFixed(2)}
            </div>
            <div className="mt-1 text-sm text-gray-500">All time</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500">Total Operations</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {totalOperations}
            </div>
            <div className="mt-1 text-sm text-gray-500">Document processing jobs</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Monthly Breakdown</h2>
        </CardHeader>
        <CardContent className="p-0">
          {costsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : monthlyCosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No costs recorded yet</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={monthlyCosts}
              isLoading={false}
              emptyMessage="No costs recorded"
              rowKey={(cost) => cost.billingPeriod}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
