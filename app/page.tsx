"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Field, Input, Select, Textarea, Section, Badge } from "@/components/Ui";
import {
  Building2, Camera, FileText, Users, Truck, MessageSquare, Smartphone,
  LayoutDashboard, LogOut, Pencil, Trash2, CalendarDays, Package, HardHat, Euro, ClipboardList, Wrench, Shovel, MapPinned, Image as ImageIcon
} from "lucide-react";

const menu = [
  { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard },
  { id: "projects", title: "Chantiers", icon: Building2 },
  { id: "storekeeper", title: "Magasinier", icon: Package },
  { id: "earthworks", title: "Terrassement", icon: HardHat },
  { id: "planning", title: "Planning", icon: CalendarDays },
  { id: "employees", title: "Salariés", icon: Users },
  { id: "vehicles", title: "Véhicules", icon: Truck },
  { id: "requests", title: "Demandes internes", icon: ClipboardList },
  { id: "mobile", title: "Photos Express", icon: ImageIcon },
  { id: "management", title: "Gestion", icon: Euro }
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
  // Important : ne pas utiliser toISOString() ici.
  // En France, un Date local à minuit peut devenir la veille en UTC,
  // ce qui décale l'affichage du planning d'une journée.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("admin");
  const [earthworks, setEarthworks] = useState<any[]>([]);
  const [earthworkPhotos, setEarthworkPhotos] = useState<any[]>([]);
  const [earthworkDocs, setEarthworkDocs] = useState<any[]>([]);
  const [earthworkNotes, setEarthworkNotes] = useState<any[]>([]);
  const [earthworkMaterials, setEarthworkMaterials] = useState<any[]>([]);
  const [earthworkVigilance, setEarthworkVigilance] = useState<any[]>([]);
  const [earthworkPlanning, setEarthworkPlanning] = useState<any[]>([]);
  const [earthworkRentals, setEarthworkRentals] = useState<any[]>([]);
  const [earthworkInvoices, setEarthworkInvoices] = useState<any[]>([]);
  const [earthworkRevenues, setEarthworkRevenues] = useState<any[]>([]);
  const [earthworkReturns, setEarthworkReturns] = useState<any[]>([]);
  
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
    const [p, ph, d, e, l, n, v, r, pl, mat, vig, inv, rev, ret, ew, ewph, ewd, ewn, ewm, ewv, ewp, ewr, ewi, ewrev, ewret] = await Promise.all([
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
      supabase.from("project_invoices").select("*").order("invoice_date", { ascending: false }),
      supabase.from("project_revenues").select("*").order("billing_date", { ascending: false }),
      supabase.from("merchandise_returns").select("*").order("return_date", { ascending: false }),
      supabase.from("earthworks").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_photos").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_materials").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_vigilance").select("*").order("created_at", { ascending: false }),
      supabase.from("earthwork_planning").select("*").order("start_date", { ascending: true }),
      supabase.from("earthwork_machine_rentals").select("*").order("start_date", { ascending: true }),
      supabase.from("earthwork_invoices").select("*").order("invoice_date", { ascending: false }),
      supabase.from("earthwork_revenues").select("*").order("billing_date", { ascending: false }),
      supabase.from("earthwork_returns").select("*").order("return_date", { ascending: false })
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
    setInvoices(inv.data || []);
    setRevenues(rev.data || []);
    setReturns(ret.data || []);
    setEarthworks(ew.data || []);
    setEarthworkPhotos(ewph.data || []);
    setEarthworkDocs(ewd.data || []);
    setEarthworkNotes(ewn.data || []);
    setEarthworkMaterials(ewm.data || []);
    setEarthworkVigilance(ewv.data || []);
    setEarthworkPlanning(ewp.data || []);
    setEarthworkRentals(ewr.data || []);
    setEarthworkInvoices(ewi.data || []);
    setEarthworkRevenues(ewrev.data || []);
    setEarthworkReturns(ewret.data || []);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

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
          <div className="mt-3 lg:hidden">
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              ☰ Menu
            </Button>
            {mobileMenuOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {menu.filter((m) => userRole === "admin" || ["projects", "planning", "earthworks"].includes(m.id)).map((m) => {
                  const Icon = m.icon;
                  return (
                    <Button key={m.id} variant={active === m.id ? "primary" : "secondary"} onClick={() => { setActive(m.id); setMobileMenuOpen(false); }}>
                      <Icon size={16} className="mr-2" /> {m.title}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        <section className="p-5 pb-28 lg:p-8">
          {active === "dashboard" && userRole === "admin" && <Dashboard projects={projects} photos={photos} docs={docs} requests={requests} materials={materials} invoices={invoices} setActive={setActive} />}
          {active === "storekeeper" && userRole === "admin" && <Storekeeper projects={projects} materials={materials} invoices={invoices} returns={returns} refreshAll={refreshAll} />}
          {active === "projects" && <Projects projects={projects} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} invoices={invoices} revenues={revenues} returns={returns} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />}
          {active === "earthworks" && <Earthworks earthworks={earthworks} photos={earthworkPhotos} docs={earthworkDocs} notes={earthworkNotes} materials={earthworkMaterials} vigilance={earthworkVigilance} planning={earthworkPlanning} rentals={earthworkRentals} earthworkInvoices={earthworkInvoices} earthworkRevenues={earthworkRevenues} earthworkReturns={earthworkReturns} refreshAll={refreshAll} />}
          {active === "planning" && <Planning projects={projects} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />}
          {active === "employees" && userRole === "admin" && <Employees employees={employees} projects={projects} refreshAll={refreshAll} />}
          {active === "vehicles" && userRole === "admin" && <Vehicles vehicles={vehicles} refreshAll={refreshAll} />}
          {active === "requests" && userRole === "admin" && <Requests requests={requests} projects={projects} employees={employees} refreshAll={refreshAll} projectName={projectName} />}
          {active === "mobile" && userRole === "admin" && <Mobile projects={projects} refreshAll={refreshAll} />}
          {active === "management" && userRole === "admin" && <Management projects={projects} employees={employees} planning={planning} invoices={invoices} revenues={revenues} returns={returns} refreshAll={refreshAll} />}
        </section>
      </main>
    </div>
  );
}



function Dashboard({ projects, photos, docs, requests, materials = [], invoices = [], setActive }: any) {
  const enCours = projects.filter((p: any) => p.status === "en_cours");
  const materialTodo = materials.filter((m: any) => !m.ready);
  const openRequests = requests.filter((r: any) => !["termine", "traité", "traite", "closed", "fait"].includes(String(r.status || "").toLowerCase()));

  const dashboardCards = [
    { title: "Chantiers en cours", value: enCours.length, subtitle: enCours.slice(0, 3).map((p: any) => p.name).join(" · ") || "Aucun chantier en cours", tone: "border-emerald-500 bg-emerald-50 text-emerald-700", action: "Voir chantiers", target: "projects" },
    { title: "Matériel à prévoir", value: materialTodo.length, subtitle: materialTodo.slice(0, 3).map((m: any) => m.title || "Matériel").join(" · ") || "Aucun matériel en attente", tone: "border-amber-400 bg-amber-50 text-amber-700", action: "Voir magasinier", target: "storekeeper" },
    { title: "Demandes internes", value: openRequests.length, subtitle: openRequests.slice(0, 3).map((r: any) => r.title || r.message || "Demande").join(" · ") || "Aucune demande ouverte", tone: "border-blue-500 bg-blue-50 text-blue-700", action: "Voir demandes", target: "requests" },
    { title: "Factures chantier", value: invoices.length, subtitle: invoices.slice(0, 3).map((i: any) => i.supplier || "Facture").join(" · ") || "Aucune facture enregistrée", tone: "border-purple-500 bg-purple-50 text-purple-700", action: "Voir gestion", target: "management" }
  ];

  return (
    <div>
      <Section title="Tableau de bord" subtitle="Vue synthétique sans détail long, optimisée mobile." />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {dashboardCards.map((card: any) => (
          <Card key={card.title} className={`border-l-8 ${card.tone}`}>
            <p className="text-xs font-black uppercase opacity-80">{card.title}</p>
            <p className="mt-2 text-4xl font-black">{card.value}</p>
            <p className="mt-2 line-clamp-2 min-h-10 text-xs text-slate-600">{card.subtitle}</p>
            <Button className="mt-4 w-full text-xs" onClick={() => setActive(card.target)}>{card.action}</Button>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="border-l-8 border-emerald-500">
          <h3 className="text-lg font-black">🏗️ Chantiers en cours</h3>
          <div className="mt-4 space-y-2">
            {enCours.slice(0, 5).map((p: any) => (
              <div key={p.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="font-black">{p.name}</div>
                <div className="text-xs text-slate-500">{p.address || p.client || "Adresse non renseignée"}</div>
              </div>
            ))}
            {enCours.length === 0 && <p className="text-sm text-slate-500">Aucun chantier en cours.</p>}
          </div>
        </Card>

        <Card className="border-l-8 border-amber-400">
          <h3 className="text-lg font-black">📦 Matériel à prévoir</h3>
          <div className="mt-4 space-y-2">
            {materialTodo.slice(0, 5).map((m: any) => (
              <div key={m.id} className="rounded-2xl bg-amber-50 p-3">
                <div className="font-black">{m.title || "Matériel à prévoir"}</div>
                <div className="text-xs text-slate-500">{projects.find((p: any) => p.id === m.project_id)?.name || "Chantier inconnu"}</div>
              </div>
            ))}
            {materialTodo.length === 0 && <p className="text-sm text-slate-500">Aucun matériel à préparer.</p>}
          </div>
        </Card>

        <Card className="border-l-8 border-blue-500">
          <h3 className="text-lg font-black">💬 Demandes internes</h3>
          <div className="mt-4 space-y-2">
            {openRequests.slice(0, 5).map((r: any) => (
              <div key={r.id} className="rounded-2xl bg-blue-50 p-3">
                <div className="font-black">{r.title || r.message || "Demande interne"}</div>
                <div className="text-xs text-slate-500">{projects.find((p: any) => p.id === r.project_id)?.name || "Sans chantier"}</div>
              </div>
            ))}
            {openRequests.length === 0 && <p className="text-sm text-slate-500">Aucune demande ouverte.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Projects({ projects, photos, docs, notes, materials, vigilance, invoices, revenues = [], returns = [], employees, links, planning, refreshAll }: any) {
  const [selectedId, setSelectedId] = useState("");
  const current = projects.find((p: any) => p.id === selectedId) || projects.find((p: any) => p.status !== "archive") || projects[0];
  const detailRef = useRef<HTMLDivElement | null>(null);
  const [detailMode, setDetailMode] = useState(false);

  function openProject(id: string) {
    setSelectedId(id);
    setDetailMode(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }
  const [form, setForm] = useState({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#0f172a", progress: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  async function saveProject(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom chantier obligatoire");
    const query = editingId ? supabase.from("projects").update(form).eq("id", editingId) : supabase.from("projects").insert(form);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#0f172a", progress: 0 });
    setEditingId(null);
    await refreshAll();
  }

  function editProject(p: any) {
    setForm({ name: p.name || "", client: p.client || "", address: p.address || "", description: p.description || "", status: p.status || "en_cours", color: p.color || "#0f172a", progress: p.progress || 0 });
    setEditingId(p.id);
    setShowCreateProject(true);
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

  if (detailMode && current) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-30 mb-4 rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Fiche chantier</p>
              <h2 className="text-2xl font-black">{current.name}</h2>
            </div>
            <Button variant="secondary" onClick={() => { setDetailMode(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              ← Retour liste chantiers
            </Button>
          </div>
        </div>

        <ProjectDetail project={current} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} invoices={invoices} revenues={revenues} returns={returns} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />
      </div>
    );
  }

  return (
    <div>
      <Section title="Gestion chantier" subtitle="Clique sur Accéder : la fiche chantier s’ouvre directement en pleine page." />
      <Button className="mb-4" onClick={() => setShowCreateProject(!showCreateProject)}>{showCreateProject ? "Fermer création chantier" : "+ Créer un chantier"}</Button>

      {showCreateProject && <Card>
        <form onSubmit={saveProject} className="grid gap-3 md:grid-cols-3">
          <Field label="Nom"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Client"><Input value={form.client} onChange={(e: any) => setForm({ ...form, client: e.target.value })} /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option value="preparation">À préparer</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="archive">Archivé</option></Select></Field>
          <Field label="Couleur"><Input type="color" value={form.color} onChange={(e: any) => setForm({ ...form, color: e.target.value })} /></Field>
          
          <Field label="Avancement %"><Input type="number" min="0" max="100" value={form.progress} onChange={(e: any) => setForm({ ...form, progress: Number(e.target.value) })} /></Field>
          <div className="md:col-span-3"><Field label="Description"><Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <Button className="md:col-span-3">{editingId ? "Modifier chantier" : "Créer chantier"}</Button>
        </form>
      </Card>}

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
                <Button onClick={() => openProject(p.id)}>Accéder</Button>
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
                <Button variant="secondary" onClick={() => openProject(p.id)}>Consulter</Button>
                <Button variant="green" onClick={() => restoreProject(p)}>Réactiver</Button>
                <Button variant="danger" className="col-span-2" onClick={() => deleteProject(p)}>Supprimer définitivement</Button>
              </div>
            </Card>
          ))}
          {archivedProjects.length === 0 && <Card><p className="text-sm text-slate-500">Aucun chantier archivé.</p></Card>}
        </div>

        <Card><h3 className="text-xl font-black">Sélection chantier</h3><p className="mt-2 text-sm text-slate-500">Clique sur “Accéder” pour ouvrir la fiche chantier en pleine page.</p></Card>
      </div>
    </div>
  );
}

function ProjectDetail({ project, photos, docs, notes, materials, vigilance, invoices, revenues = [], returns = [], employees, links, planning, refreshAll }: any) {
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
  const projectInvoices = invoices.filter((x: any) => x.project_id === project.id);
  const projectRevenues = revenues.filter((x: any) => x.project_id === project.id);
  const projectReturns = returns.filter((x: any) => x.project_id === project.id);
  const assignedEmployees = links.filter((l: any) => l.project_id === project.id).map((l: any) => employees.find((e: any) => e.id === l.employee_id)).filter(Boolean);
  const projectInterventions = planning.filter((p: any) => p.project_id === project.id);
  const employeeInterventionSummary = assignedEmployees.map((emp: any) => ({ employee: emp, items: projectInterventions.filter((p: any) => p.employee_id === emp.id) }));
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [vigilanceTitle, setVigilanceTitle] = useState("");
  const [vigilanceContent, setVigilanceContent] = useState("");
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);
  const [openVigilanceId, setOpenVigilanceId] = useState<string | null>(null);
  const [fullVigilance, setFullVigilance] = useState<any>(null);
  const [chantierTab, setChantierTab] = useState("factures");
  const [invoiceForm, setInvoiceForm] = useState({ supplier: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: "", notes: "" });
  const [clientInvoiceForm, setClientInvoiceForm] = useState({ label: "Facturation client", amount: "", tva_rate: "10", billing_date: "", status: "facturé", notes: "" });
  const [returnForm, setReturnForm] = useState({ supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" });
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingClientInvoiceId, setEditingClientInvoiceId] = useState<string | null>(null);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<any>(null);
  const money = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
  function amountHT(x: any) { return Number(x.amount_ht ?? x.amount ?? 0); }
  function amountTVA(x: any) { return Number(x.amount_tva ?? (amountHT(x) * Number(x.tva_rate || 0) / 100)); }
  function amountTTC(x: any) { return Number(x.amount_ttc ?? (amountHT(x) + amountTVA(x))); }
  function makeTaxPayload(amount: string, rate: string) { const ht = Math.round(Number(amount || 0) * 100) / 100; const tva = Math.round((ht * Number(rate || 0) / 100) * 100) / 100; const ttc = Math.round((ht + tva) * 100) / 100; return { amount: ht, amount_ht: ht, tva_rate: Number(rate || 0), amount_tva: tva, amount_ttc: ttc }; }
  const invoicesHT = projectInvoices.reduce((sum: number, i: any) => sum + amountHT(i), 0);
  const invoicesTVA = projectInvoices.reduce((sum: number, i: any) => sum + amountTVA(i), 0);
  const returnsHT = projectReturns.reduce((sum: number, r: any) => sum + amountHT(r), 0);
  const returnsTVA = projectReturns.reduce((sum: number, r: any) => sum + amountTVA(r), 0);
  const revenuesHT = projectRevenues.reduce((sum: number, r: any) => sum + amountHT(r), 0);
  const revenuesTVA = projectRevenues.reduce((sum: number, r: any) => sum + amountTVA(r), 0);
  const netCostsHT = Math.max(0, invoicesHT - returnsHT);
  const marginHT = revenuesHT - netCostsHT;
  const tvaBalance = revenuesTVA - Math.max(0, invoicesTVA - returnsTVA);

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

  async function setMaterialReady(item: any, ready: boolean) {
    const { error } = await supabase.from("project_materials").update({ ready }).eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function openEditor(type: string, item: any) {
    setEditingText({ type, id: item.id, title: item.title || "", content: item.content || "" });
  }

  async function saveEditor(e: any) {
    e.preventDefault();
    const table = editingText.type === "material" ? "project_materials" : editingText.type === "vigilance" ? "project_vigilance" : "chantier_notes";
    const payload: any = editingText.type === "note" ? { content: editingText.content } : { title: editingText.title, content: editingText.content };
    const { error } = await supabase.from(table).update(payload).eq("id", editingText.id);
    if (error) return alert(error.message);
    setEditingText(null);
    await refreshAll();
  }

  async function addInvoice(e: any) {
    e.preventDefault();
    if (!invoiceForm.supplier || !invoiceForm.amount) return alert("Fournisseur et montant HT obligatoires");
    const payload = { project_id: project.id, supplier: invoiceForm.supplier, category: invoiceForm.category, ...makeTaxPayload(invoiceForm.amount, invoiceForm.tva_rate), invoice_date: invoiceForm.invoice_date || null, notes: invoiceForm.notes };
    const query = editingInvoiceId ? supabase.from("project_invoices").update(payload).eq("id", editingInvoiceId) : supabase.from("project_invoices").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingInvoiceId(null);
    setInvoiceForm({ supplier: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: "", notes: "" });
    await refreshAll();
  }

  function updateInvoice(inv: any) {
    setEditingInvoiceId(inv.id);
    setInvoiceForm({ supplier: inv.supplier || "", category: inv.category || "matériaux", amount: String(amountHT(inv) || ""), tva_rate: String(inv.tva_rate ?? 20), invoice_date: inv.invoice_date || "", notes: inv.notes || "" });
  }

  async function deleteInvoice(inv: any) {
    if (!confirm("Supprimer cette facture ?")) return;
    const { error } = await supabase.from("project_invoices").delete().eq("id", inv.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function saveClientInvoice(e: any) {
    e.preventDefault();
    if (!clientInvoiceForm.amount) return alert("Montant HT obligatoire");
    const payload = { project_id: project.id, label: clientInvoiceForm.label || "Facturation client", status: clientInvoiceForm.status, ...makeTaxPayload(clientInvoiceForm.amount, clientInvoiceForm.tva_rate), billing_date: clientInvoiceForm.billing_date || null, notes: clientInvoiceForm.notes };
    const query = editingClientInvoiceId ? supabase.from("project_revenues").update(payload).eq("id", editingClientInvoiceId) : supabase.from("project_revenues").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingClientInvoiceId(null);
    setClientInvoiceForm({ label: "Facturation client", amount: "", tva_rate: "10", billing_date: "", status: "facturé", notes: "" });
    await refreshAll();
  }

  function editClientInvoice(r: any) {
    setEditingClientInvoiceId(r.id);
    setClientInvoiceForm({ label: r.label || "Facturation client", amount: String(amountHT(r) || ""), tva_rate: String(r.tva_rate ?? 10), billing_date: r.billing_date || "", status: r.status || "facturé", notes: r.notes || "" });
  }

  async function deleteClientInvoice(r: any) {
    if (!confirm("Supprimer cette facturation client ?")) return;
    const { error } = await supabase.from("project_revenues").delete().eq("id", r.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function saveProjectReturn(e: any) {
    e.preventDefault();
    if (!returnForm.supplier || !returnForm.amount) return alert("Fournisseur et montant HT obligatoires");
    const payload = { project_id: project.id, supplier: returnForm.supplier, ...makeTaxPayload(returnForm.amount, returnForm.tva_rate), return_date: returnForm.return_date || null, notes: returnForm.notes };
    const query = editingReturnId ? supabase.from("merchandise_returns").update(payload).eq("id", editingReturnId) : supabase.from("merchandise_returns").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingReturnId(null);
    setReturnForm({ supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" });
    await refreshAll();
  }

  function editProjectReturn(r: any) {
    setEditingReturnId(r.id);
    setReturnForm({ supplier: r.supplier || "", amount: String(amountHT(r) || ""), tva_rate: String(r.tva_rate ?? 20), return_date: r.return_date || "", notes: r.notes || "" });
  }

  async function deleteProjectReturn(r: any) {
    if (!confirm("Supprimer ce retour chantier ?")) return;
    const { error } = await supabase.from("merchandise_returns").delete().eq("id", r.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function generateProjectDetailReport() {
    const html = `<html><head><title>Rapport chantier - ${project.name}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;background:#f1f5f9;color:#0f172a}.page{max-width:980px;margin:auto;background:white;padding:28px}.header{border-bottom:4px solid #0f172a;padding-bottom:16px}.logo{height:70px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.card{border-radius:20px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0}.value{font-size:24px;font-weight:900}.section{margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f172a;color:white;text-align:left;padding:10px}td{padding:10px;border-bottom:1px solid #e2e8f0}.summary{margin-top:22px;border-radius:24px;padding:20px;background:${marginHT>=0?'#ecfdf5':'#fef2f2'};border-left:10px solid ${marginHT>=0?'#10b981':'#ef4444'}}@media print{body{background:white}.page{padding:0}}</style></head><body><div class="page"><div class="header"><img class="logo" src="/logo-asb.png"/><h1>Rapport chantier / gestion TVA</h1><p><b>${project.name}</b> · ${project.client || ''}</p><p>${project.address || ''}</p></div><div class="grid"><div class="card"><b>Facturation client HT</b><div class="value">${money(revenuesHT)}</div></div><div class="card"><b>Dépenses HT</b><div class="value">${money(invoicesHT)}</div></div><div class="card"><b>Retours HT</b><div class="value">-${money(returnsHT)}</div></div><div class="card"><b>Marge HT</b><div class="value">${money(marginHT)}</div></div></div><div class="summary"><b>TVA</b><p>TVA collectée : ${money(revenuesTVA)} · TVA déductible nette : ${money(Math.max(0, invoicesTVA - returnsTVA))} · Solde TVA estimatif : ${money(tvaBalance)}</p></div><div class="section"><h2>Facturation client</h2><table><thead><tr><th>Libellé</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead><tbody>${projectRevenues.map((r:any)=>`<tr><td><b>${r.label||'Facturation client'}</b></td><td>${r.billing_date||''}</td><td>${money(amountHT(r))}</td><td>${money(amountTVA(r))}</td><td>${money(amountTTC(r))}</td></tr>`).join('') || '<tr><td colspan="5">Aucune facturation.</td></tr>'}</tbody></table></div><div class="section"><h2>Factures fournisseurs</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead><tbody>${projectInvoices.map((i:any)=>`<tr><td><b>${i.supplier||'Fournisseur'}</b></td><td>${i.invoice_date||''}</td><td>${money(amountHT(i))}</td><td>${money(amountTVA(i))}</td><td>${money(amountTTC(i))}</td></tr>`).join('') || '<tr><td colspan="5">Aucune facture.</td></tr>'}</tbody></table></div><div class="section"><h2>Retours</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>HT</th><th>TVA corrigée</th><th>TTC</th></tr></thead><tbody>${projectReturns.map((r:any)=>`<tr><td><b>${r.supplier||'Retour'}</b></td><td>${r.return_date||''}</td><td>-${money(amountHT(r))}</td><td>-${money(amountTVA(r))}</td><td>-${money(amountTTC(r))}</td></tr>`).join('') || '<tr><td colspan="5">Aucun retour.</td></tr>'}</tbody></table></div><p style="font-size:12px;color:#64748b;margin-top:22px">Document interne ASB — rapport chantier.</p></div></body></html>`;
    const w = window.open('', '_blank'); if (!w) return alert("Autorise les pop-up pour générer le rapport.");
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
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
      <Card className="overflow-hidden border-l-8 p-0" style={{ borderLeftColor: project.color || "#0f172a" }}>
        <div className="bg-slate-900 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black">{project.name}</h2>
              <p className="mt-1 text-sm text-slate-300">{project.client || "Client non renseigné"} · {project.address || "Adresse non renseignée"}</p>
            </div>
            <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={generateProjectDetailReport}>Rapport chantier PDF</Button><Badge tone={statusTone[project.status] || "slate"}>{statusLabels[project.status] || project.status}</Badge></div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => setChantierTab("factures")} className="rounded-3xl bg-emerald-50 p-4 text-left">
            <p className="text-xs font-bold uppercase text-emerald-700">Avancement</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{project.progress || 0}%</p>
          </button>
          <button type="button" onClick={() => setChantierTab("intervenants")} className="rounded-3xl bg-blue-50 p-4 text-left">
            <p className="text-xs font-bold uppercase text-blue-700">Intervenants</p>
            <p className="mt-2 text-3xl font-black text-blue-700">{assignedEmployees.length}</p>
          </button>
          <button type="button" onClick={() => setChantierTab("planning")} className="rounded-3xl bg-purple-50 p-4 text-left">
            <p className="text-xs font-bold uppercase text-purple-700">Interventions</p>
            <p className="mt-2 text-3xl font-black text-purple-700">{projectInterventions.length}</p>
          </button>
          <button type="button" onClick={() => setChantierTab("intervenants")} className="rounded-3xl bg-amber-50 p-4 text-left">
            <p className="text-xs font-bold uppercase text-amber-700">Masse salariale</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{projectInterventions.length} int.</p>
          </button>
        </div>

        {project.description && <p className="mx-4 mb-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{project.description}</p>}

        <div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["factures", "💰 Factures", projectInvoices.length],
            ["photos", "📸 Photos", projectPhotos.length],
            ["documents", "📄 Documents", projectDocs.length],
            ["intervenants", "👷 Intervenants", assignedEmployees.length],
            ["vigilance", "⚠️ Vigilance", projectVigilance.length],
            ["notes", "📝 Notes", projectNotes.length],
            ["planning", "📅 Planning", projectInterventions.length]
          ].map(([id, label, count]: any) => (
            <button
              key={id}
              type="button"
              onClick={() => setChantierTab(id)}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black ${chantierTab === id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700"}`}
            >
              <span>{label}</span>
              <span className="rounded-full bg-white/20 px-2 py-1 text-xs">{count}</span>
            </button>
          ))}
        </div>
      </Card>

      
      <div className={chantierTab === "factures" ? "block" : "hidden"}>
        <Card className="border-l-8 border-slate-900 bg-slate-50">
          <div className="mb-3 rounded-2xl bg-slate-900 px-4 py-3 text-white"><p className="text-xs font-black uppercase">V31 FIX 2 — Chantier TVA actif</p><h3 className="text-xl font-black">📊 Synthèse chantier HT / TVA / TTC</h3></div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-bold uppercase text-emerald-700">Facturé client HT</p><p className="text-xl font-black text-emerald-700">{money(revenuesHT)}</p></div>
            <div className="rounded-2xl bg-red-50 p-3"><p className="text-xs font-bold uppercase text-red-700">Factures HT</p><p className="text-xl font-black text-red-700">{money(invoicesHT)}</p></div>
            <div className="rounded-2xl bg-purple-50 p-3"><p className="text-xs font-bold uppercase text-purple-700">Retours HT</p><p className="text-xl font-black text-purple-700">-{money(returnsHT)}</p></div>
            <div className={marginHT >= 0 ? "rounded-2xl bg-blue-50 p-3" : "rounded-2xl bg-red-100 p-3"}><p className="text-xs font-bold uppercase">Marge HT</p><p className="text-xl font-black">{money(marginHT)}</p></div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">TVA collectée client</p><p className="text-xl font-black">{money(revenuesTVA)}</p></div>
            <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">TVA déductible nette</p><p className="text-xl font-black">{money(Math.max(0, invoicesTVA - returnsTVA))}</p></div>
            <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">Solde TVA estimatif</p><p className="text-xl font-black">{money(tvaBalance)}</p></div>
          </div>
        </Card>

        <Card className="border-l-8 border-blue-500 bg-blue-50">
          <h3 className="mb-3 text-xl font-black text-blue-950">🧾 Factures clients chantier avec TVA</h3>
          <form onSubmit={saveClientInvoice} className="grid gap-3 md:grid-cols-6">
            <Field label="Libellé"><Input value={clientInvoiceForm.label} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, label: e.target.value })} /></Field>
            <Field label="Montant HT"><Input type="number" value={clientInvoiceForm.amount} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, amount: e.target.value })} /></Field>
            <Field label="TVA"><Select value={clientInvoiceForm.tva_rate} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
            <Field label="Date"><Input type="date" value={clientInvoiceForm.billing_date} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, billing_date: e.target.value })} /></Field>
            <Field label="Statut"><Select value={clientInvoiceForm.status} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, status: e.target.value })}><option value="devis">Devis</option><option value="acompte">Acompte</option><option value="facturé">Facturé</option><option value="payé">Payé</option></Select></Field>
            <Field label="Notes"><Input value={clientInvoiceForm.notes} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, notes: e.target.value })} /></Field>
            <div className="flex gap-2 md:col-span-6"><Button variant="green">{editingClientInvoiceId ? "Modifier facturation" : "Ajouter facturation"}</Button>{editingClientInvoiceId && <Button type="button" variant="secondary" onClick={() => { setEditingClientInvoiceId(null); setClientInvoiceForm({ label: "Facturation client", amount: "", tva_rate: "10", billing_date: "", status: "facturé", notes: "" }); }}>Annuler</Button>}</div>
          </form>
          <div className="mt-4 space-y-2">{projectRevenues.map((r: any) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><span><b>{r.label || "Facturation client"}</b> · HT {money(amountHT(r))} · TVA {money(amountTVA(r))} · TTC {money(amountTTC(r))}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editClientInvoice(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteClientInvoice(r)}>Supprimer</Button></div></div>)}</div>
        </Card>

        <Card className="border-l-8 border-purple-500 bg-purple-50">
          <h3 className="mb-3 text-xl font-black text-purple-950">↩️ Retours chantier avec TVA déductible</h3>
          <form onSubmit={saveProjectReturn} className="grid gap-3 md:grid-cols-6">
            <Field label="Fournisseur"><Input value={returnForm.supplier} onChange={(e: any) => setReturnForm({ ...returnForm, supplier: e.target.value })} /></Field>
            <Field label="Montant HT"><Input type="number" value={returnForm.amount} onChange={(e: any) => setReturnForm({ ...returnForm, amount: e.target.value })} /></Field>
            <Field label="TVA"><Select value={returnForm.tva_rate} onChange={(e: any) => setReturnForm({ ...returnForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
            <Field label="Date"><Input type="date" value={returnForm.return_date} onChange={(e: any) => setReturnForm({ ...returnForm, return_date: e.target.value })} /></Field>
            <Field label="Notes"><Input value={returnForm.notes} onChange={(e: any) => setReturnForm({ ...returnForm, notes: e.target.value })} /></Field>
            <div className="flex gap-2 md:col-span-6"><Button variant="amber">{editingReturnId ? "Modifier retour" : "Ajouter retour"}</Button>{editingReturnId && <Button type="button" variant="secondary" onClick={() => { setEditingReturnId(null); setReturnForm({ supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" }); }}>Annuler</Button>}</div>
          </form>
          <div className="mt-4 space-y-2">{projectReturns.map((r: any) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><span><b>{r.supplier || "Retour"}</b> · -HT {money(amountHT(r))} · TVA corrigée {money(amountTVA(r))} · TTC {money(amountTTC(r))}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editProjectReturn(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteProjectReturn(r)}>Supprimer</Button></div></div>)}</div>
        </Card>

        <Card className="border-l-8 border-emerald-500 bg-emerald-50">
          <h3 className="mb-4 text-xl font-black text-emerald-950">💰 Factures fournisseur chantier</h3>
          <form onSubmit={addInvoice} className="grid gap-3 md:grid-cols-5">
            <Field label="Fournisseur"><Input value={invoiceForm.supplier} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, supplier: e.target.value })} /></Field>
            <Field label="Catégorie"><Select value={invoiceForm.category} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}><option value="matériaux">Matériaux</option><option value="sous-traitance">Sous-traitance</option><option value="location matériel">Location matériel</option><option value="carburant">Carburant</option><option value="transport">Transport</option><option value="évacuation">Évacuation</option><option value="autre">Autre</option></Select></Field>
            <Field label="Montant HT"><Input type="number" value={invoiceForm.amount} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} /></Field>
            <Field label="TVA"><Select value={invoiceForm.tva_rate} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
            <Field label="Date facture"><Input type="date" value={invoiceForm.invoice_date} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} /></Field>
            <Field label="Note"><Input value={invoiceForm.notes} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></Field>
            <div className="flex gap-2 md:col-span-5"><Button className="md:col-span-4" variant="green">{editingInvoiceId ? "Modifier facture" : "Ajouter facture"}</Button>{editingInvoiceId && <Button type="button" variant="secondary" onClick={() => { setEditingInvoiceId(null); setInvoiceForm({ supplier: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: "", notes: "" }); }}>Annuler</Button>}</div>
          </form>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {projectInvoices.map((inv: any) => <div key={inv.id} className="rounded-3xl bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-emerald-700">🧾 Fournisseur</div><div className="text-xl font-black">{inv.supplier}</div><div className="mt-2 text-sm text-slate-600">{inv.category || "catégorie"} · {inv.invoice_date || "Date non renseignée"}</div><div className="mt-3 text-2xl font-black text-emerald-700">HT {money(amountHT(inv))}</div><div className="text-sm font-bold text-slate-600">TVA {money(amountTVA(inv))} · TTC {money(amountTTC(inv))}</div>{inv.notes && <div className="mt-2 rounded-2xl bg-emerald-50 p-2 text-sm">{inv.notes}</div>}<div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => updateInvoice(inv)}>Modifier</Button><Button variant="danger" onClick={() => deleteInvoice(inv)}>Supprimer</Button></div></div>)}
          </div>
        </Card>
      </div>

      {fullVigilance && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 md:p-8">
          <div className="mx-auto min-h-[90vh] max-w-5xl rounded-[2rem] bg-white p-4 shadow-2xl md:p-8">
            <div className="sticky top-0 z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/95 p-3 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-600">Point de vigilance chantier</p>
                <h2 className="text-2xl font-black text-slate-950 md:text-4xl">{fullVigilance.title || "Point de vigilance"}</h2>
                <p className="text-sm font-bold text-slate-500">{project.name}</p>
              </div>
              <Button variant="secondary" onClick={() => setFullVigilance(null)}>← Retour chantier</Button>
            </div>
            <div className="rounded-3xl border-l-8 border-red-500 bg-red-50 p-5">
              <pre className="min-h-[55vh] whitespace-pre-wrap rounded-3xl bg-white p-5 text-base leading-7 text-slate-800">{fullVigilance.content || "Aucun détail."}</pre>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => copyText(fullVigilance.title, fullVigilance.content)}>Copier</Button>
                <Button variant="secondary" onClick={() => { openEditor("vigilance", fullVigilance); setFullVigilance(null); }}>Modifier</Button>
                <Button variant="danger" onClick={() => { deleteVigilance(fullVigilance); setFullVigilance(null); }}>Supprimer</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${chantierTab === "vigilance" ? "grid" : "hidden"} gap-6 lg:grid-cols-2`}>
        <Card className="hidden">
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
                <div key={m.id} className={`rounded-2xl border p-3 ${m.ready ? "border-emerald-300 bg-emerald-50" : "border-amber-200 bg-white/90"}`}>
                  <button type="button" onClick={() => setOpenMaterialId(isOpen ? null : m.id)} className="flex w-full items-center justify-between gap-3 text-left">
                    <span className={m.ready ? "font-black text-emerald-950" : "font-black text-amber-950"}>{m.ready ? "✅ " : "📦 "}{m.title || "Matériel à prévoir"}</span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Plein écran</span>
                  </button>

                  {false && isOpen && (
                    <div className="mt-3">
                      <pre className="whitespace-pre-wrap rounded-2xl bg-amber-50 p-3 text-sm text-slate-800">{m.content || "Aucun détail."}</pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!m.ready && <Button variant="green" onClick={() => setMaterialReady(m, true)}>OK prêt !</Button>}
                        {m.ready && <Button variant="amber" onClick={() => setMaterialReady(m, false)}>Remettre à préparer</Button>}
                        <Button variant="secondary" onClick={() => copyText(m.title, m.content)}>Copier</Button>
                        <Button variant="secondary" onClick={() => openEditor("material", m)}>Modifier</Button>
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

        <Card className={"border-l-8 border-red-500 bg-red-50"}>
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
                  <button type="button" onClick={() => setFullVigilance(v)} className="flex w-full items-center justify-between gap-3 text-left">
                    <span className="font-black text-red-950">{v.title || "Point de vigilance"}</span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-900">Plein écran</span>
                  </button>

                  {false && isOpen && (
                    <div className="mt-3">
                      <pre className="whitespace-pre-wrap rounded-2xl bg-red-50 p-3 text-sm text-slate-800">{v.content || "Aucun détail."}</pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => copyText(v.title, v.content)}>Copier</Button>
                        <Button variant="secondary" onClick={() => openEditor("vigilance", v)}>Modifier</Button>
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

      <div className={chantierTab === "factures" || chantierTab === "intervenants" ? "block" : "hidden"}><Card className="border-l-8 border-blue-500 bg-blue-50">
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
      </Card></div>

      <div className={chantierTab === "factures" || chantierTab === "intervenants" ? "block" : "hidden"}><Card>
        <h3 className="mb-4 font-black"><Users size={18} className="mr-2 inline" /> Salariés affectés au chantier</h3>
        <div className="flex flex-wrap gap-2">
          {assignedEmployees.map((e: any) => <span key={e.id} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">{e.firstname} {e.lastname} <span className="text-slate-500">· {e.position || e.role}</span></span>)}
          {assignedEmployees.length === 0 && <p className="text-sm text-slate-500">Aucun salarié affecté à ce chantier.</p>}
        </div>
      </Card></div>

      <div className={`${chantierTab === "factures" || chantierTab === "photos" || chantierTab === "documents" ? "grid" : "hidden"} gap-6 lg:grid-cols-2`}>
        <Card className={chantierTab === "documents" ? "hidden" : ""}>
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

        <Card className={chantierTab === "photos" ? "hidden" : ""}>
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

      <div className={chantierTab === "factures" || chantierTab === "notes" ? "block" : "hidden"}><Card>
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
                <Button variant="secondary" onClick={() => openEditor("note", n)}>Modifier</Button>
                <Button variant="danger" onClick={() => deleteNote(n)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      </Card></div>

      <div className={chantierTab === "planning" ? "block" : "hidden"}>
        <Card>
          <h3 className="mb-4 font-black">📅 Planning lié au chantier</h3>
          <div className="space-y-2">
            {projectInterventions.map((p: any) => {
              const emp = employees.find((e: any) => e.id === p.employee_id);
              return (
                <div key={p.id} className="rounded-2xl p-3 text-white" style={{ background: p.color || project.color || "#0f172a" }}>
                  <b>{p.title}</b>
                  <p className="text-sm">{emp ? `${emp.firstname} ${emp.lastname}` : "Salarié non défini"} · {p.start_date}{p.end_date && p.end_date !== p.start_date ? ` → ${p.end_date}` : ""}</p>
                </div>
              );
            })}
            {projectInterventions.length === 0 && <p className="text-sm text-slate-500">Aucune intervention planifiée.</p>}
          </div>
        </Card>
      </div>

      {editingText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveEditor} className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="text-2xl font-black">Modifier fiche</h3>
            {editingText.type !== "note" && <Field label="Titre"><Input value={editingText.title} onChange={(e: any) => setEditingText({ ...editingText, title: e.target.value })} /></Field>}
            <Field label="Contenu"><Textarea value={editingText.content} onChange={(e: any) => setEditingText({ ...editingText, content: e.target.value })} className="min-h-56" /></Field>
            <div className="mt-4 flex gap-2"><Button>Enregistrer</Button><Button type="button" variant="secondary" onClick={() => setEditingText(null)}>Annuler</Button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Planning({ projects, employees, links, planning, refreshAll }: any) {
  const emptyForm = {
    project_id: "",
    employee_ids: [] as string[],
    title: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    color: "#0f172a",
    notes: ""
  };

  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const assignedIds = form.project_id
    ? links.filter((l: any) => l.project_id === form.project_id).map((l: any) => l.employee_id)
    : [];

  const orderedEmployees = [...employees].sort((a: any, b: any) => {
    const aAssigned = assignedIds.includes(a.id) ? 0 : 1;
    const bAssigned = assignedIds.includes(b.id) ? 0 : 1;
    return aAssigned - bAssigned || `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`);
  });

  function projectNameLocal(id: string) { return projects.find((p: any) => p.id === id)?.name || "Chantier inconnu"; }
  const activeProjects = projects.filter((p: any) => p.status !== "archive");
  function employeeName(id: string) { const e = employees.find((x: any) => x.id === id); return e ? `${e.firstname} ${e.lastname}` : "Salarié inconnu"; }
  function projectColor(id: string) { return projects.find((p: any) => p.id === id)?.color || "#0f172a"; }

  function openCreatePlanning() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setTimeout(() => document.getElementById("planning-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openEditPlanning(item: any) {
    setEditing(item);
    setForm({
      project_id: item.project_id || "",
      employee_ids: item.employee_id ? [item.employee_id] : [],
      title: item.title || "",
      start_date: item.start_date || "",
      end_date: item.end_date || item.start_date || "",
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      color: item.color || projectColor(item.project_id) || "#0f172a",
      notes: item.notes || ""
    });
    setShowForm(true);
    setTimeout(() => document.getElementById("planning-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function toggleEmployee(employeeId: string) {
    const current = form.employee_ids || [];
    setForm({ ...form, employee_ids: current.includes(employeeId) ? current.filter((id: string) => id !== employeeId) : [...current, employeeId] });
  }

  async function ensureProjectAssignments(projectId: string, employeeIds: string[]) {
    const missing = employeeIds
      .filter((employeeId: string) => !links.find((l: any) => l.project_id === projectId && l.employee_id === employeeId))
      .map((employeeId: string) => ({ project_id: projectId, employee_id: employeeId }));
    if (missing.length === 0) return null;
    const { error } = await supabase.from("employee_projects").insert(missing);
    return error;
  }

  async function savePlanning(e: any) {
    e.preventDefault();
    if (!form.project_id || !form.title || !form.start_date) return alert("Chantier, tâche et date de début obligatoires");
    if (!form.employee_ids || form.employee_ids.length === 0) return alert("Sélectionne au moins un salarié");

    const assignmentError = await ensureProjectAssignments(form.project_id, form.employee_ids);
    if (assignmentError) return alert(assignmentError.message);

    const basePayload = {
      project_id: form.project_id,
      title: form.title,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      color: form.color || projectColor(form.project_id),
      notes: form.notes
    };

    if (editing) {
      const { error } = await supabase.from("employee_planning").update({ ...basePayload, employee_id: form.employee_ids[0] }).eq("id", editing.id);
      if (error) return alert(error.message);
    } else {
      const rows = form.employee_ids.map((employee_id: string) => ({ ...basePayload, employee_id }));
      const { error } = await supabase.from("employee_planning").insert(rows);
      if (error) return alert(error.message);
    }

    setEditing(null);
    setShowForm(false);
    setForm(emptyForm);
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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <Section title="Planning" subtitle="Vue semaine/mois directe. Le formulaire s'ouvre uniquement avec le bouton de création ou de modification." />
        <Button onClick={openCreatePlanning}>+ Créer planning</Button>
      </div>

      {showForm && (
        <Card id="planning-form" className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black">{editing ? "Modifier planning" : "Créer planning"}</h3>
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>Fermer</Button>
          </div>
          <form onSubmit={savePlanning} className="grid gap-3 md:grid-cols-3">
            <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => {
              const project = projects.find((p: any) => p.id === e.target.value);
              setForm({ ...form, project_id: e.target.value, employee_ids: [], color: project?.color || form.color });
            }}><option value="">Choisir chantier</option>{activeProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Tâche"><Input value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Pose isolation, RDV client..." /></Field>
            <Field label="Date début"><Input type="date" value={form.start_date} onChange={(e: any) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Date fin"><Input type="date" value={form.end_date} onChange={(e: any) => setForm({ ...form, end_date: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Début"><Input type="time" value={form.start_time} onChange={(e: any) => setForm({ ...form, start_time: e.target.value })} /></Field>
              <Field label="Fin"><Input type="time" value={form.end_time} onChange={(e: any) => setForm({ ...form, end_time: e.target.value })} /></Field>
              <Field label="Couleur"><Input type="color" value={form.color} onChange={(e: any) => setForm({ ...form, color: e.target.value })} /></Field>
            </div>
            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-bold uppercase text-slate-500">Salariés affectés au chantier</div>
              <div className="grid gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-3">
                {orderedEmployees.map((emp: any) => {
                  const checked = (form.employee_ids || []).includes(emp.id);
                  const isAssigned = assignedIds.includes(emp.id);
                  return (
                    <label key={emp.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border p-3 text-sm font-bold ${checked ? "border-slate-900 bg-white" : "border-slate-200 bg-white/60"}`}>
                      <span>{emp.firstname} {emp.lastname} {!isAssigned && form.project_id ? <span className="ml-1 text-xs text-amber-600">à ajouter</span> : null}</span>
                      <input type="checkbox" checked={checked} onChange={() => toggleEmployee(emp.id)} />
                    </label>
                  );
                })}
                {employees.length === 0 && <p className="text-sm text-slate-500">Aucun salarié enregistré.</p>}
              </div>
              <p className="mt-2 text-xs text-slate-500">En création, plusieurs salariés sélectionnés créent une ligne de planning par salarié. Les salariés non encore affectés seront aussi ajoutés au chantier.</p>
            </div>
            <div className="md:col-span-3"><Field label="Notes"><Textarea value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} /></Field></div>
            <Button className="md:col-span-3">{editing ? "Enregistrer la modification" : "Ajouter au planning"}</Button>
          </form>
        </Card>
      )}

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
                      <button className="rounded-lg bg-white/20 px-2 py-1" onClick={() => openEditPlanning(e)}>Modif.</button>
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
                  <button key={e.id} type="button" onClick={() => openEditPlanning(e)} className="block w-full rounded-lg px-2 py-1 text-left text-[10px] font-bold text-white" style={{ background: e.color || projectColor(e.project_id) }}>
                    {employeeName(e.employee_id).split(" ")[0]} · {e.title}
                  </button>
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
  const [form, setForm] = useState({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "", daily_cost: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => { loadAssignments(); }, []);
  async function loadAssignments() { const { data } = await supabase.from("employee_projects").select("*"); setAssignments(data || []); }
  async function refreshEmployeesAll() { await loadAssignments(); await refreshAll(); }

  async function saveEmployee(e: any) {
    e.preventDefault();
    if (!form.firstname || !form.lastname) return alert("Nom et prénom obligatoires");
    const payload = { ...form, daily_cost: Number(form.daily_cost || 0) };
    const query = editingId ? supabase.from("employees").update(payload).eq("id", editingId) : supabase.from("employees").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "", daily_cost: "" });
    setEditingId(null);
    setShowEmployeeForm(false);
    await refreshEmployeesAll();
  }
  function editEmployee(emp: any) { setEditingId(emp.id); setShowEmployeeForm(true); setForm({ firstname: emp.firstname || "", lastname: emp.lastname || "", position: emp.position || "", role: emp.role || "terrain", phone: emp.phone || "", email: emp.email || "", daily_cost: String(emp.daily_cost || "") }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function deleteEmployee(emp: any) { if (!confirm(`Supprimer le salarié "${emp.firstname} ${emp.lastname}" ?`)) return; const { error } = await supabase.from("employees").delete().eq("id", emp.id); if (error) return alert(error.message); await refreshEmployeesAll(); }
  async function assign(e: any) { e.preventDefault(); if (!employeeId || !projectId) return alert("Choisis un salarié et un chantier"); const already = assignments.find((a: any) => a.employee_id === employeeId && a.project_id === projectId); if (already) return alert("Ce salarié est déjà affecté à ce chantier"); const { error } = await supabase.from("employee_projects").insert({ employee_id: employeeId, project_id: projectId }); if (error) return alert(error.message); await refreshEmployeesAll(); }
  async function removeAssignment(assignment: any) { if (!confirm("Retirer cette affectation ?")) return; const { error } = await supabase.from("employee_projects").delete().eq("id", assignment.id); if (error) return alert(error.message); await refreshEmployeesAll(); }
  function employeeName(id: string) { const e = employees.find((x: any) => x.id === id); return e ? `${e.firstname} ${e.lastname}` : "Salarié inconnu"; }
  function projectNameLocal(id: string) { return projects.find((p: any) => p.id === id)?.name || "Chantier inconnu"; }
  const activeProjects = projects.filter((p: any) => p.status !== "archive");
  const activeAssignments = assignments.filter((a: any) => activeProjects.find((p: any) => p.id === a.project_id));
  return (
    <div>
      <Section title="Gestion salariés" subtitle="Création, modification, coût journée et affectation aux chantiers." />
      <Button className="mb-4" onClick={() => { if (showEmployeeForm && !editingId) { setShowEmployeeForm(false); } else { setShowEmployeeForm(true); setEditingId(null); setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "", daily_cost: "" }); } }}>
        {showEmployeeForm ? (editingId ? "Formulaire salarié ouvert" : "Fermer création salarié") : "+ Créer salarié"}
      </Button>
      <div className="grid gap-6 lg:grid-cols-2">
        {showEmployeeForm && <Card><h3 className="mb-4 font-black">{editingId ? "Modifier salarié" : "Créer salarié"}</h3><form onSubmit={saveEmployee} className="space-y-3">
          <Field label="Prénom"><Input value={form.firstname} onChange={(e: any) => setForm({ ...form, firstname: e.target.value })} /></Field>
          <Field label="Nom"><Input value={form.lastname} onChange={(e: any) => setForm({ ...form, lastname: e.target.value })} /></Field>
          <Field label="Poste"><Input value={form.position} onChange={(e: any) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="Rôle"><Select value={form.role} onChange={(e: any) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="bureau">Bureau</option><option value="chef">Chef chantier</option><option value="terrain">Terrain</option></Select></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Coût journée €"><Input type="number" value={form.daily_cost} onChange={(e: any) => setForm({ ...form, daily_cost: e.target.value })} /></Field>
          <div className="flex gap-2"><Button>{editingId ? "Enregistrer" : "Ajouter salarié"}</Button>{editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "", daily_cost: "" }); }}>Annuler</Button>}</div>
        </form></Card>}
        <Card><h3 className="mb-4 font-black">Affecter un salarié à un chantier</h3><form onSubmit={assign} className="space-y-3"><Field label="Salarié"><Select value={employeeId} onChange={(e: any) => setEmployeeId(e.target.value)}><option value="">Choisir salarié</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstname} {e.lastname} — {e.position || e.role}</option>)}</Select></Field><Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Button>Affecter au chantier</Button><p className="text-xs text-slate-500">Les affectations détaillées restent visibles dans chaque fiche chantier pour garder cette page légère.</p></form></Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{employees.map((e: any) => { const employeeAssignments = activeAssignments.filter((a: any) => a.employee_id === e.id); return <Card key={e.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{e.firstname} {e.lastname}</h3><p className="text-sm text-slate-500">{e.position}</p><p className="text-sm font-bold text-slate-700">{e.daily_cost ? `${e.daily_cost} €/jour` : "Coût journée non renseigné"}</p></div><Badge>{e.role}</Badge></div><div className="mt-4 space-y-1"><p className="text-xs font-bold uppercase text-slate-500">Chantiers affectés</p>{employeeAssignments.map((a: any) => <div key={a.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">{projectNameLocal(a.project_id)}</div>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => editEmployee(e)}>Modifier</Button><Button variant="danger" onClick={() => deleteEmployee(e)}>Supprimer</Button></div></Card>; })}</div>
    </div>
  );
}

function Vehicles({ vehicles, refreshAll }: any) {
  const [form, setForm] = useState({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  async function saveVehicle(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom véhicule obligatoire");
    const payload = { ...form, km: Number(form.km || 0) };
    const query = editingId ? supabase.from("vehicles").update(payload).eq("id", editingId) : supabase.from("vehicles").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setForm({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" });
    setEditingId(null);
    setShowVehicleForm(false);
    await refreshAll();
  }

  function editVehicle(v: any) {
    setEditingId(v.id);
    setShowVehicleForm(true);
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
      <Button className="mb-4" onClick={() => { if (showVehicleForm && !editingId) { setShowVehicleForm(false); } else { setShowVehicleForm(true); setEditingId(null); setForm({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" }); } }}>
        {showVehicleForm ? (editingId ? "Formulaire véhicule ouvert" : "Fermer création véhicule") : "+ Créer véhicule"}
      </Button>
      {showVehicleForm && <Card>
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
      </Card>}
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

function Requests({ requests, projects, employees = [], refreshAll, projectName }: any) {
  const emptyForm = { project_id: "", type: "achat", requester: "", message: "", priority: "normale", status: "nouvelle", assigned_to: "", planned_date: "" };
  const [form, setForm] = useState<any>(emptyForm);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(emptyForm);

  function employeeNameLocal(id: string) {
    const e = employees.find((x: any) => x.id === id);
    return e ? `${e.firstname} ${e.lastname}` : "Non attribuée";
  }

  function priorityMeta(priority: string) {
    const p = String(priority || "normale").toLowerCase();
    if (p === "urgente") return { icon: "🚨", label: "Urgente", tone: "red", card: "border-red-600 bg-red-50", text: "text-red-800" };
    if (p === "haute") return { icon: "⚠️", label: "Haute", tone: "red", card: "border-orange-500 bg-orange-50", text: "text-orange-800" };
    if (p === "basse") return { icon: "🟢", label: "Basse", tone: "green", card: "border-emerald-500 bg-emerald-50", text: "text-emerald-800" };
    return { icon: "🔵", label: "Normale", tone: "blue", card: "border-blue-500 bg-blue-50", text: "text-blue-800" };
  }

  async function addRequest(e: any) {
    e.preventDefault();
    if (!form.message) return;
    const payload: any = {
      project_id: form.project_id || null,
      type: form.type,
      requester: form.requester,
      message: form.message,
      priority: form.priority,
      status: form.status || "nouvelle"
    };
    if (form.assigned_to) payload.assigned_to = form.assigned_to;
    if (form.planned_date) payload.planned_date = form.planned_date;
    const { error } = await supabase.from("internal_requests").insert(payload);
    if (error) return alert(error.message);
    setForm({ ...emptyForm, project_id: form.project_id });
    await refreshAll();
  }

  function startEditRequest(req: any) {
    setEditingRequest(req);
    setEditForm({
      project_id: req.project_id || "",
      type: req.type || "achat",
      requester: req.requester || "",
      message: req.message || "",
      priority: req.priority || "normale",
      status: req.status || "nouvelle",
      assigned_to: req.assigned_to || "",
      planned_date: req.planned_date || ""
    });
    setTimeout(() => document.getElementById("request-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function saveEditRequest(e: any) {
    e.preventDefault();
    if (!editingRequest) return;
    const payload: any = {
      project_id: editForm.project_id || null,
      type: editForm.type,
      requester: editForm.requester,
      message: editForm.message,
      priority: editForm.priority,
      status: editForm.status || "nouvelle"
    };
    if (editForm.assigned_to) payload.assigned_to = editForm.assigned_to;
    if (editForm.planned_date) payload.planned_date = editForm.planned_date;
    const { error } = await supabase.from("internal_requests").update(payload).eq("id", editingRequest.id);
    if (error) return alert(error.message);
    setEditingRequest(null);
    setEditForm(emptyForm);
    await refreshAll();
  }

  async function deleteRequest(req: any) {
    if (!confirm("Supprimer cette demande ?")) return;
    const { error } = await supabase.from("internal_requests").delete().eq("id", req.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  const openRequests = requests.filter((r: any) => !["termine", "traité", "traite", "closed", "fait"].includes(String(r.status || "").toLowerCase()));

  return (
    <div>
      <Section title="Demandes internes" subtitle="Demande simple possible. Attribution et planification sont optionnelles." />
      <Card className="border-l-8 border-slate-900">
        <form onSubmit={addRequest} className="grid gap-3 md:grid-cols-3">
          <Field label="Chantier optionnel"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}><option value="">Sans chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Type"><Select value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}><option value="achat">Achat</option><option value="materiel">Matériel</option><option value="sav">SAV</option><option value="autre">Autre</option></Select></Field>
          <Field label="Priorité"><Select value={form.priority} onChange={(e: any) => setForm({ ...form, priority: e.target.value })}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option><option value="urgente">Urgente</option></Select></Field>
          <Field label="Demandeur"><Input value={form.requester} onChange={(e: any) => setForm({ ...form, requester: e.target.value })} /></Field>
          <Field label="Attribuer à optionnel"><Select value={form.assigned_to} onChange={(e: any) => setForm({ ...form, assigned_to: e.target.value })}><option value="">Non attribuée</option>{employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.firstname} {emp.lastname}</option>)}</Select></Field>
          <Field label="Planifier optionnel"><Input type="date" value={form.planned_date} onChange={(e: any) => setForm({ ...form, planned_date: e.target.value })} /></Field>
          <div className="md:col-span-3"><Field label="Message"><Textarea value={form.message} onChange={(e: any) => setForm({ ...form, message: e.target.value })} /></Field></div>
          <Button className="md:col-span-3">Créer demande</Button>
        </form>
      </Card>

      {editingRequest && <Card id="request-edit-form" className="mt-6 border-l-8 border-blue-500 bg-blue-50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-black">Modifier demande</h3><Button type="button" variant="secondary" onClick={() => setEditingRequest(null)}>Retour</Button></div>
        <form onSubmit={saveEditRequest} className="grid gap-3 md:grid-cols-3">
          <Field label="Chantier"><Select value={editForm.project_id} onChange={(e: any) => setEditForm({ ...editForm, project_id: e.target.value })}><option value="">Sans chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Type"><Select value={editForm.type} onChange={(e: any) => setEditForm({ ...editForm, type: e.target.value })}><option value="achat">Achat</option><option value="materiel">Matériel</option><option value="sav">SAV</option><option value="autre">Autre</option></Select></Field>
          <Field label="Priorité"><Select value={editForm.priority} onChange={(e: any) => setEditForm({ ...editForm, priority: e.target.value })}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option><option value="urgente">Urgente</option></Select></Field>
          <Field label="Statut"><Select value={editForm.status} onChange={(e: any) => setEditForm({ ...editForm, status: e.target.value })}><option value="nouvelle">Nouvelle</option><option value="attribuee">Attribuée</option><option value="planifiee">Planifiée</option><option value="en_cours">En cours</option><option value="termine">Terminée</option></Select></Field>
          <Field label="Attribuer à optionnel"><Select value={editForm.assigned_to} onChange={(e: any) => setEditForm({ ...editForm, assigned_to: e.target.value })}><option value="">Non attribuée</option>{employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.firstname} {emp.lastname}</option>)}</Select></Field>
          <Field label="Planifier optionnel"><Input type="date" value={editForm.planned_date} onChange={(e: any) => setEditForm({ ...editForm, planned_date: e.target.value })} /></Field>
          <div className="md:col-span-3"><Field label="Message"><Textarea value={editForm.message} onChange={(e: any) => setEditForm({ ...editForm, message: e.target.value })} /></Field></div>
          <div className="flex flex-wrap gap-2 md:col-span-3"><Button>Enregistrer</Button><Button type="button" variant="secondary" onClick={() => setEditingRequest(null)}>Retour</Button></div>
        </form>
      </Card>}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><p className="text-xs font-bold uppercase text-slate-500">Demandes</p><p className="text-4xl font-black">{requests.length}</p></Card>
        <Card className="border-l-8 border-blue-500 bg-blue-50"><p className="text-xs font-bold uppercase text-blue-700">Ouvertes</p><p className="text-4xl font-black text-blue-700">{openRequests.length}</p></Card>
  
      <Card className="border-l-8 border-orange-500 bg-orange-50"><p className="text-xs font-bold uppercase text-orange-700">Haute/Urgente</p><p className="text-4xl font-black text-orange-700">{requests.filter((r: any) => ["haute", "urgente"].includes(String(r.priority).toLowerCase())).length}</p></Card>
        <Card className="border-l-8 border-emerald-500 bg-emerald-50"><p className="text-xs font-bold uppercase text-emerald-700">Planifiées</p><p className="text-4xl font-black text-emerald-700">{requests.filter((r: any) => r.planned_date).length}</p></Card>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {requests.map((r: any) => {
          const meta = priorityMeta(r.priority);
          return (
            <Card key={r.id} className={`border-l-8 ${meta.card}`}>
              <div className="flex justify-between gap-3">
                <div>
                  <div className={`text-xs font-black uppercase ${meta.text}`}>{meta.icon} Priorité {meta.label}</div>
                  <h3 className="mt-1 font-black">{r.type || "Demande"} · {projectName(r.project_id)}</h3>
                  <p className="mt-2 text-sm text-slate-700">{r.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    <span className="rounded-xl bg-white px-3 py-1">Statut : {r.status || "nouvelle"}</span>
                    {r.requester && <span className="rounded-xl bg-white px-3 py-1">Demandeur : {r.requester}</span>}
                    {r.assigned_to && <span className="rounded-xl bg-white px-3 py-1">Attribuée : {employeeNameLocal(r.assigned_to)}</span>}
                    {r.planned_date && <span className="rounded-xl bg-white px-3 py-1">Planifiée : {r.planned_date}</span>}
                  </div>
                </div>
                <Badge tone={meta.tone}>{meta.icon} {meta.label}</Badge>
              </div>
              <div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => startEditRequest(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteRequest(r)}>Supprimer</Button></div>
            </Card>
          );
        })}
        {requests.length === 0 && <Card><p className="text-sm text-slate-500">Aucune demande enregistrée.</p></Card>}
      </div>
    </div>
  );
}


function Earthworks({ earthworks, photos, docs, notes, materials, vigilance, planning, rentals = [], earthworkInvoices = [], earthworkRevenues = [], earthworkReturns = [], refreshAll }: any) {
  const [selectedId, setSelectedId] = useState("");
  const [detailMode, setDetailMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    client: "",
    address: "",
    description: "",
    status: "en_cours",
    color: "#92400e",
    linked_project: "",
    client_billing: ""
  });

  const current = earthworks.find((e: any) => e.id === selectedId) || earthworks[0];

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", client: "", address: "", description: "", status: "en_cours", color: "#92400e", linked_project: "", client_billing: "" });
  }

  async function saveEarthwork(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom terrassement obligatoire");
    const payload = { ...form, linked_project: form.linked_project || null, client_billing: Number(form.client_billing || 0) };
    const query = editingId
      ? supabase.from("earthworks").update(payload).eq("id", editingId)
      : supabase.from("earthworks").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    resetForm();
    setShowCreate(false);
    await refreshAll();
  }

  function editEarthwork(item: any) {
    setEditingId(item.id);
    setShowCreate(true);
    setForm({
      name: item.name || "",
      client: item.client || "",
      address: item.address || "",
      description: item.description || "",
      status: item.status || "en_cours",
      color: item.color || "#92400e",
      linked_project: item.linked_project || "",
      client_billing: String(item.client_billing || "")
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEarthwork(id: string) {
    setSelectedId(id);
    setDetailMode(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  async function archiveEarthwork(item: any) {
    const { error } = await supabase.from("earthworks").update({ status: "archive" }).eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteEarthwork(item: any) {
    if (!confirm(`Supprimer le terrassement "${item.name}" ?`)) return;
    const { error } = await supabase.from("earthworks").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  if (detailMode && current) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-30 mb-4 rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Fiche terrassement</p>
              <h2 className="text-2xl font-black">{current.name}</h2>
            </div>
            <Button variant="secondary" onClick={() => { setDetailMode(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>← Retour liste terrassements</Button>
          </div>
        </div>
        <EarthworkDetail item={current} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} planning={planning} rentals={rentals} invoices={earthworkInvoices} revenues={earthworkRevenues} returns={earthworkReturns} refreshAll={refreshAll} />
      </div>
    );
  }

  return (
    <div>
      <Section title="Terrassement" subtitle="Clique sur Accéder : la fiche terrassement s’ouvre en pleine page." />
      <Button className="mb-4" onClick={() => { setShowCreate(!showCreate); if (!showCreate) resetForm(); }}>
        {showCreate ? "Fermer création terrassement" : "+ Créer un nouveau terrassement"}
      </Button>

      <Card className="mb-6 border-l-8 border-orange-500 bg-orange-50">
        <h3 className="mb-3 text-xl font-black text-orange-950">Planning terrassement général</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {planning.slice(0, 9).map((p: any) => {
            const ew = earthworks.find((e: any) => e.id === p.earthwork_id);
            return <div key={p.id} className="rounded-2xl bg-white p-3 text-sm"><b>{p.title}</b><br /><span className="text-slate-500">{ew?.name || "Terrassement"} · {p.start_date || ""} → {p.end_date || ""}</span></div>;
          })}
          {planning.length === 0 && <p className="text-sm text-orange-900">Aucune tâche terrassement planifiée.</p>}
        </div>
      </Card>

      {showCreate && (
        <Card className="mb-6 border-l-8 border-orange-700">
          <form onSubmit={saveEarthwork} className="grid gap-3 md:grid-cols-3">
            <Field label="Nom terrassement"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Client"><Input value={form.client} onChange={(e: any) => setForm({ ...form, client: e.target.value })} /></Field>
            <Field label="Adresse"><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="archive">Archivé</option></Select></Field>
            <Field label="Couleur"><Input type="color" value={form.color} onChange={(e: any) => setForm({ ...form, color: e.target.value })} /></Field>
            <Field label="Facturation client prévue €"><Input type="number" value={form.client_billing || ""} onChange={(e: any) => setForm({ ...form, client_billing: e.target.value })} /></Field>
            <Field label="Terrassement lié"><Select value={form.linked_project || ""} onChange={(e: any) => setForm({ ...form, linked_project: e.target.value })}><option value="">Aucun terrassement lié</option>{earthworks.filter((x: any) => x.id !== editingId).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <div className="md:col-span-3"><Field label="Description"><Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div className="flex gap-2 md:col-span-3"><Button>{editingId ? "Modifier terrassement" : "Créer terrassement"}</Button>{editingId && <Button type="button" variant="secondary" onClick={resetForm}>Annuler</Button>}</div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {earthworks.filter((e: any) => e.status !== "archive").map((e: any) => (
          <Card key={e.id} className="border-l-8" style={{ borderLeftColor: e.color || "#92400e" }}>
            <h3 className="font-black">{e.name}</h3>
            <p className="text-sm text-slate-500">{e.address}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={() => openEarthwork(e.id)}>Accéder</Button>
              <Button variant="secondary" onClick={() => editEarthwork(e)}>Modifier</Button>
              <Button variant="amber" onClick={() => archiveEarthwork(e)}>Archiver</Button>
              <Button variant="danger" onClick={() => deleteEarthwork(e)}>Supprimer</Button>
            </div>
          </Card>
        ))}
        {earthworks.filter((e: any) => e.status !== "archive").length === 0 && <Card><p className="text-sm text-slate-500">Aucun terrassement actif.</p></Card>}
      </div>
    </div>
  );
}

function EarthworkDetail({ item, photos, docs, notes, materials, vigilance, planning, rentals = [], invoices = [], revenues = [], returns = [], refreshAll }: any) {
  const [photoTitle, setPhotoTitle] = useState("");
  const [docName, setDocName] = useState("");
  const [note, setNote] = useState("");
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [vigTitle, setVigTitle] = useState("");
  const [vigContent, setVigContent] = useState("");
  const [plan, setPlan] = useState({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: "#92400e", notes: "" });
  const [rentalForm, setRentalForm] = useState({ machine_type: "", start_date: "", end_date: "", rental_price: "", tva_rate: "20", notes: "" });
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ supplier: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: "", notes: "" });
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [clientInvoiceForm, setClientInvoiceForm] = useState({ label: "Facturation client", amount: "", tva_rate: "10", billing_date: "", status: "facturé", notes: "" });
  const [returnForm, setReturnForm] = useState({ supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" });
  const [editingClientInvoiceId, setEditingClientInvoiceId] = useState<string | null>(null);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingVigilanceId, setEditingVigilanceId] = useState<string | null>(null);
  const [materialFile, setMaterialFile] = useState<any>(null);
  const [vigilanceFile, setVigilanceFile] = useState<any>(null);

  if (!item) return <Card><p>Sélectionne ou crée un terrassement.</p></Card>;

  const myPhotos = photos.filter((x: any) => x.earthwork_id === item.id);
  const myDocs = docs.filter((x: any) => x.earthwork_id === item.id);
  const myNotes = notes.filter((x: any) => x.earthwork_id === item.id);
  const myMaterials = materials.filter((x: any) => x.earthwork_id === item.id);
  const myVigilance = vigilance.filter((x: any) => x.earthwork_id === item.id);
  const myPlanning = planning.filter((x: any) => x.earthwork_id === item.id);
  const myRentals = rentals.filter((x: any) => x.earthwork_id === item.id);
  const myInvoices = invoices.filter((x: any) => x.earthwork_id === item.id);
  const myRevenues = revenues.filter((x: any) => x.earthwork_id === item.id);
  const myReturns = returns.filter((x: any) => x.earthwork_id === item.id);
  const money = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
  function amountHT(x: any) { return Number(x.amount_ht ?? x.amount ?? 0); }
  function amountTVA(x: any) { return Number(x.amount_tva ?? (amountHT(x) * Number(x.tva_rate || 0) / 100)); }
  function amountTTC(x: any) { return Number(x.amount_ttc ?? (amountHT(x) + amountTVA(x))); }
  function makeTaxPayload(amount: string, rate: string) { const ht = Math.round(Number(amount || 0) * 100) / 100; const tva = Math.round((ht * Number(rate || 0) / 100) * 100) / 100; const ttc = Math.round((ht + tva) * 100) / 100; return { amount: ht, amount_ht: ht, tva_rate: Number(rate || 0), amount_tva: tva, amount_ttc: ttc }; }
  const invoicesHT = myInvoices.reduce((s: number, i: any) => s + amountHT(i), 0);
  const invoicesTVA = myInvoices.reduce((s: number, i: any) => s + amountTVA(i), 0);
  const invoicesTTC = myInvoices.reduce((s: number, i: any) => s + amountTTC(i), 0);
  const returnsHT = myReturns.reduce((s: number, r: any) => s + amountHT(r), 0);
  const returnsTVA = myReturns.reduce((s: number, r: any) => s + amountTVA(r), 0);
  const revenuesHT = myRevenues.reduce((s: number, r: any) => s + amountHT(r), 0) || Number(item.client_billing || 0);
  const revenuesTVA = myRevenues.reduce((s: number, r: any) => s + amountTVA(r), 0);
  const rentalsTotal = myRentals.reduce((s: number, r: any) => s + amountHT({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price }), 0);
  const rentalsTVA = myRentals.reduce((s: number, r: any) => s + amountTVA({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva }), 0);
  const rentalsTTC = myRentals.reduce((s: number, r: any) => s + amountTTC({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva, amount_ttc: r.amount_ttc }), 0);
  const netCostsHT = Math.max(0, invoicesHT - returnsHT) + rentalsTotal;
  const marginHT = revenuesHT - netCostsHT;
  const tvaBalance = revenuesTVA - Math.max(0, invoicesTVA + rentalsTVA - returnsTVA);

  async function deleteRow(table: string, id: string) {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function addPhoto(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.photo?.files?.[0];
    if (!file) return;
    const file_url = await uploadFile("photos", file);
    const { error } = await supabase.from("earthwork_photos").insert({ earthwork_id: item.id, title: photoTitle || file.name, file_url });
    if (error) return alert(error.message);
    setPhotoTitle("");
    await refreshAll();
  }

  async function addDoc(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.doc?.files?.[0];
    if (!file) return;
    const file_url = await uploadFile("documents", file);
    const { error } = await supabase.from("earthwork_documents").insert({ earthwork_id: item.id, name: docName || file.name, type: "autre", file_url });
    if (error) return alert(error.message);
    setDocName("");
    await refreshAll();
  }

  async function addNote(e: any) {
    e.preventDefault();
    if (!note) return;
    const { error } = await supabase.from("earthwork_notes").insert({ earthwork_id: item.id, content: note });
    if (error) return alert(error.message);
    setNote("");
    await refreshAll();
  }

  async function addMaterial(e: any) {
    e.preventDefault();
    if (!matTitle && !matContent && !materialFile) return;
    let attachment_url = null;
    let attachment_type = null;
    if (materialFile) {
      const bucket = materialFile.type?.startsWith("image/") ? "photos" : "documents";
      attachment_url = await uploadFile(bucket, materialFile);
      attachment_type = materialFile.type?.startsWith("image/") ? "photo" : "document";
    }
    const payload = { earthwork_id: item.id, title: matTitle || "Matériel", content: matContent, attachment_url, attachment_type };
    const query = editingMaterialId ? supabase.from("earthwork_materials").update(payload).eq("id", editingMaterialId) : supabase.from("earthwork_materials").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingMaterialId(null); setMatTitle(""); setMatContent(""); setMaterialFile(null);
    await refreshAll();
  }

  function editMaterial(m: any) {
    setEditingMaterialId(m.id);
    setMatTitle(m.title || "");
    setMatContent(m.content || "");
    setMaterialFile(null);
  }

  async function addVigilance(e: any) {
    e.preventDefault();
    if (!vigTitle && !vigContent && !vigilanceFile) return;
    let attachment_url = null;
    let attachment_type = null;
    if (vigilanceFile) {
      const bucket = vigilanceFile.type?.startsWith("image/") ? "photos" : "documents";
      attachment_url = await uploadFile(bucket, vigilanceFile);
      attachment_type = vigilanceFile.type?.startsWith("image/") ? "photo" : "document";
    }
    const payload = { earthwork_id: item.id, title: vigTitle || "Point de vigilance", content: vigContent, attachment_url, attachment_type };
    const query = editingVigilanceId ? supabase.from("earthwork_vigilance").update(payload).eq("id", editingVigilanceId) : supabase.from("earthwork_vigilance").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingVigilanceId(null); setVigTitle(""); setVigContent(""); setVigilanceFile(null);
    await refreshAll();
  }

  function editVigilance(v: any) {
    setEditingVigilanceId(v.id);
    setVigTitle(v.title || "");
    setVigContent(v.content || "");
    setVigilanceFile(null);
  }

  async function addPlanning(e: any) {
    e.preventDefault();
    if (!plan.title || !plan.start_date) return alert("Titre et date obligatoires");
    const { error } = await supabase.from("earthwork_planning").insert({ earthwork_id: item.id, ...plan, start_time: plan.start_time || null, end_time: plan.end_time || null, end_date: plan.end_date || plan.start_date });
    if (error) return alert(error.message);
    setPlan({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: item.color || "#92400e", notes: "" });
    await refreshAll();
  }

  async function saveRental(e: any) {
    e.preventDefault();
    if (!rentalForm.machine_type) return alert("Type d'engin obligatoire");
    const rentalTax = makeTaxPayload(rentalForm.rental_price, rentalForm.tva_rate);
    const payload = { earthwork_id: item.id, machine_type: rentalForm.machine_type, start_date: rentalForm.start_date || null, end_date: rentalForm.end_date || null, rental_price: rentalTax.amount_ht, ...rentalTax, notes: rentalForm.notes };
    const query = editingRentalId ? supabase.from("earthwork_machine_rentals").update(payload).eq("id", editingRentalId) : supabase.from("earthwork_machine_rentals").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingRentalId(null);
    setRentalForm({ machine_type: "", start_date: "", end_date: "", rental_price: "", tva_rate: "20", notes: "" });
    await refreshAll();
  }

  function editRental(r: any) {
    setEditingRentalId(r.id);
    setRentalForm({ machine_type: r.machine_type || "", start_date: r.start_date || "", end_date: r.end_date || "", rental_price: String(r.amount_ht ?? r.rental_price ?? ""), tva_rate: String(r.tva_rate ?? 20), notes: r.notes || "" });
  }

  async function deleteRental(r: any) {
    if (!confirm("Supprimer cette location d'engin ?")) return;
    const { error } = await supabase.from("earthwork_machine_rentals").delete().eq("id", r.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function editPlanning(p: any) {
    setEditingPlanningId(p.id);
    setPlan({ title: p.title || "", start_date: p.start_date || "", end_date: p.end_date || "", start_time: p.start_time || "", end_time: p.end_time || "", color: p.color || item.color || "#92400e", notes: p.notes || "" });
  }

  async function savePlanning(e: any) {
    e.preventDefault();
    if (!plan.title || !plan.start_date) return alert("Titre et date obligatoires");
    const payload = { earthwork_id: item.id, ...plan, start_time: plan.start_time || null, end_time: plan.end_time || null, end_date: plan.end_date || plan.start_date };
    const query = editingPlanningId ? supabase.from("earthwork_planning").update(payload).eq("id", editingPlanningId) : supabase.from("earthwork_planning").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingPlanningId(null);
    setPlan({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: item.color || "#92400e", notes: "" });
    await refreshAll();
  }

  async function saveInvoice(e: any) {
    e.preventDefault();
    if (!invoiceForm.supplier || !invoiceForm.amount) return alert("Fournisseur et montant HT obligatoires");
    const payload = { earthwork_id: item.id, supplier: invoiceForm.supplier, category: invoiceForm.category, ...makeTaxPayload(invoiceForm.amount, invoiceForm.tva_rate), invoice_date: invoiceForm.invoice_date || null, notes: invoiceForm.notes };
    const query = editingInvoiceId ? supabase.from("earthwork_invoices").update(payload).eq("id", editingInvoiceId) : supabase.from("earthwork_invoices").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingInvoiceId(null);
    setInvoiceForm({ supplier: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: "", notes: "" });
    await refreshAll();
  }

  function editInvoice(i: any) {
    setEditingInvoiceId(i.id);
    setInvoiceForm({ supplier: i.supplier || "", category: i.category || "matériaux", amount: String(amountHT(i) || ""), tva_rate: String(i.tva_rate ?? 20), invoice_date: i.invoice_date || "", notes: i.notes || "" });
  }

  async function saveClientInvoice(e: any) {
    e.preventDefault();
    if (!clientInvoiceForm.amount) return alert("Montant HT obligatoire");
    const payload = { earthwork_id: item.id, label: clientInvoiceForm.label || "Facturation client", status: clientInvoiceForm.status, ...makeTaxPayload(clientInvoiceForm.amount, clientInvoiceForm.tva_rate), billing_date: clientInvoiceForm.billing_date || null, notes: clientInvoiceForm.notes };
    const query = editingClientInvoiceId ? supabase.from("earthwork_revenues").update(payload).eq("id", editingClientInvoiceId) : supabase.from("earthwork_revenues").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingClientInvoiceId(null);
    setClientInvoiceForm({ label: "Facturation client", amount: "", tva_rate: "10", billing_date: "", status: "facturé", notes: "" });
    await refreshAll();
  }

  function editClientInvoice(r: any) {
    setEditingClientInvoiceId(r.id);
    setClientInvoiceForm({ label: r.label || "Facturation client", amount: String(amountHT(r) || ""), tva_rate: String(r.tva_rate ?? 10), billing_date: r.billing_date || "", status: r.status || "facturé", notes: r.notes || "" });
  }

  async function deleteClientInvoice(r: any) {
    if (!confirm("Supprimer cette facturation client terrassement ?")) return;
    const { error } = await supabase.from("earthwork_revenues").delete().eq("id", r.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function saveEarthworkReturn(e: any) {
    e.preventDefault();
    if (!returnForm.supplier || !returnForm.amount) return alert("Fournisseur et montant HT obligatoires");
    const payload = { earthwork_id: item.id, supplier: returnForm.supplier, ...makeTaxPayload(returnForm.amount, returnForm.tva_rate), return_date: returnForm.return_date || null, notes: returnForm.notes };
    const query = editingReturnId ? supabase.from("earthwork_returns").update(payload).eq("id", editingReturnId) : supabase.from("earthwork_returns").insert(payload);
    const { error } = await query;
    if (error) return alert(error.message);
    setEditingReturnId(null);
    setReturnForm({ supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" });
    await refreshAll();
  }

  function editEarthworkReturn(r: any) {
    setEditingReturnId(r.id);
    setReturnForm({ supplier: r.supplier || "", amount: String(amountHT(r) || ""), tva_rate: String(r.tva_rate ?? 20), return_date: r.return_date || "", notes: r.notes || "" });
  }

  async function deleteEarthworkReturn(r: any) {
    if (!confirm("Supprimer ce retour terrassement ?")) return;
    const { error } = await supabase.from("earthwork_returns").delete().eq("id", r.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteInvoice(i: any) {
    if (!confirm("Supprimer cette facture terrassement ?")) return;
    const { error } = await supabase.from("earthwork_invoices").delete().eq("id", i.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function generateEarthworkReport() {
    const clientBilling = revenuesHT;
    const totalCosts = netCostsHT;
    const margin = marginHT;
    const marginRate = clientBilling > 0 ? Math.round((margin / clientBilling) * 100) : 0;
    const html = `<html><head><title>Rapport terrassement - ${item.name}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;background:#f1f5f9;color:#0f172a}.page{max-width:980px;margin:auto;background:white;padding:28px}.header{border-bottom:4px solid #92400e;padding-bottom:16px}.logo{height:70px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.card{border-radius:20px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0}.value{font-size:24px;font-weight:900}.section{margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f172a;color:white;text-align:left;padding:10px}td{padding:10px;border-bottom:1px solid #e2e8f0}.summary{margin-top:22px;border-radius:24px;padding:20px;background:${margin>=0?'#ecfdf5':'#fef2f2'};border-left:10px solid ${margin>=0?'#10b981':'#ef4444'}}@media print{body{background:white}.page{padding:0}}</style></head><body><div class="page"><div class="header"><img class="logo" src="/logo-asb.png"/><h1>Rapport terrassement / rentabilité</h1><p><b>${item.name}</b> · ${item.client || ''}</p><p>${item.address || ''}</p></div><div class="grid"><div class="card"><b>Facturation client</b><div class="value">${money(clientBilling)}</div></div><div class="card"><b>Factures</b><div class="value">${money(invoicesHT)}</div></div><div class="card"><b>Locations engins HT</b><div class="value">${money(rentalsTotal)}</div><p>TVA ${money(rentalsTVA)} · TTC ${money(rentalsTTC)}</p></div><div class="card"><b>Marge</b><div class="value">${money(margin)} · ${marginRate}%</div></div></div><div class="summary"><b>Synthèse</b><div style="font-size:34px;font-weight:900">${margin>=0?'+':''}${money(margin)}</div><p>Coût total terrassement HT : ${money(totalCosts)}. TVA collectée : ${money(revenuesTVA)} · TVA déductible achats + locations : ${money(invoicesTVA + rentalsTVA - returnsTVA)} · Solde TVA : ${money(tvaBalance)}.</p></div><div class="section"><h2>Factures terrassement</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th><th>Notes</th></tr></thead><tbody>${myInvoices.map((i:any)=>`<tr><td><b>${i.supplier||'Fournisseur'}</b></td><td>${i.invoice_date||''}</td><td>${money(amountHT(i))}</td><td>${i.notes||''}</td></tr>`).join('') || '<tr><td colspan="4">Aucune facture.</td></tr>'}</tbody></table></div><div class="section"><h2>Locations d’engins</h2><table><thead><tr><th>Engin</th><th>Début</th><th>Fin</th><th>HT</th><th>TVA</th><th>TTC</th><th>Notes</th></tr></thead><tbody>${myRentals.map((r:any)=>`<tr><td><b>${r.machine_type||'Engin'}</b></td><td>${r.start_date||''}</td><td>${r.end_date||''}</td><td>${money(amountHT({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price }))}</td><td>${money(amountTVA({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva }))}</td><td>${money(amountTTC({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva, amount_ttc: r.amount_ttc }))}</td><td>${r.notes||''}</td></tr>`).join('') || '<tr><td colspan="7">Aucune location.</td></tr>'}</tbody></table></div><p style="font-size:12px;color:#64748b;margin-top:22px">Document interne ASB — rapport terrassement.</p></div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Popup bloquée. Autorise les popups pour générer le rapport.");
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-8" style={{ borderLeftColor: item.color || "#92400e" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{item.name}</h2>
            <p className="text-sm text-slate-500">{item.client} · {item.address}</p>
          </div>
          <Button variant="secondary" onClick={generateEarthworkReport}>Rapport terrassement PDF</Button>
        </div>
        {item.description && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm">{item.description}</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-bold uppercase text-emerald-700">Facturé client</p><p className="text-xl font-black text-emerald-700">{money(revenuesHT)}</p></div>
          <div className="rounded-2xl bg-red-50 p-3"><p className="text-xs font-bold uppercase text-red-700">Factures</p><p className="text-xl font-black text-red-700">{money(invoicesHT)}</p></div>
          <div className="rounded-2xl bg-orange-50 p-3"><p className="text-xs font-bold uppercase text-orange-700">Locations engins</p><p className="text-xl font-black text-orange-700">{money(rentalsTotal)}</p></div>
          <div className="rounded-2xl bg-blue-50 p-3"><p className="text-xs font-bold uppercase text-blue-700">Solde estimé</p><p className="text-xl font-black text-blue-700">{money(marginHT)}</p></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">TVA collectée client</p><p className="text-xl font-black">{money(revenuesTVA)}</p></div>
          <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">TVA déductible nette</p><p className="text-xl font-black">{money(Math.max(0, invoicesTVA - returnsTVA))}</p></div>
          <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">Solde TVA estimatif</p><p className="text-xl font-black">{money(tvaBalance)}</p></div>
        </div>
      </Card>

      <Card className="border-l-8 border-blue-500 bg-blue-50">
        <h3 className="mb-3 text-xl font-black text-blue-950">🧾 Facturation client terrassement</h3>
        <form onSubmit={saveClientInvoice} className="grid gap-3 md:grid-cols-6">
          <Field label="Libellé"><Input value={clientInvoiceForm.label} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, label: e.target.value })} /></Field>
          <Field label="Montant HT"><Input type="number" value={clientInvoiceForm.amount} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, amount: e.target.value })} /></Field>
          <Field label="TVA"><Select value={clientInvoiceForm.tva_rate} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
          <Field label="Date"><Input type="date" value={clientInvoiceForm.billing_date} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, billing_date: e.target.value })} /></Field>
          <Field label="Statut"><Select value={clientInvoiceForm.status} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, status: e.target.value })}><option value="devis">Devis</option><option value="acompte">Acompte</option><option value="facturé">Facturé</option><option value="payé">Payé</option></Select></Field>
          <Field label="Notes"><Input value={clientInvoiceForm.notes} onChange={(e: any) => setClientInvoiceForm({ ...clientInvoiceForm, notes: e.target.value })} /></Field>
          <div className="flex gap-2 md:col-span-6"><Button variant="green">{editingClientInvoiceId ? "Modifier facturation" : "Ajouter facturation"}</Button>{editingClientInvoiceId && <Button type="button" variant="secondary" onClick={() => { setEditingClientInvoiceId(null); setClientInvoiceForm({ label: "Facturation client", amount: "", tva_rate: "10", billing_date: "", status: "facturé", notes: "" }); }}>Annuler</Button>}</div>
        </form>
        <div className="mt-4 space-y-2">{myRevenues.map((r: any) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><span><b>{r.label || "Facturation client"}</b> · HT {money(amountHT(r))} · TVA {money(amountTVA(r))} · TTC {money(amountTTC(r))}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editClientInvoice(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteClientInvoice(r)}>Supprimer</Button></div></div>)}</div>
      </Card>

      <Card className="border-l-8 border-purple-500 bg-purple-50">
        <h3 className="mb-3 text-xl font-black text-purple-950">↩️ Retours terrassement</h3>
        <form onSubmit={saveEarthworkReturn} className="grid gap-3 md:grid-cols-5">
          <Field label="Fournisseur"><Input value={returnForm.supplier} onChange={(e: any) => setReturnForm({ ...returnForm, supplier: e.target.value })} /></Field>
          <Field label="Montant HT"><Input type="number" value={returnForm.amount} onChange={(e: any) => setReturnForm({ ...returnForm, amount: e.target.value })} /></Field>
          <Field label="TVA"><Select value={returnForm.tva_rate} onChange={(e: any) => setReturnForm({ ...returnForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
          <Field label="Date"><Input type="date" value={returnForm.return_date} onChange={(e: any) => setReturnForm({ ...returnForm, return_date: e.target.value })} /></Field>
          <Field label="Notes"><Input value={returnForm.notes} onChange={(e: any) => setReturnForm({ ...returnForm, notes: e.target.value })} /></Field>
          <div className="flex gap-2 md:col-span-5"><Button variant="amber">{editingReturnId ? "Modifier retour" : "Ajouter retour"}</Button>{editingReturnId && <Button type="button" variant="secondary" onClick={() => { setEditingReturnId(null); setReturnForm({ supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" }); }}>Annuler</Button>}</div>
        </form>
        <div className="mt-4 space-y-2">{myReturns.map((r: any) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><span><b>{r.supplier || "Retour"}</b> · -HT {money(amountHT(r))} · TVA corrigée {money(amountTVA(r))} · TTC {money(amountTTC(r))}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editEarthworkReturn(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteEarthworkReturn(r)}>Supprimer</Button></div></div>)}</div>
      </Card>

      <Card className="border-l-8 border-emerald-500 bg-emerald-50">
        <h3 className="mb-3 text-xl font-black text-emerald-950">💶 Factures terrassement</h3>
        <form onSubmit={saveInvoice} className="grid gap-3 md:grid-cols-5">
          <Field label="Fournisseur"><Input value={invoiceForm.supplier} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, supplier: e.target.value })} /></Field>
          <Field label="Catégorie"><Select value={invoiceForm.category} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}><option value="matériaux">Matériaux</option><option value="location engin">Location engin</option><option value="carburant">Carburant</option><option value="transport">Transport</option><option value="évacuation">Évacuation</option><option value="sous-traitance">Sous-traitance</option><option value="autre">Autre</option></Select></Field>
          <Field label="Montant HT"><Input type="number" value={invoiceForm.amount} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} /></Field>
          <Field label="TVA"><Select value={invoiceForm.tva_rate} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
          <Field label="Date facture"><Input type="date" value={invoiceForm.invoice_date} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} /></Field>
          <Field label="Notes"><Input value={invoiceForm.notes} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></Field>
          <div className="flex gap-2 md:col-span-5"><Button variant="green">{editingInvoiceId ? "Modifier facture" : "Ajouter facture"}</Button>{editingInvoiceId && <Button type="button" variant="secondary" onClick={() => { setEditingInvoiceId(null); setInvoiceForm({ supplier: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: "", notes: "" }); }}>Annuler</Button>}</div>
        </form>
        <div className="mt-4 space-y-2">
          {myInvoices.map((i: any) => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><span><b>{i.supplier || "Fournisseur"}</b> · {i.invoice_date || ""} · HT {money(amountHT(i))} · TVA {money(amountTVA(i))} · TTC {money(amountTTC(i))}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editInvoice(i)}>Modifier</Button><Button variant="danger" onClick={() => deleteInvoice(i)}>Supprimer</Button></div></div>)}
        </div>
      </Card>

      <Card className="border-l-8 border-orange-500 bg-orange-50">
        <h3 className="mb-3 text-xl font-black text-orange-950">🚜 Location engin</h3>
        <form onSubmit={saveRental} className="grid gap-3 md:grid-cols-6">
          <Field label="Type d'engin"><Input value={rentalForm.machine_type} onChange={(e: any) => setRentalForm({ ...rentalForm, machine_type: e.target.value })} /></Field>
          <Field label="Début"><Input type="date" value={rentalForm.start_date} onChange={(e: any) => setRentalForm({ ...rentalForm, start_date: e.target.value })} /></Field>
          <Field label="Fin"><Input type="date" value={rentalForm.end_date} onChange={(e: any) => setRentalForm({ ...rentalForm, end_date: e.target.value })} /></Field>
          <Field label="Prix location HT €"><Input type="number" step="0.01" value={rentalForm.rental_price} onChange={(e: any) => setRentalForm({ ...rentalForm, rental_price: e.target.value })} /></Field>
          <Field label="TVA"><Select value={rentalForm.tva_rate} onChange={(e: any) => setRentalForm({ ...rentalForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
          <Field label="Notes"><Input value={rentalForm.notes} onChange={(e: any) => setRentalForm({ ...rentalForm, notes: e.target.value })} /></Field>
          <div className="flex gap-2 md:col-span-6"><Button>{editingRentalId ? "Modifier location" : "Ajouter location"}</Button>{editingRentalId && <Button type="button" variant="secondary" onClick={() => { setEditingRentalId(null); setRentalForm({ machine_type: "", start_date: "", end_date: "", rental_price: "", tva_rate: "20", notes: "" }); }}>Annuler</Button>}</div>
        </form>
        <div className="mt-4 space-y-2">
          {myRentals.map((r: any) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><span><b>{r.machine_type}</b> · {r.start_date || ""} → {r.end_date || ""} · HT {money(amountHT({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price }))} · TVA {money(amountTVA({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva }))} · TTC {money(amountTTC({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva, amount_ttc: r.amount_ttc }))}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editRental(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteRental(r)}>Supprimer</Button></div></div>)}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-amber-50 border-l-8 border-amber-400"><h3 className="mb-3 text-xl font-black text-amber-950">📦 Matériel terrassement</h3><form onSubmit={addMaterial} className="space-y-3"><Field label="Titre"><Input value={matTitle} onChange={(e: any) => setMatTitle(e.target.value)} /></Field><Field label="Détail"><Textarea value={matContent} onChange={(e: any) => setMatContent(e.target.value)} /></Field><Field label="Photo ou document"><Input type="file" onChange={(e: any) => setMaterialFile(e.target.files?.[0] || null)} /></Field><div className="flex gap-2"><Button variant="amber">{editingMaterialId ? "Modifier" : "Ajouter"}</Button>{editingMaterialId && <Button type="button" variant="secondary" onClick={() => { setEditingMaterialId(null); setMatTitle(""); setMatContent(""); setMaterialFile(null); }}>Annuler</Button>}</div></form><div className="mt-4 space-y-2">{myMaterials.map((m: any) => <div key={m.id} className="rounded-2xl bg-white p-3"><b>{m.title}</b><pre className="mt-2 whitespace-pre-wrap text-sm">{m.content}</pre>{m.attachment_url && <a href={m.attachment_url} target="_blank" className="mt-2 inline-block font-bold underline">Voir pièce jointe</a>}<div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => editMaterial(m)}>Modifier</Button><Button variant="danger" onClick={() => deleteRow("earthwork_materials", m.id)}>Supprimer</Button></div></div>)}</div></Card>
        <Card className="bg-red-50 border-l-8 border-red-500"><h3 className="mb-3 text-xl font-black text-red-950">⚠️ Vigilance terrassement</h3><form onSubmit={addVigilance} className="space-y-3"><Field label="Titre"><Input value={vigTitle} onChange={(e: any) => setVigTitle(e.target.value)} /></Field><Field label="Détail"><Textarea value={vigContent} onChange={(e: any) => setVigContent(e.target.value)} /></Field><Field label="Photo ou document"><Input type="file" onChange={(e: any) => setVigilanceFile(e.target.files?.[0] || null)} /></Field><div className="flex gap-2"><Button variant="danger">{editingVigilanceId ? "Modifier" : "Ajouter"}</Button>{editingVigilanceId && <Button type="button" variant="secondary" onClick={() => { setEditingVigilanceId(null); setVigTitle(""); setVigContent(""); setVigilanceFile(null); }}>Annuler</Button>}</div></form><div className="mt-4 space-y-2">{myVigilance.map((v: any) => <div key={v.id} className="rounded-2xl bg-white p-3"><b>{v.title}</b><pre className="mt-2 whitespace-pre-wrap text-sm">{v.content}</pre>{v.attachment_url && <a href={v.attachment_url} target="_blank" className="mt-2 inline-block font-bold underline">Voir pièce jointe</a>}<div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => editVigilance(v)}>Modifier</Button><Button variant="danger" onClick={() => deleteRow("earthwork_vigilance", v.id)}>Supprimer</Button></div></div>)}</div></Card>
      </div>

      <Card><h3 className="mb-3 font-black">Planning terrassement autonome</h3><form onSubmit={savePlanning} className="grid gap-3 md:grid-cols-3"><Field label="Tâche"><Input value={plan.title} onChange={(e: any) => setPlan({ ...plan, title: e.target.value })} /></Field><Field label="Début"><Input type="date" value={plan.start_date} onChange={(e: any) => setPlan({ ...plan, start_date: e.target.value })} /></Field><Field label="Fin"><Input type="date" value={plan.end_date} onChange={(e: any) => setPlan({ ...plan, end_date: e.target.value })} /></Field><div className="flex gap-2 md:col-span-3"><Button>{editingPlanningId ? "Modifier planning" : "Ajouter au planning"}</Button>{editingPlanningId && <Button type="button" variant="secondary" onClick={() => { setEditingPlanningId(null); setPlan({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: item.color || "#92400e", notes: "" }); }}>Annuler</Button>}</div></form><div className="mt-4 space-y-2">{myPlanning.map((p: any) => <div key={p.id} className="rounded-2xl p-3 text-white" style={{ background: p.color || item.color || "#92400e" }}><b>{p.title}</b><br />{p.start_date} → {p.end_date}<div className="mt-2 flex gap-2"><button onClick={() => editPlanning(p)} className="rounded-xl bg-white/20 px-3 py-1 text-xs">Modifier</button><button onClick={() => deleteRow("earthwork_planning", p.id)} className="rounded-xl bg-white/20 px-3 py-1 text-xs">Supprimer</button></div></div>)}</div></Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-black">Photos terrassement</h3><form onSubmit={addPhoto} className="space-y-3"><Field label="Titre"><Input value={photoTitle} onChange={(e: any) => setPhotoTitle(e.target.value)} /></Field><Input name="photo" type="file" accept="image/*" /><Button>Ajouter photo</Button></form><div className="mt-4 grid grid-cols-2 gap-3">{myPhotos.map((p: any) => <div key={p.id}><img src={p.file_url} className="h-32 w-full rounded-2xl object-cover" /><Button variant="danger" className="mt-2" onClick={() => deleteRow("earthwork_photos", p.id)}>Supprimer</Button></div>)}</div></Card>
        <Card><h3 className="mb-3 font-black">Documents terrassement</h3><form onSubmit={addDoc} className="space-y-3"><Field label="Nom"><Input value={docName} onChange={(e: any) => setDocName(e.target.value)} /></Field><Input name="doc" type="file" /><Button>Ajouter document</Button></form><div className="mt-4 space-y-2">{myDocs.map((d: any) => <div key={d.id} className="flex justify-between rounded-2xl bg-slate-50 p-3"><a href={d.file_url} target="_blank" className="font-bold underline">{d.name}</a><button onClick={() => deleteRow("earthwork_documents", d.id)} className="text-red-600 font-bold">Supprimer</button></div>)}</div></Card>
      </div>

      <Card><h3 className="mb-3 font-black">Notes terrassement</h3><form onSubmit={addNote} className="grid gap-3 md:grid-cols-[1fr_120px]"><Input value={note} onChange={(e: any) => setNote(e.target.value)} /><Button>Ajouter</Button></form><div className="mt-4 space-y-2">{myNotes.map((n: any) => <div key={n.id} className="flex justify-between rounded-2xl bg-slate-50 p-3"><span>{n.content}</span><button onClick={() => deleteRow("earthwork_notes", n.id)} className="text-red-600 font-bold">Supprimer</button></div>)}</div></Card>
    </div>
  );
}

function Storekeeper({ projects, materials, invoices = [], returns = [], refreshAll }: any) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [createForm, setCreateForm] = useState({ project_id: "", title: "", content: "", priority: "normale" });
  const [createFile, setCreateFile] = useState<any>(null);
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [fullMaterial, setFullMaterial] = useState<any>(null);

  function projectNameLocal(id: string) {
    return projects.find((p: any) => p.id === id)?.name || "Chantier inconnu";
  }

  const money = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

  async function createMaterial(e: any) {
    e.preventDefault();

    if (!createForm.project_id) return alert("Choisis un chantier");
    if (!createForm.title && !createForm.content) return alert("Ajoute un titre ou un détail");

    let attachment_url = null;
    let attachment_type = null;

    if (createFile) {
      const bucket = createFile.type?.startsWith("image/") ? "photos" : "documents";
      attachment_url = await uploadFile(bucket, createFile);
      attachment_type = createFile.type?.startsWith("image/") ? "photo" : "document";
    }

    const { error } = await supabase.from("project_materials").insert({
      project_id: createForm.project_id,
      title: createForm.title || "Matériel à prévoir",
      content: createForm.content || "",
      priority: createForm.priority || "normale",
      ready: false,
      attachment_url,
      attachment_type
    });

    if (error) return alert(error.message);

    setCreateForm({ project_id: createForm.project_id, title: "", content: "", priority: "normale" });
    setCreateFile(null);
    await refreshAll();
  }

  async function setReady(item: any, ready: boolean) {
    const { error } = await supabase.from("project_materials").update({ ready }).eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function startEdit(item: any) {
    setEditingItem(item);
    setForm({ title: item.title || "", content: item.content || "" });
  }

  async function saveEdit(e: any) {
    e.preventDefault();
    if (!editingItem) return;
    const { error } = await supabase.from("project_materials").update({ title: form.title, content: form.content }).eq("id", editingItem.id);
    if (error) return alert(error.message);
    setEditingItem(null);
    setForm({ title: "", content: "" });
    await refreshAll();
  }

  async function deleteItem(item: any) {
    if (!confirm(`Supprimer "${item.title || item.content}" ?`)) return;
    const { error } = await supabase.from("project_materials").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }


  async function uploadMaterialAttachment(item: any, e: any) {
    const file = e.currentTarget?.files?.[0];
    if (!file) return;
    try {
      const bucket = file.type?.startsWith("image/") ? "photos" : "documents";
      const attachment_url = await uploadFile(bucket, file);
      const attachment_type = file.type?.startsWith("image/") ? "photo" : "document";
      const { error } = await supabase.from("project_materials").update({ attachment_url, attachment_type }).eq("id", item.id);
      if (error) throw error;
      await refreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const todo = materials.filter((m: any) => !m.ready);
  const ready = materials.filter((m: any) => m.ready);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ project_id: "", supplier: "", amount: "", tva_rate: "20", invoice_date: "", notes: "" });

  function amountHTLocal(x: any) { return Number(x.amount_ht ?? x.amount ?? 0); }
  function amountTVALocal(x: any) { return Number(x.amount_tva ?? (amountHTLocal(x) * Number(x.tva_rate || 0) / 100)); }
  function amountTTCLocal(x: any) { return Number(x.amount_ttc ?? (amountHTLocal(x) + amountTVALocal(x))); }
  function makeTaxPayloadLocal(amount: string, rate: string) { const ht = Math.round(Number(amount || 0) * 100) / 100; const tva = Math.round((ht * Number(rate || 0) / 100) * 100) / 100; const ttc = Math.round((ht + tva) * 100) / 100; return { amount: ht, amount_ht: ht, tva_rate: Number(rate || 0), amount_tva: tva, amount_ttc: ttc }; }

  async function addStoreInvoice(e: any) {
    e.preventDefault();
    if (!invoiceForm.project_id) return alert("Choisis un chantier");
    if (!invoiceForm.supplier || !invoiceForm.amount) return alert("Fournisseur et montant obligatoires");
    const { error } = await supabase.from("project_invoices").insert({
      project_id: invoiceForm.project_id,
      supplier: invoiceForm.supplier,
      category: "matériaux",
      ...makeTaxPayloadLocal(invoiceForm.amount, invoiceForm.tva_rate),
      invoice_date: invoiceForm.invoice_date || null,
      notes: invoiceForm.notes
    });
    if (error) return alert(error.message);
    setInvoiceForm({ project_id: invoiceForm.project_id, supplier: "", amount: "", tva_rate: "20", invoice_date: "", notes: "" });
    setShowInvoiceForm(false);
    await refreshAll();
  }

  async function deleteStoreInvoice(item: any) {
    if (!confirm("Supprimer cette facture chantier ?")) return;
    const { error } = await supabase.from("project_invoices").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnForm, setReturnForm] = useState({ project_id: "", supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" });

  async function addReturn(e: any) {
    e.preventDefault();
    if (!returnForm.supplier || !returnForm.amount) return alert("Fournisseur et montant obligatoires");
    const { error } = await supabase.from("merchandise_returns").insert({
      project_id: returnForm.project_id || null,
      supplier: returnForm.supplier,
      ...makeTaxPayloadLocal(returnForm.amount, returnForm.tva_rate),
      return_date: returnForm.return_date || null,
      notes: returnForm.notes
    });
    if (error) return alert(error.message);
    setReturnForm({ project_id: "", supplier: "", amount: "", tva_rate: "20", return_date: "", notes: "" });
    await refreshAll();
  }

  async function deleteReturn(item: any) {
    if (!confirm("Supprimer ce retour marchandise ?")) return;
    const { error } = await supabase.from("merchandise_returns").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  return (
    <div>
      {fullMaterial && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 md:p-8">
          <div className="mx-auto min-h-[90vh] max-w-5xl rounded-[2rem] bg-white p-4 shadow-2xl md:p-8">
            <div className="sticky top-0 z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/95 p-3 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">Matériel à prévoir</p>
                <h2 className="text-2xl font-black text-slate-950 md:text-4xl">{fullMaterial.title || "Matériel à prévoir"}</h2>
                <p className="text-sm font-bold text-slate-500">{projectNameLocal(fullMaterial.project_id)}</p>
              </div>
              <Button variant="secondary" onClick={() => setFullMaterial(null)}>← Retour magasinier</Button>
            </div>
            <div className={`rounded-3xl border-l-8 p-5 ${fullMaterial.ready ? "border-emerald-500 bg-emerald-50" : "border-amber-400 bg-amber-50"}`}>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone={fullMaterial.ready ? "green" : "amber"}>{fullMaterial.ready ? "Prêt" : "À préparer"}</Badge>
                <Badge>{fullMaterial.priority || "normale"}</Badge>
              </div>
              <pre className="min-h-[55vh] whitespace-pre-wrap rounded-3xl bg-white p-5 text-base leading-7 text-slate-800">{fullMaterial.content || "Aucun détail."}</pre>
              <div className="mt-5 flex flex-wrap gap-2">
                {!fullMaterial.ready && <Button variant="green" onClick={() => { setReady(fullMaterial, true); setFullMaterial({ ...fullMaterial, ready: true }); }}>OK prêt !</Button>}
                {fullMaterial.ready && <Button variant="amber" onClick={() => { setReady(fullMaterial, false); setFullMaterial({ ...fullMaterial, ready: false }); }}>Remettre à préparer</Button>}
                <Button variant="secondary" onClick={() => { startEdit(fullMaterial); setFullMaterial(null); }}>Modifier</Button>
                {fullMaterial.attachment_url && <a href={fullMaterial.attachment_url} target="_blank" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Voir pièce jointe</a>}
                <Button variant="danger" onClick={() => { deleteItem(fullMaterial); setFullMaterial(null); }}>Supprimer</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Section title="Magasinier" subtitle="V37 — création rapide avec TVA obligatoire : facture achat HT/TVA/TTC + retour HT/TVA/TTC." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => { setShowCreateMaterial(!showCreateMaterial); setShowInvoiceForm(false); setShowReturnForm(false); setEditingItem(null); }}>{showCreateMaterial ? "Fermer création matériel" : "+ Créer matériel à prévoir"}</Button>
        <Button variant="green" onClick={() => { setShowInvoiceForm(!showInvoiceForm); setShowCreateMaterial(false); setShowReturnForm(false); setEditingItem(null); }}>{showInvoiceForm ? "Fermer création facture" : "+ Créer facture"}</Button>
        <Button variant="amber" onClick={() => { setShowReturnForm(!showReturnForm); setShowCreateMaterial(false); setShowInvoiceForm(false); setEditingItem(null); }}>{showReturnForm ? "Fermer création retour" : "+ Créer retour"}</Button>
        {(showCreateMaterial || showInvoiceForm || showReturnForm || editingItem) && <Button variant="secondary" onClick={() => { setShowCreateMaterial(false); setShowInvoiceForm(false); setShowReturnForm(false); setEditingItem(null); }}>← Retour</Button>}
      </div>

      {showCreateMaterial && <Card className="mb-6 border-l-8 border-slate-900">
        <h3 className="mb-4 text-2xl font-black">Créer matériel à prévoir</h3>

        <form onSubmit={createMaterial} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Chantier">
              <Select value={createForm.project_id} onChange={(e: any) => setCreateForm({ ...createForm, project_id: e.target.value })}>
                <option value="">Choisir chantier</option>
                {projects.filter((p: any) => p.status !== "archive").map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field label="Titre">
              <Input value={createForm.title} onChange={(e: any) => setCreateForm({ ...createForm, title: e.target.value })} />
            </Field>

            <Field label="Priorité">
              <Select value={createForm.priority} onChange={(e: any) => setCreateForm({ ...createForm, priority: e.target.value })}>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </Select>
            </Field>
          </div>

          <Field label="Détail matériel">
            <Textarea value={createForm.content} onChange={(e: any) => setCreateForm({ ...createForm, content: e.target.value })} className="min-h-48" />
          </Field>

          <Field label="Photo ou document">
            <Input type="file" onChange={(e: any) => setCreateFile(e.target.files?.[0] || null)} />
          </Field>

          <div className="flex flex-wrap gap-2"><Button>Créer matériel</Button><Button type="button" variant="secondary" onClick={() => setShowCreateMaterial(false)}>Retour</Button></div>
        </form>
      </Card>}

      {showInvoiceForm && <Card className="mb-6 border-l-8 border-emerald-500 bg-emerald-50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-emerald-950">Créer facture fournisseur</h3>
            <p className="mt-1 text-sm text-emerald-900/70">Facture attribuée directement à un chantier.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShowInvoiceForm(false)}>Retour</Button>
        </div>
        <form onSubmit={addStoreInvoice} className="grid gap-3 md:grid-cols-6">
          <Field label="Chantier"><Select value={invoiceForm.project_id} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, project_id: e.target.value })}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Fournisseur"><Input value={invoiceForm.supplier} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, supplier: e.target.value })} /></Field>
          <Field label="Montant HT €"><Input type="number" step="0.01" value={invoiceForm.amount} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} /></Field>
          <Field label="TVA"><Select value={invoiceForm.tva_rate} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
          <Field label="Date facture"><Input type="date" value={invoiceForm.invoice_date} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} /></Field>
          <Field label="Notes"><Input value={invoiceForm.notes} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></Field>
          <div className="rounded-2xl bg-white p-3 text-sm md:col-span-6"><b>Aperçu facture achat</b> · HT {money(Number(invoiceForm.amount || 0))} · TVA {money(Math.round(Number(invoiceForm.amount || 0) * Number(invoiceForm.tva_rate || 0)) / 100)} · TTC {money(Number(invoiceForm.amount || 0) + Math.round(Number(invoiceForm.amount || 0) * Number(invoiceForm.tva_rate || 0)) / 100)}</div>
          <div className="flex gap-2 md:col-span-6"><Button variant="green">Enregistrer facture</Button><Button type="button" variant="secondary" onClick={() => setShowInvoiceForm(false)}>Retour</Button></div>
        </form>
      </Card>}

      {showReturnForm && <Card className="mb-6 border-l-8 border-purple-500 bg-purple-50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-purple-950">Créer retour marchandise</h3>
            <p className="mt-1 text-sm text-purple-900/70">Retour attribuable à un chantier, sans obligation.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShowReturnForm(false)}>Retour</Button>
        </div>
        <form onSubmit={addReturn} className="grid gap-3 md:grid-cols-6">
          <Field label="Chantier">
            <Select value={returnForm.project_id} onChange={(e: any) => setReturnForm({ ...returnForm, project_id: e.target.value })}>
              <option value="">Sans chantier</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Fournisseur"><Input value={returnForm.supplier} onChange={(e: any) => setReturnForm({ ...returnForm, supplier: e.target.value })} /></Field>
          <Field label="Montant HT €"><Input type="number" step="0.01" value={returnForm.amount} onChange={(e: any) => setReturnForm({ ...returnForm, amount: e.target.value })} /></Field>
          <Field label="TVA"><Select value={returnForm.tva_rate} onChange={(e: any) => setReturnForm({ ...returnForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
          <Field label="Date"><Input type="date" value={returnForm.return_date} onChange={(e: any) => setReturnForm({ ...returnForm, return_date: e.target.value })} /></Field>
          <Field label="Notes"><Input value={returnForm.notes} onChange={(e: any) => setReturnForm({ ...returnForm, notes: e.target.value })} /></Field>
          <div className="rounded-2xl bg-white p-3 text-sm md:col-span-6"><b>Aperçu retour</b> · -HT {money(Number(returnForm.amount || 0))} · TVA corrigée -{money(Math.round(Number(returnForm.amount || 0) * Number(returnForm.tva_rate || 0)) / 100)} · TTC -{money(Number(returnForm.amount || 0) + Math.round(Number(returnForm.amount || 0) * Number(returnForm.tva_rate || 0)) / 100)}</div>
          <div className="flex flex-wrap gap-2 md:col-span-6"><Button variant="amber">Ajouter retour marchandise</Button><Button type="button" variant="secondary" onClick={() => setShowReturnForm(false)}>Retour</Button></div>
        </form>
      </Card>}

      {editingItem && (
        <Card className="mb-8 border-l-8 border-blue-500 bg-blue-50">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black">Modifier matériel</h3>
              <p className="mt-1 text-sm text-slate-600">Zone étendue pour copier/coller une liste complète de matériel.</p>
            </div>
            <Badge tone={editingItem.ready ? "green" : "amber"}>{editingItem.ready ? "Prêt" : "À préparer"}</Badge>
          </div>

          <form onSubmit={saveEdit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Titre</label>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold focus:border-slate-500"
                value={form.title}
                onChange={(e: any) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Détail matériel</label>
              <textarea
                className="mt-1 min-h-[420px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-7 focus:border-slate-500"
                value={form.content}
                onChange={(e: any) => setForm({ ...form, content: e.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">Tu peux coller ici une commande complète, plusieurs références, commentaires fournisseur, quantités, etc.</p>
            </div>

            <div className="sticky bottom-4 flex flex-wrap gap-2 rounded-2xl bg-white/90 p-3 shadow">
              <Button>Enregistrer</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Annuler</Button>
              {!editingItem.ready && <Button type="button" variant="green" onClick={() => setReady(editingItem, true)}>OK prêt !</Button>}
              {editingItem.ready && <Button type="button" variant="amber" onClick={() => setReady(editingItem, false)}>Remettre à préparer</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-l-8 border-amber-400 bg-amber-50"><p className="text-sm font-bold text-amber-800">À préparer</p><p className="text-4xl font-black text-amber-700">{todo.length}</p></Card>
        <Card className="border-l-8 border-emerald-500 bg-emerald-50"><p className="text-sm font-bold text-emerald-800">Prêt</p><p className="text-4xl font-black text-emerald-700">{ready.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Fiches matériel</p><p className="text-4xl font-black">{materials.length}</p></Card>
        <Card className="border-l-8 border-blue-500 bg-blue-50"><p className="text-sm font-bold text-blue-800">Factures</p><p className="text-4xl font-black text-blue-700">{invoices.length}</p></Card>
      </div>

      <h3 className="mt-8 mb-3 text-xl font-black">📦 À préparer</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {todo.map((m: any) => (
          <Card key={m.id} className="border-l-8 border-amber-400 bg-amber-50">
            <div className="text-xs font-bold uppercase text-amber-700">{projectNameLocal(m.project_id)}</div>
            <h3 className="mt-1 text-xl font-black">{m.title || "Matériel à prévoir"}</h3>
            {m.content && <pre className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm">{m.content}</pre>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setFullMaterial(m)}>Plein écran</Button>
              <Button variant="green" onClick={() => setReady(m, true)}>OK prêt !</Button>
              <Button variant="secondary" onClick={() => startEdit(m)}>Modifier</Button>
              <Button variant="danger" onClick={() => deleteItem(m)}>Supprimer</Button>
              <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">Photo/doc<input className="hidden" type="file" onChange={(e: any) => uploadMaterialAttachment(m, e)} /></label>
              {m.attachment_url && <a href={m.attachment_url} target="_blank" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Voir pièce jointe</a>}
            </div>
          </Card>
        ))}
        {todo.length === 0 && <Card><p className="text-sm text-slate-500">Aucun matériel à préparer.</p></Card>}
      </div>

      <h3 className="mt-8 mb-3 text-xl font-black">✅ Matériel prêt</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {ready.map((m: any) => (
          <Card key={m.id} className="border-l-8 border-emerald-500 bg-emerald-50">
            <div className="text-xs font-bold uppercase text-emerald-700">{projectNameLocal(m.project_id)}</div>
            <h3 className="mt-1 text-xl font-black">✅ {m.title || "Matériel prêt"}</h3>
            {m.content && <pre className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm">{m.content}</pre>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setFullMaterial(m)}>Plein écran</Button>
              <Button variant="amber" onClick={() => setReady(m, false)}>Remettre à préparer</Button>
              <Button variant="secondary" onClick={() => startEdit(m)}>Modifier</Button>
              <Button variant="danger" onClick={() => deleteItem(m)}>Supprimer</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-l-8 border-blue-500 bg-blue-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-blue-950">🧾 Factures fournisseurs chantier</h3>
            <p className="mt-1 text-sm text-blue-900/70">Liste masquée ici pour alléger : les factures se consultent directement dans chaque fiche chantier.</p>
          </div>
          <Button variant="green" onClick={() => { setShowInvoiceForm(true); setShowCreateMaterial(false); setShowReturnForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ Créer facture</Button>
        </div>
      </Card>

      <Card className="mt-8 border-l-8 border-purple-500 bg-purple-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-purple-950">↩️ Retours marchandise</h3>
            <p className="mt-1 text-sm text-purple-900/70">Le bouton + Créer retour ouvre maintenant le formulaire directement en haut de page.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {returns.map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3">
              <span><b>{r.supplier}</b> · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(r.amount || 0))} · {r.return_date || "date non renseignée"} · {projectNameLocal(r.project_id)}</span>
              <Button variant="danger" onClick={() => deleteReturn(r)}>Supprimer</Button>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}


function Management({ projects, employees, planning, invoices, revenues, returns = [], refreshAll }: any) {
  const [form, setForm] = useState({ project_id: "", label: "", amount: "", tva_rate: "10", billing_date: "", notes: "" });
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  function daysBetween(start: string, end: string) { if (!start) return 0; const s = new Date(start); const e = new Date(end || start); return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000)) + 1; }
  function employeeCost(employeeId: string) { const e = employees.find((x: any) => x.id === employeeId); return Number(e?.daily_cost || 0); }
  function money(v: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0); }
  function amountHTLocal(x: any) { return Number(x.amount_ht ?? x.amount ?? 0); }
  function amountTVALocal(x: any) { return Number(x.amount_tva ?? (amountHTLocal(x) * Number(x.tva_rate || 0) / 100)); }
  function amountTTCLocal(x: any) { return Number(x.amount_ttc ?? (amountHTLocal(x) + amountTVALocal(x))); }
  function makeTaxPayloadLocal(amount: string, rate: string) { const ht = Math.round(Number(amount || 0) * 100) / 100; const tva = Math.round((ht * Number(rate || 0) / 100) * 100) / 100; const ttc = Math.round((ht + tva) * 100) / 100; return { amount: ht, amount_ht: ht, tva_rate: Number(rate || 0), amount_tva: tva, amount_ttc: ttc }; }
  function projectStats(projectId: string) { const myInvoices = invoices.filter((i: any) => i.project_id === projectId); const myReturns = returns.filter((r: any) => r.project_id === projectId); const myRevenues = revenues.filter((r: any) => r.project_id === projectId); const grossSupplierTotal = myInvoices.reduce((s: number, i: any) => s + amountHTLocal(i), 0); const supplierTVA = myInvoices.reduce((s: number, i: any) => s + amountTVALocal(i), 0); const returnsTotal = myReturns.reduce((s: number, r: any) => s + amountHTLocal(r), 0); const returnsTVA = myReturns.reduce((s: number, r: any) => s + amountTVALocal(r), 0); const supplierTotal = Math.max(0, grossSupplierTotal - returnsTotal); const revenueTotal = myRevenues.reduce((s: number, r: any) => s + amountHTLocal(r), 0); const revenueTVA = myRevenues.reduce((s: number, r: any) => s + amountTVALocal(r), 0); const netDeductibleTVA = Math.max(0, supplierTVA - returnsTVA); const tvaBalance = revenueTVA - netDeductibleTVA; const laborTotal = planning.filter((p: any) => p.project_id === projectId).reduce((s: number, p: any) => s + daysBetween(p.start_date, p.end_date) * employeeCost(p.employee_id), 0); const totalCosts = supplierTotal + laborTotal; const margin = revenueTotal - totalCosts; const marginRate = revenueTotal > 0 ? Math.round((margin / revenueTotal) * 100) : 0; return { supplierTotal, grossSupplierTotal, returnsTotal, revenueTotal, supplierTVA, returnsTVA, revenueTVA, netDeductibleTVA, tvaBalance, laborTotal, totalCosts, margin, marginRate }; }
  async function addRevenue(e: any) { e.preventDefault(); if (!form.project_id || !form.amount) return alert("Chantier et montant HT obligatoires"); const payload = { project_id: form.project_id, label: form.label || "Facturation client", ...makeTaxPayloadLocal(form.amount, form.tva_rate), billing_date: form.billing_date || null, notes: form.notes }; const query = editingRevenueId ? supabase.from("project_revenues").update(payload).eq("id", editingRevenueId) : supabase.from("project_revenues").insert(payload); const { error } = await query; if (error) return alert(error.message); setForm({ project_id: form.project_id, label: "", amount: "", tva_rate: "10", billing_date: "", notes: "" }); setEditingRevenueId(null); setShowRevenueForm(false); await refreshAll(); }
  function editRevenue(item: any) {
    setEditingRevenueId(item.id);
    setShowRevenueForm(true);
    setForm({
      project_id: item.project_id || "",
      label: item.label || "",
      amount: String(amountHTLocal(item) || ""),
      tva_rate: String(item.tva_rate ?? 10),
      billing_date: item.billing_date || "",
      notes: item.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function generateProjectReport(project: any) {
    const s = projectStats(project.id);
    const projectRevenues = revenues.filter((r: any) => r.project_id === project.id);
    const projectInvoices = invoices.filter((i: any) => i.project_id === project.id);
    const projectReturns = returns.filter((r: any) => r.project_id === project.id);
    const projectPlanning = planning.filter((p: any) => p.project_id === project.id);
    const statusColor = s.margin >= 0 ? "#10b981" : "#ef4444";
    const statusLabel = s.margin >= 0 ? "Rentable" : "À surveiller";
    const employeeLabel = (id: string) => {
      const e = employees.find((x: any) => x.id === id);
      return e ? `${e.firstname || ""} ${e.lastname || ""}`.trim() || "Salarié" : "Salarié non défini";
    };
    const pct = (value: number, total: number) => total > 0 ? Math.max(0, Math.round((value / total) * 100)) : 0;
    const revenueTTC = projectRevenues.reduce((sum: number, r: any) => sum + amountTTCLocal(r), 0);
    const purchasesTTC = projectInvoices.reduce((sum: number, i: any) => sum + amountTTCLocal(i), 0);
    const returnsTTC = projectReturns.reduce((sum: number, r: any) => sum + amountTTCLocal(r), 0);
    const tvaTotal = Math.max(1, s.revenueTVA + s.netDeductibleTVA);
    const costTotalForPie = Math.max(1, s.supplierTotal + s.laborTotal + Math.max(0, s.margin));
    const pSupplier = pct(s.supplierTotal, costTotalForPie);
    const pLabor = pct(s.laborTotal, costTotalForPie);
    const pMargin = Math.max(0, 100 - pSupplier - pLabor);
    const pCollectee = pct(s.revenueTVA, tvaTotal);
    const pDeductible = Math.max(0, 100 - pCollectee);
    const html = `
      <html>
        <head>
          <title>Rapport gestion ASB - ${project.name}</title>
          <style>
            @page{size:A4;margin:10mm}
            *{box-sizing:border-box}
            body{font-family:Arial,sans-serif;background:#e5e7eb;color:#0f172a;margin:0}
            .page{max-width:980px;margin:auto;background:white;padding:28px}
            .header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:4px solid #0f172a;padding-bottom:18px}
            .logo{height:66px;object-fit:contain}.title{margin:0;font-size:30px;letter-spacing:-.04em}.muted{color:#64748b}.badge{display:inline-block;border-radius:999px;padding:8px 14px;background:${statusColor};color:white;font-weight:900}
            .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.card{border-radius:20px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0}.card b{font-size:11px;text-transform:uppercase;color:#475569}.value{font-size:22px;font-weight:900;margin-top:6px}.small{font-size:12px;color:#64748b;margin-top:4px}
            .summary{margin-top:20px;border-radius:24px;padding:20px;background:${s.margin>=0?'#ecfdf5':'#fef2f2'};border-left:10px solid ${statusColor}}
            .big{font-size:38px;font-weight:900;letter-spacing:-.04em}.section{margin-top:24px;break-inside:avoid}h2{font-size:18px;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0f172a;color:white;text-align:left;padding:9px}td{padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top}.num{text-align:right;white-space:nowrap}
            .charts{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:22px}.chartbox{border:1px solid #e2e8f0;border-radius:24px;padding:18px;background:#f8fafc}.pie{width:190px;height:190px;border-radius:50%;margin:10px auto;border:10px solid white;box-shadow:0 10px 24px rgba(15,23,42,.12)}.legend{display:grid;gap:7px;font-size:12px}.legend span{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px}.c1{background:#0ea5e9}.c2{background:#f59e0b}.c3{background:#10b981}.c4{background:#ef4444}.note{margin-top:22px;font-size:11px;color:#64748b}.pagebreak{break-before:page}
            @media print{body{background:white}.page{padding:0}.charts{break-inside:avoid}}
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <img class="logo" src="/logo-asb.png" />
                <h1 class="title">Rapport gestion / rentabilité V37</h1>
                <p><b>${project.name}</b> · ${project.client || ""}</p>
                <p class="muted">${project.address || ""}</p>
              </div>
              <div style="text-align:right"><div class="badge">${statusLabel}</div><p class="muted">Généré depuis ASB Intranet</p></div>
            </div>
            <div class="grid">
              <div class="card"><b>CA client HT</b><div class="value">${money(s.revenueTotal)}</div><div class="small">TTC ${money(revenueTTC)}</div></div>
              <div class="card"><b>Achats - retours HT</b><div class="value">${money(s.supplierTotal)}</div><div class="small">Achats TTC ${money(purchasesTTC)} · retours TTC ${money(returnsTTC)}</div></div>
              <div class="card"><b>Main d'œuvre</b><div class="value">${money(s.laborTotal)}</div><div class="small">${projectPlanning.length} ligne(s) planning</div></div>
              <div class="card"><b>Marge estimée HT</b><div class="value">${money(s.margin)}</div><div class="small">${s.marginRate}% du CA HT</div></div>
            </div>
            <div class="grid">
              <div class="card"><b>TVA collectée</b><div class="value">${money(s.revenueTVA)}</div><div class="small">Sur factures clients</div></div>
              <div class="card"><b>TVA déductible</b><div class="value">${money(s.netDeductibleTVA)}</div><div class="small">Achats - TVA retours</div></div>
              <div class="card"><b>Solde TVA estimatif</b><div class="value">${money(s.tvaBalance)}</div><div class="small">Collectée - déductible</div></div>
              <div class="card"><b>Total coûts HT</b><div class="value">${money(s.totalCosts)}</div><div class="small">Achats nets + main d'œuvre</div></div>
            </div>
            <div class="summary">
              <div style="font-size:13px;font-weight:900;text-transform:uppercase;color:#475569">Synthèse décisionnelle</div>
              <div class="big">${s.margin >= 0 ? "+" : ""}${s.marginRate}%</div>
              <div style="font-weight:900">${s.margin >= 0 ? "Chantier rentable à ce stade." : "Chantier en dérive ou marge négative."}</div>
              <p style="margin-bottom:0;color:#475569">Jeux de TVA intégrés : TVA collectée client, TVA déductible achats, TVA corrigée par les retours et solde TVA estimatif.</p>
            </div>
            <div class="charts">
              <div class="chartbox">
                <h2>Camembert rentabilité HT</h2>
                <div class="pie" style="background:conic-gradient(#ef4444 0 ${pSupplier}%, #f59e0b ${pSupplier}% ${pSupplier+pLabor}%, #10b981 ${pSupplier+pLabor}% 100%)"></div>
                <div class="legend"><div><span class="c4"></span>Achats nets : ${money(s.supplierTotal)} (${pSupplier}%)</div><div><span class="c2"></span>Main d'œuvre : ${money(s.laborTotal)} (${pLabor}%)</div><div><span class="c3"></span>Marge : ${money(Math.max(0, s.margin))} (${pMargin}%)</div></div>
              </div>
              <div class="chartbox">
                <h2>Camembert jeu de TVA</h2>
                <div class="pie" style="background:conic-gradient(#0ea5e9 0 ${pCollectee}%, #10b981 ${pCollectee}% 100%)"></div>
                <div class="legend"><div><span class="c1"></span>TVA collectée : ${money(s.revenueTVA)} (${pCollectee}%)</div><div><span class="c3"></span>TVA déductible nette : ${money(s.netDeductibleTVA)} (${pDeductible}%)</div><div><b>Solde TVA :</b> ${money(s.tvaBalance)}</div></div>
              </div>
            </div>
            <div class="section pagebreak">
              <h2>Facturation client — détail TVA collectée</h2>
              <table><thead><tr><th>Libellé</th><th>Date</th><th class="num">HT</th><th class="num">Taux</th><th class="num">TVA collectée</th><th class="num">TTC</th><th>Notes</th></tr></thead><tbody>
                ${projectRevenues.map((r: any) => `<tr><td><b>${r.label || "Facturation client"}</b></td><td>${r.billing_date || ""}</td><td class="num">${money(amountHTLocal(r))}</td><td class="num">${Number(r.tva_rate ?? 0).toFixed(2).replace('.', ',')}%</td><td class="num">${money(amountTVALocal(r))}</td><td class="num">${money(amountTTCLocal(r))}</td><td>${r.notes || ""}</td></tr>`).join("") || `<tr><td colspan="7">Aucune facturation client enregistrée.</td></tr>`}
              </tbody></table>
            </div>
            <div class="section">
              <h2>Factures fournisseurs — détail TVA déductible</h2>
              <table><thead><tr><th>Fournisseur</th><th>Date</th><th class="num">HT</th><th class="num">Taux</th><th class="num">TVA déductible</th><th class="num">TTC</th><th>Notes</th></tr></thead><tbody>
                ${projectInvoices.map((i: any) => `<tr><td><b>${i.supplier || "Fournisseur"}</b></td><td>${i.invoice_date || ""}</td><td class="num">${money(amountHTLocal(i))}</td><td class="num">${Number(i.tva_rate ?? 0).toFixed(2).replace('.', ',')}%</td><td class="num">${money(amountTVALocal(i))}</td><td class="num">${money(amountTTCLocal(i))}</td><td>${i.notes || ""}</td></tr>`).join("") || `<tr><td colspan="7">Aucune facture fournisseur enregistrée.</td></tr>`}
              </tbody></table>
            </div>
            <div class="section">
              <h2>Retours marchandise — TVA déductible corrigée</h2>
              <table><thead><tr><th>Fournisseur</th><th>Date</th><th class="num">HT déduit</th><th class="num">Taux</th><th class="num">TVA corrigée</th><th class="num">TTC déduit</th><th>Notes</th></tr></thead><tbody>
                ${projectReturns.map((r: any) => `<tr><td><b>${r.supplier || "Retour"}</b></td><td>${r.return_date || ""}</td><td class="num">-${money(amountHTLocal(r))}</td><td class="num">${Number(r.tva_rate ?? 0).toFixed(2).replace('.', ',')}%</td><td class="num">-${money(amountTVALocal(r))}</td><td class="num">-${money(amountTTCLocal(r))}</td><td>${r.notes || ""}</td></tr>`).join("") || `<tr><td colspan="7">Aucun retour marchandise.</td></tr>`}
              </tbody></table>
            </div>
            <div class="section">
              <h2>Temps salariés / planning</h2>
              <table><thead><tr><th>Salarié</th><th>Début</th><th>Fin</th><th class="num">Jours</th><th class="num">Coût jour</th><th class="num">Coût estimé</th></tr></thead><tbody>
                ${projectPlanning.map((pl: any) => { const days = daysBetween(pl.start_date, pl.end_date); const cost = employeeCost(pl.employee_id); return `<tr><td><b>${employeeLabel(pl.employee_id)}</b></td><td>${pl.start_date || ""}</td><td>${pl.end_date || ""}</td><td class="num">${days}</td><td class="num">${money(cost)}</td><td class="num">${money(days * cost)}</td></tr>`; }).join("") || `<tr><td colspan="6">Aucun temps salarié lié au chantier.</td></tr>`}
              </tbody></table>
            </div>
            <p class="note">Document interne ASB — rapport de gestion et rentabilité. Ne pas transmettre au client sans validation.</p>
          </div>
        </body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Popup bloquée. Autorise les popups pour générer le rapport.");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  async function deleteRevenue(item: any) { if (!confirm("Supprimer cette facturation client ?")) return; const { error } = await supabase.from("project_revenues").delete().eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }
  return <div><Section title="Gestion" subtitle="V37 — rapports premium avec camemberts, TVA collectée/déductible et salariés nominatifs." />
    <Button className="mb-4" onClick={() => { if (showRevenueForm && !editingRevenueId) { setShowRevenueForm(false); } else { setShowRevenueForm(true); setEditingRevenueId(null); setForm({ project_id: "", label: "", amount: "", tva_rate: "10", billing_date: "", notes: "" }); } }}>
      {showRevenueForm ? (editingRevenueId ? "Formulaire facturation ouvert" : "Fermer création facturation client") : "+ Créer facturation client"}
    </Button>
    {showRevenueForm && <Card className="border-l-8 border-emerald-500 bg-emerald-50"><h3 className="mb-4 text-xl font-black">Ajouter facture client avec TVA</h3><form onSubmit={addRevenue} className="grid gap-3 md:grid-cols-6"><Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Field label="Libellé"><Input value={form.label} onChange={(e: any) => setForm({ ...form, label: e.target.value })} /></Field><Field label="Montant HT €"><Input type="number" step="0.01" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="TVA"><Select value={form.tva_rate} onChange={(e: any) => setForm({ ...form, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field><Field label="Date"><Input type="date" value={form.billing_date} onChange={(e: any) => setForm({ ...form, billing_date: e.target.value })} /></Field><Field label="Notes"><Input value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} /></Field><div className="rounded-2xl bg-white p-3 text-sm md:col-span-6"><b>Aperçu facture client</b> · HT {money(Number(form.amount || 0))} · TVA {money(Math.round(Number(form.amount || 0) * Number(form.tva_rate || 0)) / 100)} · TTC {money(Number(form.amount || 0) + Math.round(Number(form.amount || 0) * Number(form.tva_rate || 0)) / 100)}</div><div className="flex gap-2 md:col-span-6"><Button variant="green">{editingRevenueId ? "Enregistrer modification" : "Ajouter facturation client"}</Button>{editingRevenueId && <Button type="button" variant="secondary" onClick={() => { setEditingRevenueId(null); setForm({ project_id: "", label: "", amount: "", tva_rate: "10", billing_date: "", notes: "" }); }}>Annuler</Button>}</div></form></Card>}
    <div className="mt-6 grid gap-4 xl:grid-cols-2">{projects.map((p: any) => { const s = projectStats(p.id); return <Card key={p.id} className="border-l-8" style={{ borderLeftColor: s.margin >= 0 ? "#10b981" : "#ef4444" }}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-black">{p.name}</h3><p className="text-sm text-slate-500">{p.client}</p></div><div className="flex flex-wrap gap-2"><Badge tone={s.margin >= 0 ? "green" : "red"}>{s.margin >= 0 ? "Rentable" : "À surveiller"}</Badge><Button variant="secondary" onClick={() => generateProjectReport(p)}>Rapport PDF</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-bold uppercase text-emerald-700">Facturé client</p><p className="text-xl font-black text-emerald-700">{money(s.revenueTotal)}</p><p className="text-[11px] text-slate-500">TVA collectée : {money(s.revenueTVA || 0)}</p></div><div className="rounded-2xl bg-red-50 p-3"><p className="text-xs font-bold uppercase text-red-700">Factures - retours</p><p className="text-xl font-black text-red-700">{money(s.supplierTotal)}</p><p className="text-[11px] text-slate-500">Retours déduits : {money(s.returnsTotal || 0)}</p><p className="text-[11px] text-slate-500">TVA nette déductible : {money(s.netDeductibleTVA || 0)}</p></div><div className="rounded-2xl bg-amber-50 p-3"><p className="text-xs font-bold uppercase text-amber-700">Coût salariés</p><p className="text-xl font-black text-amber-700">{money(s.laborTotal)}</p></div><div className={s.margin >= 0 ? "rounded-2xl bg-blue-50 p-3" : "rounded-2xl bg-red-100 p-3"}><p className="text-xs font-bold uppercase">Marge estimée</p><p className="text-xl font-black">{money(s.margin)} · {s.marginRate}%</p></div></div><div className="mt-4 space-y-2">{revenues.filter((r: any) => r.project_id === p.id).map((r: any) => <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm"><span><b>{r.label}</b> · HT {money(amountHTLocal(r))} · TVA {money(amountTVALocal(r))} · TTC {money(amountTTCLocal(r))} · {r.billing_date || "date non renseignée"}</span><div className="flex gap-2"><Button variant="secondary" onClick={() => editRevenue(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteRevenue(r)}>Supprimer</Button></div></div>)}</div></Card>; })}</div>
  </div>;
}

function Mobile({ projects, refreshAll }: any) {
  const [projectId, setProjectId] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  useEffect(() => { loadGallery(); }, []);
  async function loadGallery() { const { data } = await supabase.from("chantier_photos").select("*").order("created_at", { ascending: false }); setAllPhotos(data || []); }
  async function quickPhoto(e: any) {
    e.preventDefault(); const file = e.currentTarget?.mobilePhoto?.files?.[0]; if (!projectId || !file) return alert("Choisis un chantier et une photo");
    try { const file_url = await uploadFile("photos", file); const { error } = await supabase.from("chantier_photos").insert({ project_id: projectId, title: photoTitle || file.name, file_url, phase: "express" }); if (error) throw error; setPhotoTitle(""); await loadGallery(); await refreshAll(); alert("Photo envoyée"); } catch (err: any) { alert(err.message); }
  }
  async function deletePhoto(photo: any) { if (!confirm("Supprimer cette photo ?")) return; const path = storagePathFromPublicUrl(photo.file_url, "photos"); if (path) await supabase.storage.from("photos").remove([path]); const { error } = await supabase.from("chantier_photos").delete().eq("id", photo.id); if (error) return alert(error.message); await loadGallery(); await refreshAll(); }
  const visiblePhotos = projectId ? allPhotos.filter((p: any) => p.project_id === projectId) : allPhotos;
  function projectNameLocal(id: string) { return projects.find((p: any) => p.id === id)?.name || "Chantier"; }
  return <div><Section title="Photos Express" subtitle="Ajout rapide et galerie chantier depuis mobile." /><div className="grid gap-6 lg:grid-cols-[380px_1fr]"><Card><h3 className="mb-4 text-xl font-black">📸 Ajouter une photo</h3><form onSubmit={quickPhoto} className="space-y-3"><Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Field label="Titre"><Input value={photoTitle} onChange={(e: any) => setPhotoTitle(e.target.value)} /></Field><Input name="mobilePhoto" type="file" accept="image/*" capture="environment" /><Button className="w-full">Envoyer photo</Button></form></Card><div><div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-black">Galerie</h3><Badge>{visiblePhotos.length} photo(s)</Badge></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{visiblePhotos.map((p: any) => <div key={p.id} className="overflow-hidden rounded-3xl bg-white shadow-sm"><a href={p.file_url} target="_blank"><img src={p.file_url} className="h-40 w-full object-cover" /></a><div className="p-3"><div className="text-xs font-bold text-slate-500">{projectNameLocal(p.project_id)}</div><div className="font-black">{p.title || "Photo"}</div><Button variant="danger" className="mt-2 w-full" onClick={() => deletePhoto(p)}>Supprimer</Button></div></div>)}</div></div></div></div>;
}
