import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/media";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Plus, Trash2, Megaphone, Tag, Package, Pencil, Save, X, Settings as SettingsIcon, Music } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, isMainAdmin, isModerator, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"products" | "categories" | "ads" | "settings">("products");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md mt-12 rounded-3xl border bg-card p-8 text-center shadow-card animate-bounce-in">
        <h1 className="font-display text-xl font-bold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <strong>{user.email}</strong> but this account isn't an admin.
          Ask the main admin to grant you access.
        </p>
      </div>
    );
  }

  const tabs = ([
    ["products", Package, "Products"],
    ...(isMainAdmin ? [
      ["categories", Tag, "Categories"],
      ["ads", Megaphone, "Ads"],
      ["settings", SettingsIcon, "Settings"],
    ] as const : []),
  ] as const);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-bold">
          {isMainAdmin ? "Main Admin Panel" : "Admin Panel"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isMainAdmin ? "Full control of Products Hub." : `Welcome ${user.email} — manage your products.`}
        </p>
      </header>
      <nav className="flex gap-2 flex-wrap">
        {tabs.map(([k, Icon, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as typeof tab)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition hover:scale-105 ${
              tab === k ? "bg-primary text-primary-foreground shadow-sky animate-glow" : "bg-card border hover:bg-accent"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="rounded-3xl border bg-card p-6 shadow-card">
        {tab === "products" && <ProductsAdmin userId={user.id} isMainAdmin={isMainAdmin} isModerator={isModerator} />}
        {tab === "categories" && isMainAdmin && <CategoriesAdmin />}
        {tab === "ads" && isMainAdmin && <AdsAdmin />}
        {tab === "settings" && isMainAdmin && <SettingsAdmin />}
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
          <CategoryRow key={c.id} c={c} onChanged={() => {
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
            qc.invalidateQueries({ queryKey: ["categories"] });
          }} onDelete={() => remove(c.id)} />
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground py-3">No categories yet.</p>}
      </div>
    </div>
  );
}

function CategoryRow({ c, onChanged, onDelete }: { c: any; onChanged: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [desc, setDesc] = useState(c.description ?? "");

  async function save() {
    if (!name.trim()) return toast.error("Name required");
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("categories").update({ name: name.trim(), slug, description: desc || null }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] py-3">
        <Input value={name} onChange={setName} placeholder="Name" />
        <Input value={desc} onChange={setDesc} placeholder="Description" />
        <div className="flex gap-1">
          <button onClick={save} className="rounded-lg bg-primary p-2 text-primary-foreground"><Save className="h-4 w-4" /></button>
          <button onClick={() => { setEditing(false); setName(c.name); setDesc(c.description ?? ""); }} className="rounded-lg border p-2"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-semibold">{c.name}</div>
        <div className="text-xs text-muted-foreground">/{c.slug}{c.description ? ` — ${c.description}` : ""}</div>
      </div>
      <div className="flex gap-1">
        <button onClick={() => setEditing(true)} className="rounded-lg p-2 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
        <button onClick={onDelete} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
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
  const { format } = useCurrency();
  return (
    <div className="flex gap-3 rounded-2xl border bg-background p-3">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
        {img && <img src={img} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{p.name}</div>
        <div className="text-xs text-muted-foreground">
          {format(Number(p.price), (p.price_currency ?? "USD") as CurrencyCode)}
          <span className="opacity-60"> · entered {p.price_currency ?? "USD"} {Number(p.price)}</span>
          {" · "}{p.categories?.name ?? "—"}
        </div>
        <div className="mt-2 flex gap-1">
          <button onClick={onEdit} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ProductForm({ categories, editing, onDone }: { categories: any[]; editing: any | null; onDone: () => void }) {
  const { code: viewerCode } = useCurrency();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<CurrencyCode>(viewerCode);
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
      setPriceCurrency((editing.price_currency ?? "USD") as CurrencyCode);
      setCategoryId(editing.category_id ?? "");
      setProductLink(editing.product_link ?? "");
      const extras: string[] = Array.isArray(editing.image_urls) ? editing.image_urls : [];
      const combined = editing.image_url ? [editing.image_url, ...extras.filter((x) => x !== editing.image_url)] : extras;
      setImagePaths(combined);
      setVideoPath(editing.video_url ?? null);
    }
  }, [editing]);

  function reset() {
    setName(""); setDescription(""); setPrice(""); setPriceCurrency(viewerCode); setCategoryId("");
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
      price_currency: priceCurrency,
      category_id: categoryId || null,
      product_link: productLink || null,
      image_url: imagePaths[0] ?? null,
      image_urls: imagePaths,
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
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px]">
        <Input value={name} onChange={setName} placeholder="Product name *" />
        <Input value={price} onChange={setPrice} placeholder="Price" type="number" />
        <select
          value={priceCurrency}
          onChange={(e) => setPriceCurrency(e.target.value as CurrencyCode)}
          title="Currency you are entering the price in"
          className="rounded-xl border bg-background px-3 py-2 text-sm cursor-pointer"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
          ))}
        </select>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Enter the price in any currency — visitors will see it auto-converted to whichever currency they pick in the header.
      </p>
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
        <MultiImageField paths={imagePaths} onPick={handleImages} onRemove={removeImage} uploading={uploadingImg} />
        <FileField label="Video" accept="video/*" current={videoPath} onPick={handleVideo} onClear={() => setVideoPath(null)} />
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
          <AdRow key={a.id} a={a} onChanged={() => {
            qc.invalidateQueries({ queryKey: ["admin-ads"] });
            qc.invalidateQueries({ queryKey: ["ads", "active"] });
          }} onToggle={() => toggle(a.id, a.active)} onDelete={() => remove(a.id)} />
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No ads yet.</p>}
      </div>
    </div>
  );
}

function AdRow({ a, onChanged, onToggle, onDelete }: { a: any; onChanged: () => void; onToggle: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(a.title);
  const [link, setLink] = useState(a.link_url ?? "");
  const [imagePath, setImagePath] = useState<string | null>(a.image_url ?? null);

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    const { error } = await supabase.from("ads").update({
      title: title.trim(), link_url: link || null, image_url: imagePath,
    }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setEditing(false);
    onChanged();
  }

  async function handleFile(file: File) {
    try { setImagePath(await uploadMedia(file, "ads")); toast.success("Image uploaded"); }
    catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  }

  if (editing) {
    return (
      <div className="rounded-xl border bg-background p-3 space-y-2">
        <Input value={title} onChange={setTitle} placeholder="Title" />
        <Input value={link} onChange={setLink} placeholder="Link URL" />
        <FileField label="Image" accept="image/*" current={imagePath} onPick={handleFile} onClear={() => setImagePath(null)} />
        <div className="flex gap-2">
          <button onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Save className="inline h-3.5 w-3.5" /> Save</button>
          <button onClick={() => { setEditing(false); setTitle(a.title); setLink(a.link_url ?? ""); setImagePath(a.image_url ?? null); }} className="rounded-lg border px-3 py-1.5 text-xs"><X className="inline h-3.5 w-3.5" /> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-background p-3">
      <div className="min-w-0">
        <div className="font-semibold truncate">{a.title}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[18rem]">{a.link_url ?? "—"}</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className={`rounded-full px-3 py-1 text-xs font-semibold ${a.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {a.active ? "Active" : "Inactive"}
        </button>
        <button onClick={() => setEditing(true)} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
        <button onClick={onDelete} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
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

function MultiImageField({ paths, onPick, onRemove, uploading }: { paths: string[]; onPick: (files: FileList) => void; onRemove: (i: number) => void; uploading: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-sm space-y-2">
      <div className="font-semibold">Images ({paths.length}) — first is the cover</div>
      {paths.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {paths.map((p, i) => (
            <MiniThumb key={p + i} path={p} onRemove={() => onRemove(i)} primary={i === 0} />
          ))}
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && e.target.files.length > 0 && onPick(e.target.files)}
        className="text-xs"
      />
      {uploading && <div className="text-xs text-muted-foreground">Uploading…</div>}
    </div>
  );
}

function MiniThumb({ path, onRemove, primary }: { path: string; onRemove: () => void; primary: boolean }) {
  const url = useResolvedMedia(path);
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-secondary">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {primary && <span className="absolute left-0 top-0 bg-primary px-1 text-[9px] font-bold text-primary-foreground rounded-br">★</span>}
      <button type="button" onClick={onRemove} className="absolute right-0 top-0 bg-destructive/90 px-1 text-[10px] font-bold text-destructive-foreground rounded-bl">×</button>
    </div>
  );
}

// ---------------- Settings ----------------
function SettingsAdmin() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
  const [bgPath, setBgPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const audioUrl = useResolvedMedia(bgPath);

  useEffect(() => {
    if (settingsQ.data) setBgPath(settingsQ.data.bg_music_url ?? null);
  }, [settingsQ.data]);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const path = await uploadMedia(file, "audio");
      setBgPath(path);
      toast.success("Uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const { error } = await supabase.from("site_settings").upsert({ id: 1, bg_music_url: bgPath, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  async function clearMusic() {
    setBgPath(null);
    const { error } = await supabase.from("site_settings").upsert({ id: 1, bg_music_url: null, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold flex items-center gap-2"><Music className="h-5 w-5 text-primary" /> Background Music</h3>
        <p className="text-xs text-muted-foreground mt-1">Upload an MP3/OGG/WAV. Visitors get a floating play button to start it (browsers block autoplay).</p>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Audio file</span>
        <input
          type="file"
          accept="audio/*"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:font-semibold"
        />
      </label>
      {audioUrl && (
        <div className="rounded-xl border bg-background p-3">
          <audio src={audioUrl} controls className="w-full" />
          <p className="mt-2 text-xs text-muted-foreground break-all">Path: {bgPath}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={save} disabled={uploading} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sky disabled:opacity-60">
          <Save className="inline h-4 w-4 mr-1" /> Save
        </button>
        {bgPath && (
          <button onClick={clearMusic} className="rounded-xl border px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
            <Trash2 className="inline h-4 w-4 mr-1" /> Remove music
          </button>
        )}
      </div>
    </div>
  );
}
