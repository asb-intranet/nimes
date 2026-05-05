"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Field, Input, Select, Textarea, Section, Badge } from "@/components/Ui";
import {
  Building2, Camera, FileText, Users, Truck, MessageSquare, Smartphone,
  LayoutDashboard, LogOut, Pencil, Trash2, CalendarDays, HardHat
} from "lucide-react";

const menu = [
  { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard },
  { id: "projects", title: "Chantiers", icon: Building2 },
  { id: "earthworks", title: "Terrassement", icon: HardHat },
  { id: "planning", title: "Planning", icon: CalendarDays },
  { id: "employees", title: "Salariés", icon: Users },
  { id: "vehicles", title: "Véhicules", icon: Truck },
  { id: "requests", title: "Demandes internes", icon: MessageSquare },
  { id: "mobile", title: "Mobile terrain", icon: Smartphone }
];

const statusLabels: any = { preparation: "À préparer", en_cours: "En cours", termine: "Terminé", archive: "Archivé" };
const statusTone: any = { preparation: "amber", en_cours: "green", termine: "blue", archive: "slate" };

function cleanFileName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "";
  const base = name.replace(/\.[^/.]+$/, "");
  const cleaned = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${Date.now()}-${cleaned || "fichier"}${extension ? "." + extension.toLowerCase() : ""}`;
}

async function uploadFile(bucket: string, file: File) {
  const path = cleanFileName(file.name);
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function storagePathFromPublicUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (!url || !url.includes(marker)) return null;
  return decodeURIComponent(url.split(marker)[1]);
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  const days = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  return days;
}

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [planning, setPlanning] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [vigilance, setVigilance] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("admin");
  const [earthworks, setEarthworks] = useState<any[]>([]);
  const [earthworkPhotos, setEarthworkPhotos] = useState<any[]>([]);
  const [earthworkDocs, setEarthworkDocs] = useState<any[]>([]);
  const [earthworkNotes, setEarthworkNotes] = useState<any[]>([]);
  const [earthworkMaterials, setEarthworkMaterials] = useState<any[]>([]);
  const [earthworkVigilance, setEarthworkVigilance] = useState<any[]>([]);
  const [earthworkPlanning, setEarthworkPlanning] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUserRole(data.session?.user?.user_metadata?.role || "admin");
      if (data.session) refreshAll();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUserRole(currentSession?.user?.user_metadata?.role || "admin");
      if (currentSession) refreshAll();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function refreshAll() {
    const [p, ph, d, e, l, n, v, r, pl, mat, vig, ew, ewph, ewd, ewn, ewm, ewv, ewp] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_photos").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_projects").select("*"),
      supabase.from("chantier_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("internal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_planning").select("*").order("start_date", { ascending: true }),
      supabase.from("project_materials").select("*").order("created_at", { ascending: false }),
      supabase.from("project_vigilance").select("*").order("created_at", { ascending: false }),
      supabase.from("earthworks").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_photos").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_materials").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_vigilance").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_planning").select("*").order("start_date", { ascending: true })
    ]);

    setProjects(p.data || []);
    setPhotos(ph.data || []);
    setDocs(d.data || []);
    setEmployees(e.data || []);
    setLinks(l.data || []);
    setNotes(n.data || []);
    setVehicles(v.data || []);
    setRequests(r.data || []);
    setPlanning(pl.data || []);
    setMaterials(mat.data || []);
    setVigilance(vig.data || []);
    setEarthworks(ew.data || []);
    setEarthworkPhotos(ewph.data || []);
    setEarthworkDocs(ewd.data || []);
    setEarthworkNotes(ewn.data || []);
    setEarthworkMaterials(ewm.data || []);
    setEarthworkVigilance(ewv.data || []);
    setEarthworkPlanning(ewp.data || []);
  }

  async function signIn(e: any) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  function projectName(id: string) {
    return projects.find((p) => p.id === id)?.name || "Chantier non défini";
  }

  useEffect(() => {
    if (userRole !== "admin" && !["projects", "planning", "earthworks"].includes(active)) {
      setActive("projects");
    }
  }, [userRole, active]);

  if (loading) return <div className="p-8">Chargement...</div>;

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <Card className="w-full max-w-md">
          <img src="/logo-asb.png" alt="ASB" className="mb-4 h-24 w-auto object-contain" />
          <h1 className="text-3xl font-black">ASB Intranet</h1>
          <p className="mt-2 text-sm text-slate-500">Connexion collaborateurs</p>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <Field label="Email"><Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} /></Field>
            <Field label="Mot de passe"><Input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} /></Field>
            <Button className="w-full">Se connecter</Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-full w-80 border-r border-slate-100 bg-white p-6 lg:block">
        <div className="mb-8 rounded-3xl bg-white p-4 text-slate-900 shadow-sm">
          <img src="/logo-asb.png" alt="ASB" className="mx-auto h-28 w-auto object-contain" />
          <div className="mt-3 text-center text-2xl font-black">ASB Intranet</div>
          <div className="mt-1 text-center text-sm text-slate-500">Suivi chantier mobile</div>
        </div>

        <nav className="space-y-2">
          {menu.filter((m) => userRole === "admin" || ["projects", "planning", "earthworks"].includes(m.id)).map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setActive(m.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${active === m.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon size={18} /> {m.title}
              </button>
            );
          })}
        </nav>

        <Button variant="secondary" className="absolute bottom-6 left-6 right-6" onClick={signOut}>
          <LogOut size={16} className="mr-2" /> Déconnexion
        </Button>
      </aside>

      <main className="lg:ml-80">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 p-5 backdrop-blur">
          <div className="text-sm text-slate-500">Connecté : {session.user.email}</div>
          <h1 className="text-3xl font-black">{menu.find((m) => m.id === active)?.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            {menu.filter((m) => userRole === "admin" || ["projects", "planning", "earthworks"].includes(m.id)).map((m) => <Button key={m.id} variant={active === m.id ? "primary" : "secondary"} onClick={() => setActive(m.id)}>{m.title}</Button>)}
          </div>
        </header>

        <section className="p-5 lg:p-8">
          {active === "dashboard" && userRole === "admin" && <Dashboard projects={projects} photos={photos} docs={docs} requests={requests} setActive={setActive} />}
          {active === "projects" && <Projects projects={projects} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />}
          {active === "earthworks" && <Earthworks earthworks={earthworks} photos={earthworkPhotos} docs={earthworkDocs} notes={earthworkNotes} materials={earthworkMaterials} vigilance={earthworkVigilance} planning={earthworkPlanning} refreshAll={refreshAll} />}
          {active === "planning" && <Planning projects={projects} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />}
          {active === "employees" && userRole === "admin" && <Employees employees={employees} projects={projects} refreshAll={refreshAll} />}
          {active === "vehicles" && userRole === "admin" && <Vehicles vehicles={vehicles} refreshAll={refreshAll} />}
          {active === "requests" && userRole === "admin" && <Requests requests={requests} projects={projects} refreshAll={refreshAll} projectName={projectName} />}
          {active === "mobile" && userRole === "admin" && <Mobile projects={projects} refreshAll={refreshAll} />}
        </section>
      </main>
    </div>
  );
}

function Dashboard({ projects, photos, docs, requests, setActive }: any) {
  const enCours = projects.filter((p: any) => p.status === "en_cours").length;
  const termines = projects.filter((p: any) => p.status === "termine").length;
  const archives = projects.filter((p: any) => p.status === "archive").length;

  return (
    <div>
      <Section title="Tableau de bord" subtitle="Vue globale des chantiers, documents et demandes." />
      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-sm text-slate-500">Chantiers</p><p className="text-3xl font-black">{projects.length}</p></Card>
        <Card><p className="text-sm text-slate-500">En cours</p><p className="text-3xl font-black text-emerald-600">{enCours}</p></Card>
        <Card><p className="text-sm text-slate-500">Terminés</p><p className="text-3xl font-black">{termines}</p></Card>
        <Card><p className="text-sm text-slate-500">Archivés</p><p className="text-3xl font-black">{archives}</p></Card>
        <Card><p className="text-sm text-slate-500">Demandes</p><p className="text-3xl font-black text-amber-600">{requests.length}</p></Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {projects.map((p: any) => (
          <Card key={p.id} className="border-l-8" style={{ borderLeftColor: p.color || "#0f172a" }}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-black">{p.name}</h3><p className="mt-1 text-sm text-slate-500">{p.address}</p></div>
              <Badge tone={statusTone[p.status] || "slate"}>{statusLabels[p.status] || p.status}</Badge>
            </div>
            <p className="mt-3 text-sm">Photos : <b>{photos.filter((x: any) => x.project_id === p.id).length}</b> · Documents : <b>{docs.filter((x: any) => x.project_id === p.id).length}</b></p>
            <Button className="mt-4" onClick={() => setActive("projects")}>Ouvrir</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Projects({ projects, photos, docs, notes, materials, vigilance, employees, links, planning, refreshAll }: any) {
  const [selectedId, setSelectedId] = useState("");
  const current = projects.find((p: any) => p.id === selectedId) || projects.find((p: any) => p.status !== "archive") || projects[0];
  const [form, setForm] = useState({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#0f172a" });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveProject(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom chantier obligatoire");
    const query = editingId ? supabase.from("projects").update(form).eq("id", editingId) : supabase.from("projects").insert(form);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#0f172a" });
    setEditingId(null);
    await refreshAll();
  }

  function editProject(p: any) {
    setForm({ name: p.name || "", client: p.client || "", address: p.address || "", description: p.description || "", status: p.status || "en_cours", color: p.color || "#0f172a" });
    setEditingId(p.id);
    setSelectedId(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function archiveProject(p: any) {
    if (!confirm(`Archiver le chantier "${p.name}" ?`)) return;
    const { error } = await supabase.from("projects").update({ status: "archive" }).eq("id", p.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function restoreProject(p: any) {
    const { error } = await supabase.from("projects").update({ status: "en_cours" }).eq("id", p.id);
    if (error) return alert(error.message);
    setSelectedId(p.id);
    await refreshAll();
  }

  async function deleteProject(p: any) {
    if (!confirm(`Supprimer définitivement le chantier "${p.name}" ?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) return alert(error.message);
    if (selectedId === p.id) setSelectedId("");
    await refreshAll();
  }

  const activeProjects = projects.filter((p: any) => p.status !== "archive");
  const archivedProjects = projects.filter((p: any) => p.status === "archive");

  return (
    <div>
      <Section title="Gestion chantier" subtitle="Chaque chantier possède sa fiche avec photos, documents, notes et salariés affectés." />

      <Card>
        <form onSubmit={saveProject} className="grid gap-3 md:grid-cols-3">
          <Field label="Nom"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Client"><Input value={form.client} onChange={(e: any) => setForm({ ...form, client: e.target.value })} /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option value="preparation">À préparer</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="archive">Archivé</option></Select></Field>
          <Field label="Couleur"><Input type="color" value={form.color} onChange={(e: any) => setForm({ ...form, color: e.target.value })} /></Field>
          <div className="md:col-span-3"><Field label="Description"><Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <Button className="md:col-span-3">{editingId ? "Modifier chantier" : "Créer chantier"}</Button>
        </form>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-black">Chantiers actifs</h3>

          {activeProjects.map((p: any) => (
            <Card key={p.id} className={`border-l-8 ${current?.id === p.id ? "ring-2 ring-slate-900" : ""}`} style={{ borderLeftColor: p.color || "#0f172a" }}>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-black">{p.name}</h3><p className="text-sm text-slate-500">{p.client}</p><p className="text-sm text-slate-500">{p.address}</p></div>
                <Badge tone={statusTone[p.status] || "slate"}>{statusLabels[p.status] || p.status}</Badge>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Photos : <b>{photos.filter((x: any) => x.project_id === p.id).length}</b> · Documents : <b>{docs.filter((x: any) => x.project_id === p.id).length}</b> · Notes : <b>{notes.filter((x: any) => x.project_id === p.id).length}</b>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => setSelectedId(p.id)}>Accéder</Button>
                <Button variant="secondary" onClick={() => editProject(p)}>Modifier</Button>
                <Button variant="amber" onClick={() => archiveProject(p)}>Archiver</Button>
                <Button variant="danger" onClick={() => deleteProject(p)}>Supprimer</Button>
              </div>
            </Card>
          ))}

          {activeProjects.length === 0 && <Card><p className="text-sm text-slate-500">Aucun chantier actif.</p></Card>}

          <h3 className="pt-4 text-lg font-black">Chantiers archivés</h3>
          {archivedProjects.map((p: any) => (
            <Card key={p.id} className="border-l-8 opacity-75" style={{ borderLeftColor: p.color || "#0f172a" }}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{p.name}</h3><p className="text-sm text-slate-500">{p.client}</p></div><Badge>Archivé</Badge></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setSelectedId(p.id)}>Consulter</Button>
                <Button variant="green" onClick={() => restoreProject(p)}>Réactiver</Button>
                <Button variant="danger" className="col-span-2" onClick={() => deleteProject(p)}>Supprimer définitivement</Button>
              </div>
            </Card>
          ))}
          {archivedProjects.length === 0 && <Card><p className="text-sm text-slate-500">Aucun chantier archivé.</p></Card>}
        </div>

        <ProjectDetail project={current} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />
      </div>
    </div>
  );
}

function ProjectDetail({ project, photos, docs, notes, materials, vigilance, employees, links, planning, refreshAll }: any) {
  const [photoTitle, setPhotoTitle] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("facture");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!project) return <Card><p>Aucun chantier sélectionné.</p></Card>;

  const projectPhotos = photos.filter((x: any) => x.project_id === project.id);
  const projectDocs = docs.filter((x: any) => x.project_id === project.id);
  const projectNotes = notes.filter((x: any) => x.project_id === project.id);
  const projectMaterials = materials.filter((x: any) => x.project_id === project.id);
  const projectVigilance = vigilance.filter((x: any) => x.project_id === project.id);
  const assignedEmployees = links.filter((l: any) => l.project_id === project.id).map((l: any) => employees.find((e: any) => e.id === l.employee_id)).filter(Boolean);
  const projectInterventions = planning.filter((p: any) => p.project_id === project.id);
  const employeeInterventionSummary = assignedEmployees.map((emp: any) => ({ employee: emp, items: projectInterventions.filter((p: any) => p.employee_id === emp.id) }));
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [vigilanceTitle, setVigilanceTitle] = useState("");
  const [vigilanceContent, setVigilanceContent] = useState("");
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);
  const [openVigilanceId, setOpenVigilanceId] = useState<string | null>(null);

  async function addPhoto(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.photo?.files?.[0];
    if (!file) return alert("Ajoute une photo");
    setBusy(true);
    try {
      const file_url = await uploadFile("photos", file);
      const { error } = await supabase.from("chantier_photos").insert({ project_id: project.id, title: photoTitle || file.name, file_url, phase: "chantier" });
      if (error) throw error;
      setPhotoTitle("");
      await refreshAll();
    } catch (err: any) { alert(err.message); } finally { setBusy(false); }
  }

  async function deletePhoto(photo: any) {
    if (!confirm(`Supprimer la photo "${photo.title}" ?`)) return;
    try {
      const path = storagePathFromPublicUrl(photo.file_url, "photos");
      if (path) await supabase.storage.from("photos").remove([path]);
      const { error } = await supabase.from("chantier_photos").delete().eq("id", photo.id);
      if (error) throw error;
      await refreshAll();
    } catch (err: any) { alert(err.message); }
  }

  async function addDoc(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.doc?.files?.[0];
    if (!file) return alert("Ajoute un document");
    setBusy(true);
    try {
      const file_url = await uploadFile("documents", file);
      const { error } = await supabase.from("chantier_documents").insert({ project_id: project.id, name: docName || file.name, type: docType, file_url });
      if (error) throw error;
      setDocName("");
      await refreshAll();
    } catch (err: any) { alert(err.message); } finally { setBusy(false); }
  }

  async function deleteDoc(doc: any) {
    if (!confirm(`Supprimer le document "${doc.name}" ?`)) return;
    try {
      const path = storagePathFromPublicUrl(doc.file_url, "documents");
      if (path) await supabase.storage.from("documents").remove([path]);
      const { error } = await supabase.from("chantier_documents").delete().eq("id", doc.id);
      if (error) throw error;
      await refreshAll();
    } catch (err: any) { alert(err.message); }
  }

  async function addNote(e: any) {
    e.preventDefault();
    if (!note) return;
    const { error } = await supabase.from("chantier_notes").insert({ project_id: project.id, content: note });
    if (error) return alert(error.message);
    setNote("");
    await refreshAll();
  }

  async function updateNote(noteItem: any) {
    const newContent = prompt("Modifier la note :", noteItem.content);
    if (!newContent) return;
    const { error } = await supabase.from("chantier_notes").update({ content: newContent }).eq("id", noteItem.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteNote(noteItem: any) {
    if (!confirm("Supprimer cette note ?")) return;
    const { error } = await supabase.from("chantier_notes").delete().eq("id", noteItem.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function copyText(title: string, content: string) {
    const text = `${title || ""}\n${content || ""}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      alert("Copié dans le presse-papiers");
    } catch {
      alert(text);
    }
  }

  async function addMaterial(e: any) {
    e.preventDefault();
    if (!materialTitle && !materialContent) return alert("Ajoute au minimum un titre ou un détail");
    const { error } = await supabase.from("project_materials").insert({
      project_id: project.id,
      title: materialTitle || "Matériel à prévoir",
      content: materialContent || ""
    });
    if (error) return alert(error.message);
    setMaterialTitle("");
    setMaterialContent("");
    await refreshAll();
  }

  async function updateMaterial(item: any) {
    const title = prompt("Titre :", item.title || "");
    if (title === null) return;
    const content = prompt("Détail :", item.content || "");
    if (content === null) return;
    const { error } = await supabase.from("project_materials").update({ title, content }).eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteMaterial(item: any) {
    if (!confirm(`Supprimer "${item.title || item.content}" ?`)) return;
    const { error } = await supabase.from("project_materials").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function addVigilance(e: any) {
    e.preventDefault();
    if (!vigilanceTitle && !vigilanceContent) return alert("Ajoute au minimum un titre ou un détail");
    const { error } = await supabase.from("project_vigilance").insert({
      project_id: project.id,
      title: vigilanceTitle || "Point de vigilance",
      content: vigilanceContent || ""
    });
    if (error) return alert(error.message);
    setVigilanceTitle("");
    setVigilanceContent("");
    await refreshAll();
  }

  async function updateVigilance(item: any) {
    const title = prompt("Titre :", item.title || "");
    if (title === null) return;
    const content = prompt("Détail :", item.content || "");
    if (content === null) return;
    const { error } = await supabase.from("project_vigilance").update({ title, content }).eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteVigilance(item: any) {
    if (!confirm(`Supprimer "${item.title || item.content}" ?`)) return;
    const { error } = await supabase.from("project_vigilance").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-8" style={{ borderLeftColor: project.color || "#0f172a" }}>
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-2xl font-black">{project.name}</h2><p className="mt-1 text-sm text-slate-500">{project.client || "Client non renseigné"}</p><p className="mt-1 text-sm text-slate-500">{project.address || "Adresse non renseignée"}</p></div>
          <Badge tone={statusTone[project.status] || "slate"}>{statusLabels[project.status] || project.status}</Badge>
        </div>
        {project.description && <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{project.description}</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Photos</p><p className="text-2xl font-black">{projectPhotos.length}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Documents</p><p className="text-2xl font-black">{projectDocs.length}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Notes</p><p className="text-2xl font-black">{projectNotes.length}</p></div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-l-8 border-amber-400 bg-amber-50">
          <h3 className="mb-4 text-xl font-black text-amber-900">📦 Matériel à prévoir</h3>

          <form onSubmit={addMaterial} className="mb-4 space-y-3">
            <Field label="Titre">
              <Input value={materialTitle} onChange={(e: any) => setMaterialTitle(e.target.value)} placeholder="" />
            </Field>
            <Field label="Détail / copier-coller">
              <Textarea value={materialContent} onChange={(e: any) => setMaterialContent(e.target.value)} placeholder="" />
            </Field>
            <Button variant="amber">Ajouter fiche matériel</Button>
          </form>

          <div className="space-y-3">
            {projectMaterials.map((m: any) => {
              const isOpen = openMaterialId === m.id;
              return (
                <div key={m.id} className="rounded-2xl border border-amber-200 bg-white/90 p-3">
                  <button type="button" onClick={() => setOpenMaterialId(isOpen ? null : m.id)} className="flex w-full items-center justify-between gap-3 text-left">
                    <span className="font-black text-amber-950">{m.title || "Matériel à prévoir"}</span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{isOpen ? "Fermer" : "Ouvrir"}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-3">
                      <pre className="whitespace-pre-wrap rounded-2xl bg-amber-50 p-3 text-sm text-slate-800">{m.content || "Aucun détail."}</pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => copyText(m.title, m.content)}>Copier</Button>
                        <Button variant="secondary" onClick={() => updateMaterial(m)}>Modifier</Button>
                        <Button variant="danger" onClick={() => deleteMaterial(m)}>Supprimer</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {projectMaterials.length === 0 && <p className="text-sm text-amber-900/70">Aucun matériel prévu.</p>}
          </div>
        </Card>

        <Card className="border-l-8 border-red-500 bg-red-50">
          <h3 className="mb-4 text-xl font-black text-red-900">⚠️ À réaliser / points de vigilance</h3>

          <form onSubmit={addVigilance} className="mb-4 space-y-3">
            <Field label="Titre">
              <Input value={vigilanceTitle} onChange={(e: any) => setVigilanceTitle(e.target.value)} placeholder="" />
            </Field>
            <Field label="Détail / copier-coller">
              <Textarea value={vigilanceContent} onChange={(e: any) => setVigilanceContent(e.target.value)} placeholder="" />
            </Field>
            <Button variant="danger">Ajouter fiche vigilance</Button>
          </form>

          <div className="space-y-3">
            {projectVigilance.map((v: any) => {
              const isOpen = openVigilanceId === v.id;
              return (
                <div key={v.id} className="rounded-2xl border border-red-200 bg-white/90 p-3">
                  <button type="button" onClick={() => setOpenVigilanceId(isOpen ? null : v.id)} className="flex w-full items-center justify-between gap-3 text-left">
                    <span className="font-black text-red-950">{v.title || "Point de vigilance"}</span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-900">{isOpen ? "Fermer" : "Ouvrir"}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-3">
                      <pre className="whitespace-pre-wrap rounded-2xl bg-red-50 p-3 text-sm text-slate-800">{v.content || "Aucun détail."}</pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => copyText(v.title, v.content)}>Copier</Button>
                        <Button variant="secondary" onClick={() => updateVigilance(v)}>Modifier</Button>
                        <Button variant="danger" onClick={() => deleteVigilance(v)}>Supprimer</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {projectVigilance.length === 0 && <p className="text-sm text-red-900/70">Aucun point de vigilance.</p>}
          </div>
        </Card>
      </div>

      <Card className="border-l-8 border-blue-500 bg-blue-50">
        <h3 className="mb-4 text-xl font-black text-blue-950">👷 Intervenants chantier / masse salariale engagée</h3>
        <p className="mb-4 text-sm text-blue-900/70">Aperçu basé sur les salariés affectés et les lignes du planning liées à ce chantier.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {employeeInterventionSummary.map(({ employee, items }: any) => (
            <div key={employee.id} className="rounded-2xl bg-white p-3">
              <div className="font-black">{employee.firstname} {employee.lastname}</div>
              <div className="text-sm text-slate-500">{employee.position || employee.role}</div>
              <div className="mt-2 text-sm">Interventions prévues : <b>{items.length}</b></div>
              <div className="mt-2 space-y-1">
                {items.slice(0, 4).map((it: any) => (
                  <div key={it.id} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold">
                    {it.start_date}{it.end_date && it.end_date !== it.start_date ? ` → ${it.end_date}` : ""} · {it.title}
                  </div>
                ))}
                {items.length > 4 && <div className="text-xs text-slate-500">+{items.length - 4} autre(s)</div>}
              </div>
            </div>
          ))}
          {employeeInterventionSummary.length === 0 && <p className="text-sm text-blue-900/70">Aucun intervenant affecté.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-black"><Users size={18} className="mr-2 inline" /> Salariés affectés au chantier</h3>
        <div className="flex flex-wrap gap-2">
          {assignedEmployees.map((e: any) => <span key={e.id} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">{e.firstname} {e.lastname} <span className="text-slate-500">· {e.position || e.role}</span></span>)}
          {assignedEmployees.length === 0 && <p className="text-sm text-slate-500">Aucun salarié affecté à ce chantier.</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-black"><Camera size={18} className="mr-2 inline" /> Photos chantier</h3>
          <form onSubmit={addPhoto} className="mb-4 space-y-3">
            <Field label="Titre"><Input value={photoTitle} onChange={(e: any) => setPhotoTitle(e.target.value)} /></Field>
            <Field label="Photo"><Input name="photo" type="file" accept="image/*" /></Field>
            <Button disabled={busy}>{busy ? "Envoi..." : "Ajouter photo"}</Button>
          </form>
          <div className="grid grid-cols-2 gap-3">
            {projectPhotos.map((p: any) => (
              <div key={p.id} className="overflow-hidden rounded-2xl border bg-slate-50">
                <a href={p.file_url} target="_blank" className="block"><img src={p.file_url} alt={p.title} className="h-36 w-full object-cover" /></a>
                <div className="space-y-2 p-2"><div className="text-xs font-bold">{p.title}</div><div className="flex gap-2"><a href={p.file_url} target="_blank" className="flex-1 rounded-xl border bg-white px-2 py-1 text-center text-xs font-bold">Voir</a><button type="button" onClick={() => deletePhoto(p)} className="flex items-center justify-center rounded-xl bg-red-600 px-2 py-1 text-xs font-bold text-white"><Trash2 size={13} /></button></div></div>
              </div>
            ))}
            {projectPhotos.length === 0 && <div className="col-span-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aucune photo pour ce chantier.</div>}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-black"><FileText size={18} className="mr-2 inline" /> Documents chantier</h3>
          <form onSubmit={addDoc} className="mb-4 space-y-3">
            <Field label="Nom"><Input value={docName} onChange={(e: any) => setDocName(e.target.value)} /></Field>
            <Field label="Type"><Select value={docType} onChange={(e: any) => setDocType(e.target.value)}><option value="facture">Facture achat</option><option value="bl">Bon de livraison</option><option value="devis">Devis</option><option value="plan">Plan</option><option value="autre">Autre</option></Select></Field>
            <Field label="Fichier"><Input name="doc" type="file" /></Field>
            <Button disabled={busy}>{busy ? "Envoi..." : "Ajouter document"}</Button>
          </form>
          <div className="space-y-2">
            {projectDocs.map((d: any) => (
              <div key={d.id} className="rounded-2xl border bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">{d.name}</p><Badge>{d.type}</Badge></div><div className="flex gap-2"><a href={d.file_url} target="_blank" className="rounded-xl border bg-white px-3 py-2 text-xs font-bold">Lire</a><button type="button" onClick={() => deleteDoc(d)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Supprimer</button></div></div>
              </div>
            ))}
            {projectDocs.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aucun document pour ce chantier.</div>}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 font-black">Notes chantier</h3>
        <form onSubmit={addNote} className="grid gap-3 md:grid-cols-[1fr_120px]">
          <Input value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Note chantier..." />
          <Button>Ajouter</Button>
        </form>
        <div className="mt-4 space-y-2">
          {projectNotes.map((n: any) => (
            <div key={n.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
              <span>{n.content}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => updateNote(n)}>Modifier</Button>
                <Button variant="danger" onClick={() => deleteNote(n)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Planning({ projects, employees, links, planning, refreshAll }: any) {
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(new Date());
  const [form, setForm] = useState({
    project_id: "",
    employee_id: "",
    title: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    color: "#0f172a",
    notes: ""
  });

  const assignedEmployees = form.project_id
    ? links.filter((l: any) => l.project_id === form.project_id).map((l: any) => employees.find((e: any) => e.id === l.employee_id)).filter(Boolean)
    : employees;

  function projectNameLocal(id: string) { return projects.find((p: any) => p.id === id)?.name || "Chantier inconnu"; }
  function employeeName(id: string) { const e = employees.find((x: any) => x.id === id); return e ? `${e.firstname} ${e.lastname}` : "Salarié inconnu"; }
  function projectColor(id: string) { return projects.find((p: any) => p.id === id)?.color || "#0f172a"; }

  async function addPlanning(e: any) {
    e.preventDefault();
    if (!form.project_id || !form.employee_id || !form.title || !form.start_date) return alert("Chantier, salarié, tâche et date de début obligatoires");

    const { error } = await supabase.from("employee_planning").insert({
      project_id: form.project_id,
      employee_id: form.employee_id,
      title: form.title,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      color: form.color || projectColor(form.project_id),
      notes: form.notes
    });

    if (error) return alert(error.message);
    setForm({ project_id: form.project_id, employee_id: "", title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: form.color, notes: "" });
    await refreshAll();
  }

  async function updatePlanning(item: any) {
    const title = prompt("Tâche :", item.title || "");
    if (title === null) return;
    const start_date = prompt("Date début (AAAA-MM-JJ) :", item.start_date || "");
    if (start_date === null) return;
    const end_date = prompt("Date fin (AAAA-MM-JJ) :", item.end_date || item.start_date || "");
    if (end_date === null) return;
    const start_time = prompt("Heure début (HH:MM) :", item.start_time || "");
    if (start_time === null) return;
    const end_time = prompt("Heure fin (HH:MM) :", item.end_time || "");
    if (end_time === null) return;
    const color = prompt("Couleur (#xxxxxx) :", item.color || "#0f172a");
    if (color === null) return;
    const notes = prompt("Notes :", item.notes || "");
    if (notes === null) return;
    const { error } = await supabase.from("employee_planning").update({ title, start_date, end_date: end_date || start_date, start_time: start_time || null, end_time: end_time || null, color: color || "#0f172a", notes }).eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deletePlanning(item: any) {
    if (!confirm(`Supprimer cette ligne de planning : "${item.title}" ?`)) return;
    const { error } = await supabase.from("employee_planning").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function eventsForDate(date: Date) {
    const key = formatDate(date);
    return planning.filter((p: any) => (p.start_date || "") <= key && (p.end_date || p.start_date || "") >= key);
  }

  const weekStart = startOfWeek(cursor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const month = monthDays(cursor);
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <Section title="Planning" subtitle="Vue semaine/mois par chantier et salarié, avec couleurs." />

      <Card>
        <form onSubmit={addPlanning} className="grid gap-3 md:grid-cols-3">
          <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => {
            const project = projects.find((p: any) => p.id === e.target.value);
            setForm({ ...form, project_id: e.target.value, employee_id: "", color: project?.color || form.color });
          }}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Salarié affecté"><Select value={form.employee_id} onChange={(e: any) => setForm({ ...form, employee_id: e.target.value })}><option value="">Choisir salarié</option>{assignedEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.firstname} {e.lastname}</option>)}</Select></Field>
          <Field label="Tâche"><Input value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Pose isolation, RDV client..." /></Field>
          <Field label="Date début"><Input type="date" value={form.start_date} onChange={(e: any) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="Date fin"><Input type="date" value={form.end_date} onChange={(e: any) => setForm({ ...form, end_date: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Début"><Input type="time" value={form.start_time} onChange={(e: any) => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label="Fin"><Input type="time" value={form.end_time} onChange={(e: any) => setForm({ ...form, end_time: e.target.value })} /></Field>
            <Field label="Couleur"><Input type="color" value={form.color} onChange={(e: any) => setForm({ ...form, color: e.target.value })} /></Field>
          </div>
          <div className="md:col-span-3"><Field label="Notes"><Textarea value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} /></Field></div>
          <Button className="md:col-span-3">Ajouter au planning</Button>
        </form>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant={view === "week" ? "primary" : "secondary"} onClick={() => setView("week")}>Semaine</Button>
          <Button variant={view === "month" ? "primary" : "secondary"} onClick={() => setView("month")}>Mois</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setCursor(view === "week" ? addDays(cursor, -7) : new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>Précédent</Button>
          <div className="min-w-48 text-center font-black">{view === "week" ? `Semaine du ${formatDate(weekStart)}` : monthLabel}</div>
          <Button variant="secondary" onClick={() => setCursor(view === "week" ? addDays(cursor, 7) : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Suivant</Button>
        </div>
      </div>

      {view === "week" ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-7">
          {week.map((day) => (
            <Card key={formatDate(day)} className="min-h-64">
              <h3 className="text-center font-black">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</h3>
              <p className="text-center text-xs text-slate-500">{formatDate(day)}</p>
              <div className="mt-3 space-y-2">
                {eventsForDate(day).map((e: any) => (
                  <div key={e.id} className="rounded-2xl p-2 text-xs font-bold text-white" style={{ background: e.color || projectColor(e.project_id) }}>
                    <div>{employeeName(e.employee_id)}</div>
                    <div>{projectNameLocal(e.project_id)}</div>
                    <div>{e.title}</div>
                    <div>{e.start_time || ""}{e.end_time ? ` - ${e.end_time}` : ""}</div>
                    <div className="mt-2 flex gap-1">
                      <button className="rounded-lg bg-white/20 px-2 py-1" onClick={() => updatePlanning(e)}>Modif.</button>
                      <button className="rounded-lg bg-white/20 px-2 py-1" onClick={() => deletePlanning(e)}>Suppr.</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="text-center text-xs font-black uppercase text-slate-500">{d}</div>)}
          {month.map((day) => (
            <div key={formatDate(day)} className="min-h-32 rounded-2xl border bg-white p-2">
              <div className="mb-2 text-xs font-black">{day.getDate()}</div>
              <div className="space-y-1">
                {eventsForDate(day).slice(0, 3).map((e: any) => (
                  <div key={e.id} className="rounded-lg px-2 py-1 text-[10px] font-bold text-white" style={{ background: e.color || projectColor(e.project_id) }}>
                    {employeeName(e.employee_id).split(" ")[0]} · {e.title}
                  </div>
                ))}
                {eventsForDate(day).length > 3 && <div className="text-[10px] text-slate-500">+{eventsForDate(day).length - 3} autre(s)</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Employees({ employees, projects, refreshAll }: any) {
  const [form, setForm] = useState({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => { loadAssignments(); }, []);

  async function loadAssignments() {
    const { data } = await supabase.from("employee_projects").select("*");
    setAssignments(data || []);
  }

  async function refreshEmployeesAll() {
    await loadAssignments();
    await refreshAll();
  }

  async function saveEmployee(e: any) {
    e.preventDefault();
    if (!form.firstname || !form.lastname) return alert("Nom et prénom obligatoires");
    const query = editingId ? supabase.from("employees").update(form).eq("id", editingId) : supabase.from("employees").insert(form);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "" });
    setEditingId(null);
    await refreshEmployeesAll();
  }

  function editEmployee(emp: any) {
    setEditingId(emp.id);
    setForm({ firstname: emp.firstname || "", lastname: emp.lastname || "", position: emp.position || "", role: emp.role || "terrain", phone: emp.phone || "", email: emp.email || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEmployee(emp: any) {
    if (!confirm(`Supprimer le salarié "${emp.firstname} ${emp.lastname}" ?`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", emp.id);
    if (error) return alert(error.message);
    if (editingId === emp.id) { setEditingId(null); setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "" }); }
    await refreshEmployeesAll();
  }

  async function assign(e: any) {
    e.preventDefault();
    if (!employeeId || !projectId) return alert("Choisis un salarié et un chantier");
    const already = assignments.find((a: any) => a.employee_id === employeeId && a.project_id === projectId);
    if (already) return alert("Ce salarié est déjà affecté à ce chantier");
    const { error } = await supabase.from("employee_projects").insert({ employee_id: employeeId, project_id: projectId });
    if (error) return alert(error.message);
    await refreshEmployeesAll();
  }

  async function removeAssignment(assignment: any) {
    if (!confirm("Retirer cette affectation ?")) return;
    const { error } = await supabase.from("employee_projects").delete().eq("id", assignment.id);
    if (error) return alert(error.message);
    await refreshEmployeesAll();
  }

  function employeeName(id: string) { const e = employees.find((x: any) => x.id === id); return e ? `${e.firstname} ${e.lastname}` : "Salarié inconnu"; }
  function projectNameLocal(id: string) { return projects.find((p: any) => p.id === id)?.name || "Chantier inconnu"; }

  return (
    <div>
      <Section title="Gestion salariés" subtitle="Création, modification, suppression et affectation aux chantiers." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-black">{editingId ? "Modifier salarié" : "Créer salarié"}</h3>
          <form onSubmit={saveEmployee} className="space-y-3">
            <Field label="Prénom"><Input value={form.firstname} onChange={(e: any) => setForm({ ...form, firstname: e.target.value })} /></Field>
            <Field label="Nom"><Input value={form.lastname} onChange={(e: any) => setForm({ ...form, lastname: e.target.value })} /></Field>
            <Field label="Poste"><Input value={form.position} onChange={(e: any) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label="Rôle"><Select value={form.role} onChange={(e: any) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="bureau">Bureau</option><option value="chef">Chef chantier</option><option value="terrain">Terrain</option></Select></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></Field>
            <div className="flex gap-2"><Button>{editingId ? "Enregistrer les modifications" : "Ajouter salarié"}</Button>{editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "" }); }}>Annuler</Button>}</div>
          </form>
        </Card>

        <Card>
          <h3 className="mb-4 font-black">Affecter un salarié à un chantier</h3>
          <form onSubmit={assign} className="space-y-3">
            <Field label="Salarié"><Select value={employeeId} onChange={(e: any) => setEmployeeId(e.target.value)}><option value="">Choisir salarié</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstname} {e.lastname} — {e.position || e.role}</option>)}</Select></Field>
            <Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Button>Affecter au chantier</Button>
          </form>

          <div className="mt-6 space-y-2">
            <h4 className="font-black">Affectations existantes</h4>
            {assignments.map((a: any) => <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm"><span><b>{employeeName(a.employee_id)}</b> → {projectNameLocal(a.project_id)}</span><button type="button" onClick={() => removeAssignment(a)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Retirer</button></div>)}
            {assignments.length === 0 && <p className="text-sm text-slate-500">Aucune affectation pour le moment.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {employees.map((e: any) => {
          const employeeAssignments = assignments.filter((a: any) => a.employee_id === e.id);
          return (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{e.firstname} {e.lastname}</h3><p className="text-sm text-slate-500">{e.position}</p></div><Badge>{e.role}</Badge></div>
              <div className="mt-4 space-y-1"><p className="text-xs font-bold uppercase text-slate-500">Chantiers affectés</p>{employeeAssignments.map((a: any) => <div key={a.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">{projectNameLocal(a.project_id)}</div>)}{employeeAssignments.length === 0 && <p className="text-xs text-slate-500">Aucun chantier</p>}</div>
              <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => editEmployee(e)}>Modifier</Button><Button variant="danger" onClick={() => deleteEmployee(e)}>Supprimer</Button></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Vehicles({ vehicles, refreshAll }: any) {
  const [form, setForm] = useState({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveVehicle(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom véhicule obligatoire");
    const payload = { ...form, km: Number(form.km || 0) };
    const query = editingId ? supabase.from("vehicles").update(payload).eq("id", editingId) : supabase.from("vehicles").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" });
    setEditingId(null);
    await refreshAll();
  }

  function editVehicle(v: any) {
    setEditingId(v.id);
    setForm({
      name: v.name || "",
      plate: v.plate || "",
      driver: v.driver || "",
      km: String(v.km || ""),
      status: v.status || "ras",
      next_service: v.next_service || "",
      insurance_date: v.insurance_date || "",
      technical_control_date: v.technical_control_date || "",
      notes: v.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteVehicle(v: any) {
    if (!confirm(`Supprimer le véhicule "${v.name}" ?`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  return (
    <div>
      <Section title="Gestion véhicules" subtitle="Ajout, modification, suppression, km, entretien, CT et assurance." />
      <Card>
        <form onSubmit={saveVehicle} className="grid gap-3 md:grid-cols-3">
          <Field label="Véhicule"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Immatriculation"><Input value={form.plate} onChange={(e: any) => setForm({ ...form, plate: e.target.value })} /></Field>
          <Field label="Conducteur"><Input value={form.driver} onChange={(e: any) => setForm({ ...form, driver: e.target.value })} /></Field>
          <Field label="Kilométrage"><Input type="number" value={form.km} onChange={(e: any) => setForm({ ...form, km: e.target.value })} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option value="ras">RAS</option><option value="entretien">Entretien</option><option value="probleme">Problème</option></Select></Field>
          <Field label="Prochain entretien"><Input type="date" value={form.next_service} onChange={(e: any) => setForm({ ...form, next_service: e.target.value })} /></Field>
          <Field label="Assurance"><Input type="date" value={form.insurance_date} onChange={(e: any) => setForm({ ...form, insurance_date: e.target.value })} /></Field>
          <Field label="Contrôle technique"><Input type="date" value={form.technical_control_date} onChange={(e: any) => setForm({ ...form, technical_control_date: e.target.value })} /></Field>
          <div className="md:col-span-3"><Field label="Notes"><Textarea value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} /></Field></div>
          <div className="flex gap-2 md:col-span-3">
            <Button>{editingId ? "Modifier véhicule" : "Ajouter véhicule"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" }); }}>Annuler</Button>}
          </div>
        </form>
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {vehicles.map((v: any) => (
          <Card key={v.id}>
            <h3 className="font-black">{v.name}</h3>
            <p className="text-sm text-slate-500">{v.plate}</p>
            <p className="mt-2 text-sm">Conducteur : <b>{v.driver}</b></p>
            <p className="text-sm">KM : <b>{v.km}</b></p>
            <Badge tone={v.status === "probleme" ? "red" : v.status === "entretien" ? "amber" : "green"}>{v.status}</Badge>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => editVehicle(v)}>Modifier</Button>
              <Button variant="danger" onClick={() => deleteVehicle(v)}>Supprimer</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Requests({ requests, projects, refreshAll, projectName }: any) {
  const [form, setForm] = useState({ project_id: "", type: "achat", requester: "", message: "", priority: "normale", status: "nouvelle" });

  async function addRequest(e: any) {
    e.preventDefault();
    if (!form.message) return;
    const { error } = await supabase.from("internal_requests").insert(form);
    if (error) return alert(error.message);
    setForm({ ...form, message: "" });
    await refreshAll();
  }

  async function updateRequest(req: any) {
    const message = prompt("Modifier la demande :", req.message || "");
    if (message === null) return;
    const status = prompt("Statut :", req.status || "nouvelle");
    if (status === null) return;
    const priority = prompt("Priorité (basse/normale/haute) :", req.priority || "normale");
    if (priority === null) return;
    const { error } = await supabase.from("internal_requests").update({ message, status, priority }).eq("id", req.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteRequest(req: any) {
    if (!confirm("Supprimer cette demande ?")) return;
    const { error } = await supabase.from("internal_requests").delete().eq("id", req.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  return (
    <div>
      <Section title="Demandes internes" subtitle="Demandes d'achat, matériel, messages chantier." />
      <Card>
        <form onSubmit={addRequest} className="grid gap-3 md:grid-cols-3">
          <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}><option value="">Sans chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Type"><Select value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}><option value="achat">Achat</option><option value="materiel">Matériel</option><option value="sav">SAV</option><option value="autre">Autre</option></Select></Field>
          <Field label="Priorité"><Select value={form.priority} onChange={(e: any) => setForm({ ...form, priority: e.target.value })}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option></Select></Field>
          <Field label="Demandeur"><Input value={form.requester} onChange={(e: any) => setForm({ ...form, requester: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Message"><Textarea value={form.message} onChange={(e: any) => setForm({ ...form, message: e.target.value })} /></Field></div>
          <Button className="md:col-span-3">Créer demande</Button>
        </form>
      </Card>
      <div className="mt-6 space-y-3">
        {requests.map((r: any) => (
          <Card key={r.id}>
            <div className="flex justify-between gap-3">
              <div><h3 className="font-black">{r.type} · {projectName(r.project_id)}</h3><p className="text-sm text-slate-600">{r.message}</p><p className="mt-1 text-xs text-slate-500">Statut : {r.status}</p></div>
              <Badge tone={r.priority === "haute" ? "red" : "amber"}>{r.priority}</Badge>
            </div>
            <div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => updateRequest(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteRequest(r)}>Supprimer</Button></div>
          </Card>
        ))}
      </div>
    </div>
  );
}


function Earthworks({ earthworks, photos, docs, notes, materials, vigilance, planning, refreshAll }: any) {
  const [selectedId, setSelectedId] = useState("");
  const current = earthworks.find((e: any) => e.id === selectedId) || earthworks[0];
  const [form, setForm] = useState({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#92400e" });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveEarthwork(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom obligatoire");
    const query = editingId ? supabase.from("earthworks").update(form).eq("id", editingId) : supabase.from("earthworks").insert(form);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#92400e" });
    setEditingId(null);
    await refreshAll();
  }
  function editEarthwork(item: any) { setEditingId(item.id); setSelectedId(item.id); setForm({ name: item.name || "", client: item.client || "", address: item.address || "", description: item.description || "", status: item.status || "en_cours", color: item.color || "#92400e" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function deleteEarthwork(item: any) { if (!confirm(`Supprimer le terrassement "${item.name}" ?`)) return; const { error } = await supabase.from("earthworks").delete().eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }

  return <div><Section title="Terrassement" subtitle="Module complètement séparé des chantiers classiques, avec planning autonome." />
    <Card><form onSubmit={saveEarthwork} className="grid gap-3 md:grid-cols-3"><Field label="Nom terrassement"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Client"><Input value={form.client} onChange={(e: any) => setForm({ ...form, client: e.target.value })} /></Field><Field label="Adresse"><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></Field><Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="archive">Archivé</option></Select></Field><Field label="Couleur"><Input type="color" value={form.color} onChange={(e: any) => setForm({ ...form, color: e.target.value })} /></Field><div className="md:col-span-3"><Field label="Description"><Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></Field></div><Button className="md:col-span-3">{editingId ? "Modifier terrassement" : "Créer terrassement"}</Button></form></Card>
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]"><div className="space-y-3">{earthworks.map((e: any) => <Card key={e.id} className={`border-l-8 ${current?.id === e.id ? "ring-2 ring-slate-900" : ""}`} style={{ borderLeftColor: e.color || "#92400e" }}><h3 className="font-black">{e.name}</h3><p className="text-sm text-slate-500">{e.address}</p><div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => setSelectedId(e.id)}>Ouvrir</Button><Button variant="secondary" onClick={() => editEarthwork(e)}>Modifier</Button><Button variant="danger" className="col-span-2" onClick={() => deleteEarthwork(e)}>Supprimer</Button></div></Card>)}{earthworks.length === 0 && <Card><p className="text-sm text-slate-500">Aucun terrassement.</p></Card>}</div><EarthworkDetail item={current} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} planning={planning} refreshAll={refreshAll} /></div></div>;
}

function EarthworkDetail({ item, photos, docs, notes, materials, vigilance, planning, refreshAll }: any) {
  const [photoTitle, setPhotoTitle] = useState(""); const [docName, setDocName] = useState(""); const [note, setNote] = useState(""); const [matTitle, setMatTitle] = useState(""); const [matContent, setMatContent] = useState(""); const [vigTitle, setVigTitle] = useState(""); const [vigContent, setVigContent] = useState(""); const [plan, setPlan] = useState({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: "#92400e", notes: "" });
  if (!item) return <Card><p>Sélectionne ou crée un terrassement.</p></Card>;
  const myPhotos = photos.filter((x: any) => x.earthwork_id === item.id); const myDocs = docs.filter((x: any) => x.earthwork_id === item.id); const myNotes = notes.filter((x: any) => x.earthwork_id === item.id); const myMaterials = materials.filter((x: any) => x.earthwork_id === item.id); const myVigilance = vigilance.filter((x: any) => x.earthwork_id === item.id); const myPlanning = planning.filter((x: any) => x.earthwork_id === item.id);
  async function deleteRow(table: string, id: string) { if (!confirm("Supprimer ?")) return; const { error } = await supabase.from(table).delete().eq("id", id); if (error) return alert(error.message); await refreshAll(); }
  async function addPhoto(e: any) { e.preventDefault(); const file = e.currentTarget?.photo?.files?.[0]; if (!file) return; const file_url = await uploadFile("photos", file); const { error } = await supabase.from("earthwork_photos").insert({ earthwork_id: item.id, title: photoTitle || file.name, file_url }); if (error) return alert(error.message); setPhotoTitle(""); await refreshAll(); }
  async function addDoc(e: any) { e.preventDefault(); const file = e.currentTarget?.doc?.files?.[0]; if (!file) return; const file_url = await uploadFile("documents", file); const { error } = await supabase.from("earthwork_documents").insert({ earthwork_id: item.id, name: docName || file.name, type: "autre", file_url }); if (error) return alert(error.message); setDocName(""); await refreshAll(); }
  async function addNote(e: any) { e.preventDefault(); if (!note) return; const { error } = await supabase.from("earthwork_notes").insert({ earthwork_id: item.id, content: note }); if (error) return alert(error.message); setNote(""); await refreshAll(); }
  async function addMaterial(e: any) { e.preventDefault(); if (!matTitle && !matContent) return; const { error } = await supabase.from("earthwork_materials").insert({ earthwork_id: item.id, title: matTitle || "Matériel", content: matContent }); if (error) return alert(error.message); setMatTitle(""); setMatContent(""); await refreshAll(); }
  async function addVigilance(e: any) { e.preventDefault(); if (!vigTitle && !vigContent) return; const { error } = await supabase.from("earthwork_vigilance").insert({ earthwork_id: item.id, title: vigTitle || "Point de vigilance", content: vigContent }); if (error) return alert(error.message); setVigTitle(""); setVigContent(""); await refreshAll(); }
  async function addPlanning(e: any) { e.preventDefault(); if (!plan.title || !plan.start_date) return alert("Titre et date obligatoires"); const { error } = await supabase.from("earthwork_planning").insert({ earthwork_id: item.id, ...plan, end_date: plan.end_date || plan.start_date }); if (error) return alert(error.message); setPlan({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: item.color || "#92400e", notes: "" }); await refreshAll(); }
  async function updatePlanning(p: any) { const title = prompt("Titre :", p.title || ""); if (title === null) return; const start_date = prompt("Date début :", p.start_date || ""); if (start_date === null) return; const { error } = await supabase.from("earthwork_planning").update({ title, start_date }).eq("id", p.id); if (error) return alert(error.message); await refreshAll(); }
  return <div className="space-y-6"><Card className="border-l-8" style={{ borderLeftColor: item.color || "#92400e" }}><h2 className="text-2xl font-black">{item.name}</h2><p className="text-sm text-slate-500">{item.client} · {item.address}</p>{item.description && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm">{item.description}</p>}</Card><div className="grid gap-6 lg:grid-cols-2"><Card className="bg-amber-50 border-l-8 border-amber-400"><h3 className="mb-3 text-xl font-black text-amber-950">📦 Matériel terrassement</h3><form onSubmit={addMaterial} className="space-y-3"><Field label="Titre"><Input value={matTitle} onChange={(e: any) => setMatTitle(e.target.value)} /></Field><Field label="Détail"><Textarea value={matContent} onChange={(e: any) => setMatContent(e.target.value)} /></Field><Button variant="amber">Ajouter</Button></form><div className="mt-4 space-y-2">{myMaterials.map((m: any) => <div key={m.id} className="rounded-2xl bg-white p-3"><b>{m.title}</b><pre className="mt-2 whitespace-pre-wrap text-sm">{m.content}</pre><Button variant="danger" className="mt-2" onClick={() => deleteRow("earthwork_materials", m.id)}>Supprimer</Button></div>)}</div></Card><Card className="bg-red-50 border-l-8 border-red-500"><h3 className="mb-3 text-xl font-black text-red-950">⚠️ Vigilance terrassement</h3><form onSubmit={addVigilance} className="space-y-3"><Field label="Titre"><Input value={vigTitle} onChange={(e: any) => setVigTitle(e.target.value)} /></Field><Field label="Détail"><Textarea value={vigContent} onChange={(e: any) => setVigContent(e.target.value)} /></Field><Button variant="danger">Ajouter</Button></form><div className="mt-4 space-y-2">{myVigilance.map((v: any) => <div key={v.id} className="rounded-2xl bg-white p-3"><b>{v.title}</b><pre className="mt-2 whitespace-pre-wrap text-sm">{v.content}</pre><Button variant="danger" className="mt-2" onClick={() => deleteRow("earthwork_vigilance", v.id)}>Supprimer</Button></div>)}</div></Card></div><Card><h3 className="mb-3 font-black">Planning terrassement autonome</h3><form onSubmit={addPlanning} className="grid gap-3 md:grid-cols-3"><Field label="Tâche"><Input value={plan.title} onChange={(e: any) => setPlan({ ...plan, title: e.target.value })} /></Field><Field label="Début"><Input type="date" value={plan.start_date} onChange={(e: any) => setPlan({ ...plan, start_date: e.target.value })} /></Field><Field label="Fin"><Input type="date" value={plan.end_date} onChange={(e: any) => setPlan({ ...plan, end_date: e.target.value })} /></Field><Button>Ajouter au planning</Button></form><div className="mt-4 space-y-2">{myPlanning.map((p: any) => <div key={p.id} className="rounded-2xl p-3 text-white" style={{ background: p.color || item.color || "#92400e" }}><b>{p.title}</b><br />{p.start_date} → {p.end_date}<div className="mt-2 flex gap-2"><button onClick={() => updatePlanning(p)} className="rounded-xl bg-white/20 px-3 py-1 text-xs">Modifier</button><button onClick={() => deleteRow("earthwork_planning", p.id)} className="rounded-xl bg-white/20 px-3 py-1 text-xs">Supprimer</button></div></div>)}</div></Card><div className="grid gap-6 lg:grid-cols-2"><Card><h3 className="mb-3 font-black">Photos terrassement</h3><form onSubmit={addPhoto} className="space-y-3"><Field label="Titre"><Input value={photoTitle} onChange={(e: any) => setPhotoTitle(e.target.value)} /></Field><Input name="photo" type="file" accept="image/*" /><Button>Ajouter photo</Button></form><div className="mt-4 grid grid-cols-2 gap-3">{myPhotos.map((p: any) => <div key={p.id}><img src={p.file_url} className="h-32 w-full rounded-2xl object-cover" /><Button variant="danger" className="mt-2" onClick={() => deleteRow("earthwork_photos", p.id)}>Supprimer</Button></div>)}</div></Card><Card><h3 className="mb-3 font-black">Documents terrassement</h3><form onSubmit={addDoc} className="space-y-3"><Field label="Nom"><Input value={docName} onChange={(e: any) => setDocName(e.target.value)} /></Field><Input name="doc" type="file" /><Button>Ajouter document</Button></form><div className="mt-4 space-y-2">{myDocs.map((d: any) => <div key={d.id} className="flex justify-between rounded-2xl bg-slate-50 p-3"><a href={d.file_url} target="_blank" className="font-bold underline">{d.name}</a><button onClick={() => deleteRow("earthwork_documents", d.id)} className="text-red-600 font-bold">Supprimer</button></div>)}</div></Card></div><Card><h3 className="mb-3 font-black">Notes terrassement</h3><form onSubmit={addNote} className="grid gap-3 md:grid-cols-[1fr_120px]"><Input value={note} onChange={(e: any) => setNote(e.target.value)} /><Button>Ajouter</Button></form><div className="mt-4 space-y-2">{myNotes.map((n: any) => <div key={n.id} className="flex justify-between rounded-2xl bg-slate-50 p-3"><span>{n.content}</span><button onClick={() => deleteRow("earthwork_notes", n.id)} className="text-red-600 font-bold">Supprimer</button></div>)}</div></Card></div>;
}

function Mobile({ projects, refreshAll }: any) {
  const [projectId, setProjectId] = useState("");
  const [note, setNote] = useState("");

  async function quickPhoto(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.mobilePhoto?.files?.[0];
    if (!projectId || !file) return alert("Choisis un chantier et une photo");
    try {
      const file_url = await uploadFile("photos", file);
      const { error } = await supabase.from("chantier_photos").insert({ project_id: projectId, title: file.name, file_url, phase: "mobile" });
      if (error) throw error;
      await refreshAll();
      alert("Photo envoyée");
    } catch (err: any) { alert(err.message); }
  }

  async function quickNote(e: any) {
    e.preventDefault();
    if (!projectId || !note) return;
    const { error } = await supabase.from("chantier_notes").insert({ project_id: projectId, content: note });
    if (error) return alert(error.message);
    setNote("");
    await refreshAll();
  }

  return (
    <div>
      <Section title="Mobile terrain" subtitle="Interface simplifiée pour téléphone." />
      <div className="mx-auto max-w-md space-y-4">
        <Card><Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field></Card>
        <Card><h3 className="mb-3 font-black">Photo rapide</h3><form onSubmit={quickPhoto} className="space-y-3"><Input name="mobilePhoto" type="file" accept="image/*" capture="environment" /><Button className="w-full"><Camera size={16} className="mr-2" /> Envoyer photo</Button></form></Card>
        <Card><h3 className="mb-3 font-black">Note rapide</h3><form onSubmit={quickNote} className="space-y-3"><Textarea value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Note chantier..." /><Button className="w-full">Ajouter note</Button></form></Card>
      </div>
    </div>
  );
}
