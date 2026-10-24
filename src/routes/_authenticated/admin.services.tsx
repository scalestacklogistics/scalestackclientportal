import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/portal/ResourcePage";
import { money } from "@/components/portal/AppShell";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({ meta: [{ title: "Services & Plans | ScaleStack Admin" }] }),
  component: Services,
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function Services() {
  const { isAdmin } = useAdmin();
  const can = { canCreate: isAdmin, canEdit: isAdmin, canDelete: isAdmin };
  return (
    <div className="space-y-10">
      <ResourcePage
        title="Services & plans"
        description="The agency service catalogue and the features each includes."
        table="services"
        select="*, service_categories(name)"
        order="name"
        ascending
        createLabel="New service"
        {...can}
        searchKeys={["name", "description", "service_categories.name"]}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "category_id", label: "Category", type: "select", required: true, source: { table: "service_categories", label: "name" } },
          { name: "description", label: "Description", type: "textarea" },
          { name: "features", label: "Features", type: "tags", default: [] },
        ]}
        prepare={async (v) => ({ ...v, features: v.features ?? [] })}
        columns={[
          { key: "name", label: "Service", className: "font-medium" },
          { key: "category", label: "Category", sortKey: "service_categories.name", render: (r) => r.service_categories?.name ?? "—" },
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
          {...can}
          searchKeys={["name", "services.name"]}
          fields={[
            { name: "service_id", label: "Service", type: "select", required: true, source: { table: "services", label: "name" } },
            { name: "name", label: "Plan name", required: true },
            { name: "price", label: "Price (GBP)", type: "number", required: true },
            { name: "billing_interval", label: "Billing", type: "select", default: "monthly", options: ["monthly", "quarterly", "yearly", "one-off"].map((v) => ({ value: v, label: v })) },
            { name: "description", label: "Description" },
          ]}
          prepare={async (v) => {
            if (Number(v.price) < 0) throw new Error("Price cannot be negative.");
            return v;
          }}
          columns={[
            { key: "service", label: "Service", sortKey: "services.name", render: (r) => r.services?.name },
            { key: "name", label: "Plan", className: "font-medium" },
            { key: "price", label: "Price", sortKey: "price", render: (r) => `${money(r.price)} / ${r.billing_interval}` },
          ]}
        />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Service categories</h2>
        <ResourcePage
          header={false}
          title="Categories"
          table="service_categories"
          order="name"
          ascending
          createLabel="New category"
          {...can}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "description", label: "Description" },
          ]}
          editFields={[
            { name: "name", label: "Name", required: true },
            { name: "description", label: "Description" },
          ]}
          prepare={async (v, mode) => (mode === "create" ? { ...v, slug: slugify(String(v.name)) } : v)}
          columns={[
            { key: "name", label: "Category", className: "font-medium" },
            { key: "description", label: "Description", className: "text-muted-foreground" },
          ]}
        />
      </div>
    </div>
  );
}
