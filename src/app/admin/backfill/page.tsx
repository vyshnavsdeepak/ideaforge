import { BackfillOpportunitySolutions } from '@/components/admin/BackfillOpportunitySolutions';

export default function AdminBackfillPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Backfill Tools
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Tools for backfilling and updating existing data in the database
          </p>
        </div>

        <BackfillOpportunitySolutions />
      </div>
    </div>
  );
}