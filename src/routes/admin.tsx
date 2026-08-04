import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/media";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { PosterDialog } from "@/components/PosterDialog";
import { Plus, Trash2, Megaphone, Tag, Package, Pencil, Save, X, Settings as SettingsIcon, Music, Shield, ImageDown } from "lucide-react";

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
function ProductsAdmin({ userId, isMainAdmin, isModerator }: { userId: string; isMainAdmin: boolean; isModerator: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const cats = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const list = useQuery({
    queryKey: ["admin-products", isMainAdmin ? "all" : userId],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (!isMainAdmin) q = q.eq("owner_id", userId);
      const { data, error } = await q;
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

  function canEdit(p: any) {
    return isMainAdmin || (isModerator && p.owner_id === userId);
  }

  return (
    <div className="space-y-6">
      <ProductForm
        categories={cats.data ?? []}
        editing={editing}
        ownerId={userId}
        onDone={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          qc.invalidateQueries({ queryKey: ["products", "latest"] });
        }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {list.data?.map((p) => (
          <AdminProductRow
            key={p.id}
            p={p}
            canEdit={canEdit(p)}
            onEdit={() => setEditing(p)}
            onDelete={() => remove(p.id)}
          />
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
      </div>
    </div>
  );
}

function AdminProductRow({ p, canEdit, onEdit, onDelete }: { p: any; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
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
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {canEdit ? (
            <>
              <button onClick={onEdit} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={onDelete} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">read-only (owned by another admin)</span>
          )}
          <PosterDialog product={p} variant="ghost" />
        </div>
      </div>
    </div>
  );
}

function ProductForm({ categories, editing, ownerId, onDone }: { categories: any[]; editing: any | null; ownerId: string; onDone: () => void }) {
  const { code: viewerCode } = useCurrency();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<CurrencyCode>(viewerCode);
  const [categoryId, setCategoryId] = useState<string>("");
  const [productLink, setProductLink] = useState("");
  const [isDigital, setIsDigital] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
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
      setIsDigital(!!editing.is_digital);
      setDownloadUrl(editing.download_url ?? "");
      const extras: string[] = Array.isArray(editing.image_urls) ? editing.image_urls : [];
      const combined = editing.image_url ? [editing.image_url, ...extras.filter((x) => x !== editing.image_url)] : extras;
      setImagePaths(combined);
      setVideoPath(editing.video_url ?? null);
    }
  }, [editing]);

  function reset() {
    setName(""); setDescription(""); setPrice(""); setPriceCurrency(viewerCode); setCategoryId("");
    setProductLink(""); setImagePaths([]); setVideoPath(null);
    setIsDigital(false); setDownloadUrl("");
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
    const payload: any = {
      name: name.trim(),
      description: description || null,
      price: Number(price) || 0,
      price_currency: priceCurrency,
      category_id: categoryId || null,
      product_link: productLink || null,
      is_digital: isDigital,
      download_url: isDigital ? (downloadUrl || null) : null,
      image_url: imagePaths[0] ?? null,
      image_urls: imagePaths,
      video_url: videoPath,
    };
    if (!editing) payload.owner_id = ownerId;
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
      <div className="rounded-xl border bg-secondary/40 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={isDigital}
            onChange={(e) => setIsDigital(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Digital product (ebook, course, software, template…)
        </label>
        {isDigital && (
          <Input
            value={downloadUrl}
            onChange={setDownloadUrl}
            placeholder="Download / access link (https://…)"
          />
        )}
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
  const [position, setPosition] = useState<"grid" | "banner">("banner");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [sortOrder, setSortOrder] = useState("0");

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
    qc.invalidateQueries({ queryKey: ["ads", "active"] });
    qc.invalidateQueries({ queryKey: ["ads", "active", "grid"] });
    qc.invalidateQueries({ queryKey: ["ads", "banner"] });
  }

  const list = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => (await supabase.from("ads").select("*").order("position").order("sort_order")).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await (supabase as any).from("ads").insert({
      title: title.trim(),
      link_url: link || null,
      image_url: imagePath,
      active: true,
      position,
      media_type: mediaType,
      sort_order: Number(sortOrder) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Ad added");
    setTitle(""); setLink(""); setImagePath(null); setSortOrder("0");
    invalidateAll();
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("ads").update({ active: !active }).eq("id", id);
    invalidateAll();
  }
  async function remove(id: string) {
    if (!confirm("Delete this ad?")) return;
    await supabase.from("ads").delete().eq("id", id);
    invalidateAll();
  }

  async function handleFile(file: File) {
    try { setImagePath(await uploadMedia(file, "ads")); toast.success("Uploaded"); }
    catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-2xl border bg-background p-4 space-y-3">
        <div className="font-semibold">New ad</div>
        <Input value={title} onChange={setTitle} placeholder="Ad title *" />
        <Input value={link} onChange={setLink} placeholder="Link URL (https://…)" />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="space-y-1">
            <span className="font-medium">Placement</span>
            <select value={position} onChange={(e) => setPosition(e.target.value as any)}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
              <option value="banner">Full-width banner (top strip)</option>
              <option value="grid">Sidebar / grid card</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Media type</span>
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Order</span>
            <Input value={sortOrder} onChange={setSortOrder} placeholder="0" type="number" />
          </label>
        </div>
        <FileField
          label={mediaType === "video" ? "Video (mp4/webm)" : "Image"}
          accept={mediaType === "video" ? "video/*" : "image/*"}
          current={imagePath}
          onPick={handleFile}
          onClear={() => setImagePath(null)}
        />
        <button className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sky">
          <Plus className="inline h-4 w-4" /> Add ad
        </button>
      </form>
      <div className="space-y-2">
        {list.data?.map((a) => (
          <AdRow key={a.id} a={a} onChanged={invalidateAll}
            onToggle={() => toggle(a.id, a.active)} onDelete={() => remove(a.id)} />
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
  const [position, setPosition] = useState<"grid" | "banner">((a.position ?? "grid") as any);
  const [mediaType, setMediaType] = useState<"image" | "video">((a.media_type ?? "image") as any);
  const [sortOrder, setSortOrder] = useState(String(a.sort_order ?? 0));

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    const { error } = await (supabase as any).from("ads").update({
      title: title.trim(),
      link_url: link || null,
      image_url: imagePath,
      position,
      media_type: mediaType,
      sort_order: Number(sortOrder) || 0,
    }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setEditing(false);
    onChanged();
  }

  async function handleFile(file: File) {
    try { setImagePath(await uploadMedia(file, "ads")); toast.success("Uploaded"); }
    catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  }

  if (editing) {
    return (
      <div className="rounded-xl border bg-background p-3 space-y-2">
        <Input value={title} onChange={setTitle} placeholder="Title" />
        <Input value={link} onChange={setLink} placeholder="Link URL" />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <select value={position} onChange={(e) => setPosition(e.target.value as any)}
            className="rounded-xl border bg-background px-3 py-2 text-sm">
            <option value="banner">Banner</option>
            <option value="grid">Grid</option>
          </select>
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}
            className="rounded-xl border bg-background px-3 py-2 text-sm">
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <Input value={sortOrder} onChange={setSortOrder} placeholder="Order" type="number" />
        </div>
        <FileField
          label={mediaType === "video" ? "Video" : "Image"}
          accept={mediaType === "video" ? "video/*" : "image/*"}
          current={imagePath}
          onPick={handleFile}
          onClear={() => setImagePath(null)}
        />
        <div className="flex gap-2">
          <button onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Save className="inline h-3.5 w-3.5" /> Save</button>
          <button onClick={() => { setEditing(false); }} className="rounded-lg border px-3 py-1.5 text-xs"><X className="inline h-3.5 w-3.5" /> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-background p-3">
      <div className="min-w-0">
        <div className="font-semibold truncate flex items-center gap-2">
          {a.title}
          <span className="text-[10px] font-normal bg-muted rounded-full px-2 py-0.5">
            {(a.position ?? "grid") === "banner" ? "Banner" : "Grid"} · {a.media_type ?? "image"}
          </span>
        </div>
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
    <div className="space-y-8">
      {/* Background music */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold flex items-center gap-2"><Music className="h-5 w-5 text-primary" /> Background Music</h3>
        <p className="text-xs text-muted-foreground">Upload an MP3/OGG/WAV. Visitors get a floating play button (browsers block autoplay).</p>
        <input
          type="file"
          accept="audio/*"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:font-semibold"
        />
        {audioUrl && (
          <div className="rounded-xl border bg-background p-3">
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={save} disabled={uploading} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sky disabled:opacity-60">
            <Save className="inline h-4 w-4 mr-1" /> Save music
          </button>
          {bgPath && (
            <button onClick={clearMusic} className="rounded-xl border px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
              <Trash2 className="inline h-4 w-4 mr-1" /> Remove
            </button>
          )}
        </div>
      </section>

      {/* Poster access */}
      <PosterAccessAdmin settings={settingsQ.data} />

      {/* Theme */}
      <ThemeEditor settings={settingsQ.data} />

      {/* Moderators */}
      <ContactAdmin settings={settingsQ.data} />

      <ModeratorsAdmin />
    </div>
  );
}

// ---------------- Theme editor ----------------
const PRESET_THEMES = [
  { label: "Sky (default)", primary: "", accent: "", background: "" },
  { label: "Sunset Pink", primary: "oklch(0.70 0.18 15)", accent: "oklch(0.88 0.10 30)", background: "oklch(0.99 0.01 30)" },
  { label: "Forest", primary: "oklch(0.55 0.14 150)", accent: "oklch(0.85 0.10 150)", background: "oklch(0.99 0.01 150)" },
  { label: "Royal Purple", primary: "oklch(0.55 0.22 295)", accent: "oklch(0.85 0.10 295)", background: "oklch(0.99 0.01 290)" },
  { label: "Midnight", primary: "oklch(0.65 0.18 250)", accent: "oklch(0.50 0.10 250)", background: "oklch(0.20 0.04 250)" },
  { label: "Coral", primary: "oklch(0.70 0.18 30)", accent: "oklch(0.88 0.10 50)", background: "oklch(0.99 0.01 50)" },
  { label: "Instagram", primary: "oklch(0.62 0.24 340)", accent: "oklch(0.75 0.18 55)", background: "oklch(0.98 0.01 320)" },
  { label: "Ocean", primary: "oklch(0.60 0.16 200)", accent: "oklch(0.82 0.11 190)", background: "oklch(0.99 0.01 200)" },
];

function ThemeEditor({ settings }: { settings: any }) {
  const qc = useQueryClient();
  const [primary, setPrimary] = useState("");
  const [accent, setAccent] = useState("");
  const [background, setBackground] = useState("");

  useEffect(() => {
    if (settings) {
      setPrimary(settings.theme_primary ?? "");
      setAccent(settings.theme_accent ?? "");
      setBackground(settings.theme_background ?? "");
    }
  }, [settings]);

  async function saveTheme(p = primary, a = accent, b = background) {
    const { error } = await (supabase as any).from("site_settings").upsert({
      id: 1, theme_primary: p || null, theme_accent: a || null, theme_background: b || null, updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    setPrimary(p); setAccent(a); setBackground(b);
    toast.success("Theme updated");
    qc.invalidateQueries({ queryKey: ["site-settings", "theme"] });
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  return (
    <section className="space-y-3 border-t pt-6">
      <h3 className="font-display text-lg font-bold flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" /> Theme
      </h3>
      <p className="text-xs text-muted-foreground">Pick a preset or fine-tune colors. Visitors see the change instantly.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESET_THEMES.map((t) => (
          <button
            key={t.label}
            onClick={() => saveTheme(t.primary, t.accent, t.background)}
            className="rounded-xl border bg-background p-3 text-left hover:scale-[1.03] transition shadow-card"
          >
            <div className="flex gap-1 mb-2">
              <span className="h-4 w-4 rounded-full border" style={{ background: t.primary || "var(--primary)" }} />
              <span className="h-4 w-4 rounded-full border" style={{ background: t.accent || "var(--accent)" }} />
              <span className="h-4 w-4 rounded-full border" style={{ background: t.background || "var(--background)" }} />
            </div>
            <div className="text-xs font-semibold">{t.label}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs space-y-1">
          <span className="font-medium">Primary (oklch / css color)</span>
          <Input value={primary} onChange={setPrimary} placeholder="oklch(0.68 0.16 235)" />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-medium">Accent</span>
          <Input value={accent} onChange={setAccent} placeholder="oklch(0.88 0.09 220)" />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-medium">Background</span>
          <Input value={background} onChange={setBackground} placeholder="oklch(0.99 0.01 220)" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => saveTheme()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sky">
          <Save className="inline h-4 w-4 mr-1" /> Save theme
        </button>
        <button onClick={() => saveTheme("", "", "")} className="rounded-xl border px-4 py-2 text-sm font-medium">
          Reset to default
        </button>
      </div>
    </section>
  );
}

// ---------------- Moderators ----------------
function ModeratorsAdmin() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const mods = useQuery({
    queryKey: ["moderators-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_moderators");
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; email: string; created_at: string }>;
    },
  });

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("grant_moderator", { _email: email.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data?.ok === false) {
      if (data.error === "user_not_found") return toast.error("No user with that email — they must sign up first.");
      if (data.error === "forbidden") return toast.error("Only the main admin can do this.");
      return toast.error("Unable to grant.");
    }
    toast.success("Granted admin access");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["moderators-list"] });
  }

  async function revoke(user_id: string) {
    if (!confirm("Remove admin access for this user?")) return;
    const { error } = await (supabase as any).rpc("revoke_moderator", { _user_id: user_id });
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    qc.invalidateQueries({ queryKey: ["moderators-list"] });
  }

  return (
    <section className="space-y-3 border-t pt-6">
      <h3 className="font-display text-lg font-bold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" /> Admins (simple admins)
      </h3>
      <p className="text-xs text-muted-foreground">
        Enter the email of any signed-up user to give them admin powers — they'll be able to add, edit, and delete <em>their own</em> products only. You (main admin) can edit or remove anything.
      </p>
      <form onSubmit={grant} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input value={email} onChange={setEmail} placeholder="user@example.com" />
        <button disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sky disabled:opacity-60">
          <Plus className="inline h-4 w-4 mr-1" /> Grant access
        </button>
      </form>
      <div className="divide-y rounded-2xl border bg-background">
        {mods.isLoading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
        {mods.data?.length === 0 && <div className="p-3 text-sm text-muted-foreground">No admins yet.</div>}
        {mods.data?.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-semibold text-sm">{m.email}</div>
              <div className="text-[11px] text-muted-foreground">since {new Date(m.created_at).toLocaleDateString()}</div>
            </div>
            <button onClick={() => revoke(m.user_id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------- Contact info ----------------
function ContactAdmin({ settings }: { settings: any }) {
  const qc = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (settings) {
      setWhatsapp(settings.contact_whatsapp ?? "");
      setInstagram(settings.contact_instagram ?? "");
      setUrl(settings.contact_url ?? "");
      setEmail(settings.contact_email ?? "");
    }
  }, [settings]);

  async function save() {
    const { error } = await (supabase as any).from("site_settings").upsert({
      id: 1,
      contact_whatsapp: whatsapp.trim() || null,
      contact_instagram: instagram.trim() || null,
      contact_url: url.trim() || null,
      contact_email: email.trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Contact info saved");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    qc.invalidateQueries({ queryKey: ["site-settings", "contact"] });
  }

  return (
    <section className="space-y-3 border-t pt-6">
      <h3 className="font-display text-lg font-bold flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" /> Contact info
      </h3>
      <p className="text-xs text-muted-foreground">
        Fill any of these — visitors will only see a "Contact us" section when at least one is set.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs space-y-1">
          <span className="font-medium">WhatsApp number (with country code)</span>
          <Input value={whatsapp} onChange={setWhatsapp} placeholder="+15551234567" />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-medium">Instagram handle or URL</span>
          <Input value={instagram} onChange={setInstagram} placeholder="@yourbrand" />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-medium">Website / other URL</span>
          <Input value={url} onChange={setUrl} placeholder="https://example.com" />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-medium">Email</span>
          <Input value={email} onChange={setEmail} placeholder="hello@example.com" />
        </label>
      </div>
      <button onClick={save} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sky">
        <Save className="inline h-4 w-4 mr-1" /> Save contact info
      </button>
    </section>
  );
}
