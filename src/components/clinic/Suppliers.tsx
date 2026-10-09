export default function Suppliers() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h11v10H3zM14 10h3l4 4v3h-7z" /><circle cx="7" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.5" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-semibold text-clinical-900">Supplier Management</h1>
        <p className="mt-1 text-sm text-clinical-500">Coming soon</p>
      </div>
    </div>
  );
}
