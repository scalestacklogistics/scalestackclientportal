import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, BarChart3, FileText, LifeBuoy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/portal/Logo";
import { homePathForRoles, useRoles, useUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScaleStack Client Portal" },
      { name: "description", content: "Track projects, reports, invoices and support with ScaleStack Technologies." },
      { property: "og:title", content: "ScaleStack Client Portal" },
      { property: "og:description", content: "Track projects, reports, invoices and support with ScaleStack Technologies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: BarChart3, title: "Live project progress", text: "Milestones, deadlines and status in one place." },
  { icon: FileText, title: "Reports and deliverables", text: "Monthly performance reports and files, securely shared." },
  { icon: LifeBuoy, title: "Direct support", text: "Open tickets and message your account team." },
  { icon: ShieldCheck, title: "Private by design", text: "Every client sees only their own data." },
];

function Index() {
  const { user } = useUser();
  const roles = useRoles(user?.id);
  const navigate = useNavigate();
  useEffect(() => {
    if (user && roles.data) navigate({ to: homePathForRoles(roles.data) });
  }, [user, roles.data, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            ScaleStack Technologies
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Your agency work, <span className="text-primary">fully visible.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            One secure workspace for your services, projects, reports, files, invoices and support.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Access your portal <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
