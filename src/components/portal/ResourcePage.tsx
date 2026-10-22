import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "./AppShell";
import { logAudit } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type FieldOption = { value: string; label: string };
export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "checkbox" | "email" | "file" | "tags";
  options?: FieldOption[];
  /** Load select options from a table. */
  source?: { table: string; label: string; value?: string; filter?: (q: any) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  required?: boolean;
  default?: unknown;
};
export type Column = { key: string; label: string; render?: (row: Row) => ReactNode; className?: string };

export function useOptions(source?: Field["source"]) {
  return useQuery({
    queryKey: ["options", source?.table, source?.label],
    enabled: !!source,
    queryFn: async () => {
      let q = db.from(source!.table).select("*");
      if (source!.filter) q = source!.filter(q);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data as Row[]).map((r) => ({ value: String(r[source!.value ?? "id"]), label: String(r[source!.label] ?? "") }));
    },
  });
}

function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const opts = useOptions(field.source);
  const options = field.options ?? opts.data ?? [];
  const id = `f-${field.name}`;
  let input: ReactNode;
  switch (field.type) {
    case "textarea":
      input = <Textarea id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} required={field.required} />;
      break;
    case "select":
      input = (
        <select
          id={id}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.required}
        >
          <option value="">Select...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "checkbox":
      return (
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor={id}>{field.label}</Label>
          <Switch id={id} checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case "file":
      input = <Input id={id} type="file" onChange={(e) => onChange(e.target.files?.[0] ?? null)} required={field.required} />;
      break;
    case "tags":
      input = (
        <Input
          id={id}
          placeholder="Comma separated"
          value={Array.isArray(value) ? value.join(", ") : ((value as string) ?? "")}
          onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      );
      break;
    default:
      input = (
        <Input
          id={id}
          type={field.type === "datetime" ? "datetime-local" : (field.type ?? "text")}
          step={field.type === "number" ? "any" : undefined}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {input}
    </div>
  );
}

export async function uploadClientFile(clientId: string, file: File, folder = "files") {
  const path = `${clientId}/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("client-files").upload(path, file);
  if (error) throw error;
  return path;
}

export async function openClientFile(path: string) {
  const { data, error } = await supabase.storage.from("client-files").createSignedUrl(path, 60);
  if (error) return toast.error(error.message);
  window.open(data.signedUrl, "_blank", "noopener");
}

export function RecordForm({
  fields,
  initial,
  onSubmit,
  submitLabel,
}: {
  fields: Field[];
  initial: Row;
  onSubmit: (values: Row) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<Row>(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit(values);
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((s: Row) => ({ ...s, [f.name]: v }))} />
      ))}
      <Button type="submit" className="w-full" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function ResourcePage({
  title,
  description,
  table,
  select = "*",
  columns,
  fields,
  editFields,
  filter,
  order = "created_at",
  ascending = false,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  createLabel = "New",
  prepare,
  afterSave,
  rowActions,
  header = true,
}: {
  title: string;
  description?: string;
  table: string;
  select?: string;
  columns: Column[];
  fields?: Field[];
  editFields?: Field[];
  filter?: (q: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  order?: string;
  ascending?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createLabel?: string;
  /** Transform form values before insert/update (e.g. upload files). */
  prepare?: (values: Row, mode: "create" | "edit") => Promise<Row>;
  afterSave?: (row: Row, mode: "create" | "edit") => Promise<void>;
  rowActions?: (row: Row, refresh: () => void) => ReactNode;
  header?: boolean;
}) {
  const qc = useQueryClient();
  const key = ["resource", table, select, title];
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = db.from(table).select(select);
      if (filter) q = filter(q);
      const { data, error } = await q.order(order, { ascending }).limit(500);
      if (error) throw error;
      return data as Row[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["resource", table] });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", table, id);
    },
    onSuccess: () => {
      toast.success("Deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function save(values: Row) {
    const mode = dialog!.mode;
    const flds = mode === "edit" ? (editFields ?? fields ?? []) : (fields ?? []);
    let payload: Row = {};
    for (const f of flds) {
      let v = values[f.name];
      if (v === "") v = null;
      if (f.type === "number" && v != null) v = Number(v);
      if (f.type === "datetime" && v) v = new Date(v as string).toISOString();
      payload[f.name] = v;
    }
    if (prepare) payload = await prepare(payload, mode);
    let saved: Row;
    if (mode === "create") {
      const { data, error } = await db.from(table).insert(payload).select().single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await db.from(table).update(payload).eq("id", dialog!.row!.id).select().single();
      if (error) throw error;
      saved = data;
    }
    await logAudit(mode === "create" ? "create" : "update", table, saved.id, payload);
    if (afterSave) await afterSave(saved, mode);
    toast.success(mode === "create" ? "Created" : "Saved");
    setDialog(null);
    refresh();
  }

  function initialFor(mode: "create" | "edit", row?: Row) {
    const flds = mode === "edit" ? (editFields ?? fields ?? []) : (fields ?? []);
    const init: Row = {};
    for (const f of flds) {
      let v = mode === "edit" ? row?.[f.name] : f.default;
      if (f.type === "datetime" && v) v = new Date(v).toISOString().slice(0, 16);
      if (f.type === "file") v = null;
      init[f.name] = v ?? (f.type === "checkbox" ? false : "");
    }
    return init;
  }

  const showActions = (canEdit && (editFields ?? fields)) || canDelete || rowActions;

  return (
    <div>
      {header && (
        <PageHeader
          title={title}
          description={description}
          actions={
            canCreate && fields ? (
              <Button onClick={() => setDialog({ mode: "create" })}>
                <Plus /> {createLabel}
              </Button>
            ) : undefined
          }
        />
      )}
      {!header && canCreate && fields && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
            <Plus /> {createLabel}
          </Button>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {list.isLoading ? (
          <EmptyState text="Loading..." />
        ) : list.error ? (
          <EmptyState text={(list.error as Error).message} />
        ) : !list.data?.length ? (
          <EmptyState text="Nothing here yet." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columns.map((c) => (
                    <TableHead key={c.key} className="text-xs font-medium uppercase tracking-wide">
                      {c.label}
                    </TableHead>
                  ))}
                  {showActions && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>
                        {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                      </TableCell>
                    ))}
                    {showActions && (
                      <TableCell className="whitespace-nowrap text-right">
                        {rowActions?.(row, refresh)}
                        {canEdit && (editFields ?? fields) && (
                          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setDialog({ mode: "edit", row })}>
                            <Pencil />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => confirm("Delete this record?") && del.mutate(row.id)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? `Edit` : createLabel}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <RecordForm
              fields={dialog.mode === "edit" ? (editFields ?? fields ?? []) : (fields ?? [])}
              initial={initialFor(dialog.mode, dialog.row)}
              onSubmit={save}
              submitLabel={dialog.mode === "edit" ? "Save changes" : "Create"}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
export const clientField: Field = { name: "client_id", label: "Client", type: "select", required: true, source: { table: "clients", label: "company_name" } };
export const clientCol: Column = { key: "client", label: "Client", render: (r) => r.clients?.company_name ?? "—" };
