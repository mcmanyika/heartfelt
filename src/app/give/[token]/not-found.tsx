export default function GiveNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-navy">Payment button not found</h1>
        <p className="mt-2 text-sm text-gray-600">This button is inactive or the link is incorrect.</p>
      </section>
    </main>
  );
}
