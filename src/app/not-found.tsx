export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-maroon uppercase">Not found</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">This church was not found</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Check the address, or open the main site to find your congregation.
        </p>
      </div>
    </main>
  );
}
