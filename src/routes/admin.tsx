import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/media";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { toast } from "sonner";
import { Plus, Trash2, Megaphone, Tag, Package, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"products" | "categories" | "ads">("products");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md mt-12 rounded-3xl border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-xl font-bold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <strong>{user.email}</strong> but this account isn't an admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage your Products Hub.</p>
      </header>
      <nav className="flex gap-2 flex-wrap">
        {([
          ["products", Package, "Products"],
          ["categories", Tag, "Categories"],
          ["ads", Megaphone, "Ads"],
        ] as const).map(([k, Icon, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === k ? "bg-primary text-primary-foreground shadow-sky" : "bg-card border hover:bg-accent"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="rounded-3xl border bg-card p-6 shadow-card">
        {tab === "products" && <ProductsAdmin />}
        {tab === "categories" && <CategoriesAdmin />}
        {tab === "ads" && <AdsAdmin />}
      </div>
    </div>
  );
}

// ---------------- Categories ----------------
function CategoriesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const list = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("categories").insert({ name: name.trim(), slug, description: desc || null });
    if (error) return toast.error(error.message);
    toast.success("Category added");
    setName(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={name} onChange={setName} placeholder="Category name" />
        <Input value={desc} onChange={setDesc} placeholder="Description (optional)" />
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sky">
          <Plus className="inline h-4 w-4" /> Add
        </button>
      </form>
      <div className="divide-y">
        {list.data?.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">/{c.slug}{c.description ? ` — ${c.description}` : ""}</div>
            </div>
            <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground py-3">No categories yet.</p>}
      </div>
    </div>
  );
}

// ---------------- Products ----------------
function ProductsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const cats = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const list = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products", "latest"] });
  }

  return (
    <div className="space-y-6">
      <ProductForm
        categories={cats.data ?? []}
        editing={editing}
        onDone={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          qc.invalidateQueries({ queryKey: ["products", "latest"] });
        }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {list.data?.map((p) => (
          <AdminProductRow key={p.id} p={p} onEdit={() => setEditing(p)} onDelete={() => remove(p.id)} />
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
      </div>
    </div>
  );
}

function AdminProductRow({ p, onEdit, onDelete }: { p: any; onEdit: () => void; onDelete: () => void }) {
  const img = useResolvedMedia(p.image_url);
  return (
    <div className="flex gap-3 rounded-2xl border bg-background p-3">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
        {img && <img src={img} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{p.name}</div>
        <div className="text-xs text-muted-foreground">${Number(p.price).toFixed(2)} · {p.categories?.name ?? "—"}</div>
        <div className="mt-2 flex gap-1">
          <button onClick={onEdit} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ProductForm({ categories, editing, onDone }: { categories: any[]; editing: any | null; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [productLink, setProductLink] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name ?? "");
      setDescription(editing.description ?? "");
      setPrice(String(editing.price ?? ""));
      setCategoryId(editing.category_id ?? "");
      setProductLink(editing.product_link ?? "");
      const extras: string[] = Array.isArray(editing.image_urls) ? editing.image_urls : [];
      const combined = editing.image_url ? [editing.image_url, ...extras.filter((x) => x !== editing.image_url)] : extras;
      setImagePaths(combined);
      setVideoPath(editing.video_url ?? null);
    }
  }, [editing]);

  function reset() {
    setName(""); setDescription(""); setPrice(""); setCategoryId("");
    setProductLink(""); setImagePaths([]); setVideoPath(null);
  }

  async function handleImages(files: FileList) {
    setUploadingImg(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        uploaded.push(await uploadMedia(f, "image"));
      }
      setImagePaths((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingImg(false);
    }
  }

  async function handleVideo(file: File) {
    try {
      const path = await uploadMedia(file, "video");
      setVideoPath(path);
      toast.success("video uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  }

  function removeImage(idx: number) {
    setImagePaths((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description || null,
      price: Number(price) || 0,
      category_id: categoryId || null,
      product_link: productLink || null,
      image_url: imagePath,
      video_url: videoPath,
    };
    const op = editing
      ? supabase.from("products").update(payload).eq("id", editing.id)
      : supabase.from("products").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Created");
    reset();
    onDone();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-background p-4 space-y-3">
      <div className="font-semibold">{editing ? "Edit product" : "Add new product"}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={name} onChange={setName} placeholder="Product name *" />
        <Input value={price} onChange={setPrice} placeholder="Price" type="number" />
      </div>
      <Textarea value={description} onChange={setDescription} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl border bg-background px-3 py-2 text-sm"
        >
          <option value="">— Category —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input value={productLink} onChange={setProductLink} placeholder="External product link (https://…)" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FileField label="Image" accept="image/*" current={imagePath} onPick={(f) => handleFile(f, "image")} onClear={() => setImagePath(null)} />
        <FileField label="Video" accept="video/*" current={videoPath} onPick={(f) => handleFile(f, "video")} onClear={() => setVideoPath(null)} />
      </div>
      <div className="flex gap-2 pt-2">
        <button disabled={saving} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sky disabled:opacity-60">
          {saving ? "Saving…" : editing ? "Update" : "Create"}
        </button>
        {editing && (
          <button type="button" onClick={() => { reset(); onDone(); }} className="rounded-xl border px-4 py-2 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------- Ads ----------------
function AdsAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => (await supabase.from("ads").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await supabase.from("ads").insert({
      title: title.trim(), link_url: link || null, image_url: imagePath, active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Ad added");
    setTitle(""); setLink(""); setImagePath(null);
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
    qc.invalidateQueries({ queryKey: ["ads", "active"] });
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("ads").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
    qc.invalidateQueries({ queryKey: ["ads", "active"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this ad?")) return;
    await supabase.from("ads").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
    qc.invalidateQueries({ queryKey: ["ads", "active"] });
  }

  async function handleFile(file: File) {
    try { setImagePath(await uploadMedia(file, "ads")); toast.success("Image uploaded"); }
    catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-2xl border bg-background p-4 space-y-3">
        <div className="font-semibold">New ad</div>
        <Input value={title} onChange={setTitle} placeholder="Ad title *" />
        <Input value={link} onChange={setLink} placeholder="Link URL (https://…)" />
        <FileField label="Image" accept="image/*" current={imagePath} onPick={handleFile} onClear={() => setImagePath(null)} />
        <button className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sky">
          <Plus className="inline h-4 w-4" /> Add ad
        </button>
      </form>
      <div className="space-y-2">
        {list.data?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
            <div>
              <div className="font-semibold">{a.title}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[18rem]">{a.link_url ?? "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(a.id, a.active)} className={`rounded-full px-3 py-1 text-xs font-semibold ${a.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {a.active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => remove(a.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No ads yet.</p>}
      </div>
    </div>
  );
}

// ---------------- Shared inputs ----------------
function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function FileField({ label, accept, current, onPick, onClear }: { label: string; accept: string; current: string | null; onPick: (f: File) => void; onClear: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-sm">
      <div className="font-semibold mb-1">{label}</div>
      {current ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">{current}</span>
          <button type="button" onClick={onClear} className="text-xs text-destructive">Clear</button>
        </div>
      ) : (
        <input type="file" accept={accept} onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} className="text-xs" />
      )}
    </div>
  );
}
