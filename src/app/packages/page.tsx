import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/lib/tenant/config";
import { requestApexOrigin } from "@/lib/tenant/request-origin";
import { resolveTenant } from "@/lib/tenant/get-tenant";

export const metadata: Metadata = {
  title: `Packages · ${PRODUCT_NAME}`,
  description: "Subscription packages, setup fees, and volume discounts for each church location.",
};

const plans = [
  {
    name: "Quarterly",
    term: "3 months",
    price: "$240",
    featured: false,
    costs: [
      ["Cloud hosting & infrastructure", "$60"],
      ["Development & maintenance", "$70"],
      ["Support & training", "$50"],
      ["Security & backups", "$35"],
      ["Administration & operations", "$25"],
    ],
    features: [
      "All platform features",
      "Unlimited members",
      "Events & programs",
      "Online giving & payments",
      "Communication tools",
      "Basic reporting",
      "Email support",
    ],
  },
  {
    name: "Half-year",
    term: "6 months",
    price: "$480",
    featured: false,
    costs: [
      ["Cloud hosting & infrastructure", "$120"],
      ["Development & maintenance", "$140"],
      ["Support & training", "$100"],
      ["Security & backups", "$70"],
      ["Administration & operations", "$50"],
    ],
    features: [
      "All platform features",
      "Unlimited members",
      "Events & programs",
      "Online giving & payments",
      "Communication tools",
      "Advanced reporting",
      "Priority support",
    ],
  },
  {
    name: "Yearly",
    term: "12 months",
    price: "$768",
    featured: true,
    badge: "Save 20%",
    costs: [
      ["Cloud hosting & infrastructure", "$240"],
      ["Development & maintenance", "$280"],
      ["Support & training", "$200"],
      ["Security & backups", "$140"],
      ["Administration & operations", "$100"],
    ],
    features: [
      "All platform features",
      "Unlimited members",
      "Events & programs",
      "Online giving & payments",
      "Communication tools",
      "Advanced reporting",
      "Priority support",
      "Free feature updates",
    ],
  },
] as const;

const headquartersIncludes = [
  "Denomination account setup",
  "Organizational hierarchy configuration",
  "Branding & customization",
  "Administrator training",
  "Reporting setup",
  "Initial data migration assistance",
];

const branchFees = [
  ["1–100", "$100"],
  ["101–250", "$250"],
  ["251–500", "$500"],
  ["501–1,000", "$750"],
  ["1,001+", "$750"],
];

const volumeDiscounts = [
  ["1–10", "0%"],
  ["11–50", "5%"],
  ["51–100", "10%"],
  ["101–250", "15%"],
  ["251+", "Negotiated"],
];

const included = [
  {
    title: "Cloud hosting & infrastructure",
    points: ["Secure cloud servers", "High availability", "Scalable infrastructure", "99.9% uptime"],
  },
  {
    title: "Development & maintenance",
    points: ["Platform development", "Regular updates", "New feature releases", "Bug fixes"],
  },
  {
    title: "Support & training",
    points: ["User training resources", "Live support by email and chat", "Onboarding assistance", "Help documentation"],
  },
  {
    title: "Security & backups",
    points: ["Data encryption", "Regular backups", "Disaster recovery", "Continuous monitoring"],
  },
  {
    title: "Administration & operations",
    points: ["System administration", "Performance monitoring", "Database management", "Account management"],
  },
];

export default async function PackagesPage() {
  const resolution = await resolveTenant();
  if (resolution.kind === "tenant") {
    redirect("/login");
  }
  if (resolution.kind === "missing") {
    redirect(await requestApexOrigin());
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-maroon uppercase">{PRODUCT_NAME}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Packages and cost breakdown
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            Subscriptions are priced per location. A church administrator pays the chosen package with Stripe from the dashboard. Setup is a one-time fee for headquarters and each branch.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-navy">
            Home
          </Link>
          <Link href="/start" className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#761834]">
            Start your church
          </Link>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="subscriptions">
        <h2 id="subscriptions" className="text-sm font-semibold tracking-wide text-navy uppercase">
          Subscription packages
          <span className="ml-2 font-medium tracking-normal text-gray-500 normal-case">per location</span>
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                plan.featured
                  ? "flex flex-col rounded-2xl bg-navy p-5 text-white"
                  : "flex flex-col rounded-2xl border border-border bg-card p-5"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={plan.featured ? "text-sm font-semibold tracking-wide uppercase" : "text-sm font-semibold tracking-wide text-navy uppercase"}>
                    {plan.name}
                  </h3>
                  <p className={plan.featured ? "mt-1 text-xs text-white/70" : "mt-1 text-xs text-gray-500"}>{plan.term}</p>
                </div>
                {"badge" in plan && plan.badge ? (
                  <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-navy">{plan.badge}</span>
                ) : null}
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-tight">{plan.price}</p>
              <p className={plan.featured ? "text-sm text-white/70" : "text-sm text-gray-500"}>per location</p>

              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className={plan.featured ? "text-left text-xs tracking-wide text-white/60 uppercase" : "text-left text-xs tracking-wide text-gray-500 uppercase"}>
                    <th className="pb-2 font-medium">Feature</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.costs.map(([label, amount]) => (
                    <tr key={label} className={plan.featured ? "border-t border-white/10" : "border-t border-border"}>
                      <td className="py-2 pr-3">{label}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className={plan.featured ? "text-gold" : "text-maroon"} aria-hidden="true">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3" aria-label="Setup fees">
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold tracking-wide text-navy uppercase">One-time setup fees</p>
          <h2 className="mt-3 text-sm font-semibold text-navy">Headquarters setup and onboarding</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-navy">$1,250</p>
          <p className="text-sm text-gray-500">USD, once</p>
          <ul className="mt-5 space-y-2 text-sm text-navy">
            {headquartersIncludes.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-maroon" aria-hidden="true">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <FeeTable
          eyebrow="Branch setup fees"
          title="One-time fee by membership"
          columns={["Members per branch", "Setup fee"]}
          rows={branchFees}
        />
        <FeeTable
          eyebrow="Volume discounts"
          title="Multi-location subscription"
          columns={["Number of locations", "Discount"]}
          rows={volumeDiscounts}
        />
      </section>

      <section className="mt-10" aria-labelledby="included">
        <h2 id="included" className="text-sm font-semibold tracking-wide text-navy uppercase">
          What’s included in each package
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {included.map((group) => (
            <article key={group.title} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-navy">{group.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {group.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-10 flex flex-col gap-4 rounded-2xl bg-navy px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold">Ready to open your church?</p>
          <p className="mt-1 text-sm text-white/70">Create the organization, first campus, and administrator account.</p>
        </div>
        <Link href="/start" className="inline-flex justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-navy">
          Start your church
        </Link>
      </footer>
    </main>
  );
}

function FeeTable({
  eyebrow,
  title,
  columns,
  rows,
}: {
  eyebrow: string;
  title: string;
  columns: [string, string];
  rows: string[][];
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold tracking-wide text-navy uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-sm font-semibold text-navy">{title}</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-gray-500 uppercase">
            <th className="pb-2 font-medium">{columns[0]}</th>
            <th className="pb-2 text-right font-medium">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-border">
              <td className="py-2 text-navy">{label}</td>
              <td className="py-2 text-right font-medium text-navy tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
