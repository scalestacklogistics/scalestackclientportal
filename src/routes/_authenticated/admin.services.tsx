import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/portal/ResourcePage";
import { money } from "@/components/portal/AppShell";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({ meta: [{ title: "Services & Plans | ScaleStack Admin" }] }),
  component: Services,
});

const categories = [
  ["website", "Website Development"], ["ecommerce", "Shopify & E-commerce"], ["marketing", "Digital Marketing"],
  ["ads", "Google, Meta & TikTok Ads"], ["seo", "SEO, GEO & AEO"], ["ai", "AI Chatbots & Automation"], ["design", "Graphic Design"],
].map(([value, label]) => ({ value: value!, label: label! }));

function Services() {
  const { isAdmin } = useAdmin();
  return (
    <div className="space-y-10">
      <ResourcePage
        title="Services & plans"
        description="The agency service catalogue and the features each includes."
        table="services"
        order="name"
        ascending
        createLabel="New service"
        canCreate={isAdmin} canEdit={isAdmin} canDelete={isAdmin}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "category", label: "Category", type: "select", required: true, options: categories },
          { name: "description", label: "Description", type: "textarea" },
          { name: "features", label: "Features", type: "tags", default: [] },
        ]}
        columns={[
          { key: "name", label: "Service", className: "font-medium" },
          { key: "category", label: "Category", render: (r) => categories.find((c) => c.value === r.category)?.label },
          { key: "features", label: "Features", className: "max-w-md text-muted-foreground", render: (r) => r.features.join(", ") },
        ]}
      />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Plans</h2>
        <ResourcePage
          header={false}
          title="Plans"
          table="plans"
          select="*, services(name)"
          createLabel="New plan"
          canCreate={isAdmin} canEdit={isAdmin} canDelete={isAdmin}
          fields={[
            { name: "service_id", label: "Service", type: "select", required: true, source: { table: "services", label: "name" } },
            { name: "name", label: "Plan name", required: true },
            { name: "price", label: "Price (GBP)", type: "number", required: true },
            { name: "billing_interval", label: "Billing", type: "select", default: "monthly", options: ["monthly", "quarterly", "yearly", "one-off"].map((v) => ({ value: v, label: v })) },
            { name: "description", label: "Description" },
          ]}
          columns={[
            { key: "service", label: "Service", render: (r) => r.services?.name },
            { key: "name", label: "Plan", className: "font-medium" },
            { key: "price", label: "Price", render: (r) => `${money(r.price)} / ${r.billing_interval}` },
          ]}
        />
      </div>
    </div>
  );
}
