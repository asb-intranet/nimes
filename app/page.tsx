"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Field, Input, Select, Textarea, Section, Badge } from "@/components/Ui";
import { Building2, Camera, FileText, Users, Truck, MessageSquare, Smartphone, LayoutDashboard, LogOut, Pencil, Trash2 } from "lucide-react";

const menu = [
  { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard },
  { id: "projects", title: "Chantiers", icon: Building2 },
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) refreshAll();
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) refreshAll();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function refreshAll() {
    const [p, ph, d, e, l, n, v, r] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_photos").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_projects").select("*"),
      supabase.from("chantier_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("internal_requests").select("*").order("created_at", { ascending: false })
    ]);

    setProjects(p.data || []); setPhotos(ph.data || []); setDocs(d.data || []); setEmployees(e.data || []);
    setLinks(l.data || []); setNotes(n.data || []); setVehicles(v.data || []); setRequests(r.data || []);
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

  if (loading) return <div className="p-8">Chargement...</div>;

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <Card className="w-full max-w-md">
          <h1 className="text-3xl font-black">ASB Intranet V2</h1>
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
        <div className="mb-8 rounded-3xl bg-slate-900 p-5 text-white">
          <div className="text-2xl font-black">ASB Intranet V2</div>
          <div className="mt-1 text-sm text-slate-300">Suivi chantier mobile</div>
        </div>
        <nav className="space-y-2">
          {menu.map((m) => {
            const Icon = m.icon;
            return <button key={m.id} onClick={() => setActive(m.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${active === m.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon size={18} /> {m.title}</button>;
          })}
        </nav>
        <Button variant="secondary" className="absolute bottom-6 left-6 right-6" onClick={signOut}><LogOut size={16} className="mr-2" /> Déconnexion</Button>
      </aside>

      <main className="lg:ml-80">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 p-5 backdrop-blur">
          <div className="text-sm text-slate-500">Connecté : {session.user.email}</div>
          <h1 className="text-3xl font-black">{menu.find((m) => m.id === active)?.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            {menu.map((m) => <Button key={m.id} variant={active === m.id ? "primary" : "secondary"} onClick={() => setActive(m.id)}>{m.title}</Button>)}
          </div>
        </header>

        <section className="p-5 lg:p-8">
          {active === "dashboard" && <Dashboard projects={projects} photos={photos} docs={docs} requests={requests} setActive={setActive} />}
          {active === "projects" && <Projects projects={projects} photos={photos} docs={docs} notes={notes} employees={employees} links={links} refreshAll={refreshAll} />}
          {active === "employees" && <Employees employees={employees} projects={projects} refreshAll={refreshAll} />}
          {active === "vehicles" && <Vehicles vehicles={vehicles} refreshAll={refreshAll} />}
          {active === "requests" && <Requests requests={requests} projects={projects} refreshAll={refreshAll} projectName={projectName} />}
          {active === "mobile" && <Mobile projects={projects} refreshAll={refreshAll} />}
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

function Projects({ projects, photos, docs, notes, employees, links, refreshAll }: any) {
  const [selectedId, setSelectedId] = useState("");
  const current = projects.find((p: any) => p.id === selectedId) || projects[0];
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
  }

  return (
    <div>
      <Section title="Gestion chantier" subtitle="Création, modification, galerie photos, documents lisibles et notes." />
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
      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {projects.map((p: any) => (
            <Card key={p.id} className={`cursor-pointer border-l-8 ${current?.id === p.id ? "ring-2 ring-slate-900" : ""}`} style={{ borderLeftColor: p.color || "#0f172a" }} onClick={() => setSelectedId(p.id)}>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-black">{p.name}</h3><p className="text-sm text-slate-500">{p.address}</p></div>
                <Badge tone={statusTone[p.status] || "slate"}>{statusLabels[p.status] || p.status}</Badge>
              </div>
              <Button className="mt-3" variant="secondary" onClick={(e: any) => { e.stopPropagation(); editProject(p); }}><Pencil size={14} className="mr-1" /> Modifier</Button>
            </Card>
          ))}
        </div>
        <ProjectDetail project={current} photos={photos} docs={docs} notes={notes} employees={employees} links={links} refreshAll={refreshAll} />
      </div>
    </div>
  );
}


function ProjectDetail({ project, photos, docs, notes, employees, links, refreshAll }: any) {
  const [photoTitle, setPhotoTitle] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("facture");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!project) return <Card><p>Aucun chantier pour le moment.</p></Card>;

  const projectPhotos = photos.filter((x: any) => x.project_id === project.id);
  const projectDocs = docs.filter((x: any) => x.project_id === project.id);
  const projectNotes = notes.filter((x: any) => x.project_id === project.id);

  function storagePathFromPublicUrl(url: string, bucket: string) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    if (!url || !url.includes(marker)) return null;
    return decodeURIComponent(url.split(marker)[1]);
  }

  async function addPhoto(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.photo?.files?.[0];
    if (!file) return alert("Ajoute une photo");

    setBusy(true);

    try {
      const file_url = await uploadFile("photos", file);

      const { error } = await supabase.from("chantier_photos").insert({
        project_id: project.id,
        title: photoTitle || file.name,
        file_url,
        phase: "chantier"
      });

      if (error) throw error;

      setPhotoTitle("");
      await refreshAll();
      alert("Photo ajoutée");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photo: any) {
    const ok = confirm(`Supprimer la photo "${photo.title}" ?`);
    if (!ok) return;

    try {
      const path = storagePathFromPublicUrl(photo.file_url, "photos");

      if (path) {
        await supabase.storage.from("photos").remove([path]);
      }

      const { error } = await supabase
        .from("chantier_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;

      await refreshAll();
      alert("Photo supprimée");
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function addDoc(e: any) {
    e.preventDefault();
    const file = e.currentTarget?.doc?.files?.[0];
    if (!file) return alert("Ajoute un document");

    setBusy(true);

    try {
      const file_url = await uploadFile("documents", file);

      const { error } = await supabase.from("chantier_documents").insert({
        project_id: project.id,
        name: docName || file.name,
        type: docType,
        file_url
      });

      if (error) throw error;

      setDocName("");
      await refreshAll();
      alert("Document ajouté");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: any) {
    e.preventDefault();
    if (!note) return;

    const { error } = await supabase.from("chantier_notes").insert({
      project_id: project.id,
      content: note
    });

    if (error) return alert(error.message);

    setNote("");
    await refreshAll();
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-8" style={{ borderLeftColor: project.color || "#0f172a" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{project.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{project.client} · {project.address}</p>
          </div>
          <Badge tone={statusTone[project.status] || "slate"}>{statusLabels[project.status] || project.status}</Badge>
        </div>
        <p className="mt-4 text-sm text-slate-700">{project.description}</p>
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
                <a href={p.file_url} target="_blank" className="block">
                  <img src={p.file_url} alt={p.title} className="h-36 w-full object-cover" />
                </a>
                <div className="space-y-2 p-2">
                  <div className="text-xs font-bold">{p.title}</div>
                  <div className="flex gap-2">
                    <a href={p.file_url} target="_blank" className="flex-1 rounded-xl border bg-white px-2 py-1 text-center text-xs font-bold">
                      Voir
                    </a>
                    <button
                      type="button"
                      onClick={() => deletePhoto(p)}
                      className="flex items-center justify-center rounded-xl bg-red-600 px-2 py-1 text-xs font-bold text-white"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {projectPhotos.length === 0 && (
              <div className="col-span-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aucune photo pour ce chantier.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-black"><FileText size={18} className="mr-2 inline" /> Documents chantier</h3>

          <form onSubmit={addDoc} className="mb-4 space-y-3">
            <Field label="Nom"><Input value={docName} onChange={(e: any) => setDocName(e.target.value)} /></Field>
            <Field label="Type">
              <Select value={docType} onChange={(e: any) => setDocType(e.target.value)}>
                <option value="facture">Facture achat</option>
                <option value="bl">Bon de livraison</option>
                <option value="devis">Devis</option>
                <option value="plan">Plan</option>
                <option value="autre">Autre</option>
              </Select>
            </Field>
            <Field label="Fichier"><Input name="doc" type="file" /></Field>
            <Button disabled={busy}>{busy ? "Envoi..." : "Ajouter document"}</Button>
          </form>

          <div className="space-y-2">
            {projectDocs.map((d: any) => (
              <a key={d.id} href={d.file_url} target="_blank" className="flex items-center justify-between rounded-2xl border bg-slate-50 p-3 text-sm font-bold">
                <span>{d.name}</span>
                <Badge>{d.type}</Badge>
              </a>
            ))}

            {projectDocs.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aucun document pour ce chantier.
              </div>
            )}
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
            <div key={n.id} className="rounded-2xl bg-slate-50 p-3 text-sm">{n.content}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Employees({ employees, projects, refreshAll }: any) {
  const [form, setForm] = useState({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "" });
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");

  async function addEmployee(e: any) {
    e.preventDefault();
    if (!form.firstname || !form.lastname) return alert("Nom et prénom obligatoires");
    const { error } = await supabase.from("employees").insert(form);
    if (error) return alert(error.message);
    setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "" });
    await refreshAll();
  }

  async function assign(e: any) {
    e.preventDefault();
    if (!employeeId || !projectId) return;
    const { error } = await supabase.from("employee_projects").insert({ employee_id: employeeId, project_id: projectId });
    if (error) return alert(error.message);
    await refreshAll();
  }

  return (
    <div>
      <Section title="Gestion salariés" subtitle="Création salarié et affectation aux chantiers." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h3 className="mb-4 font-black">Créer salarié</h3><form onSubmit={addEmployee} className="space-y-3"><Field label="Prénom"><Input value={form.firstname} onChange={(e: any) => setForm({ ...form, firstname: e.target.value })} /></Field><Field label="Nom"><Input value={form.lastname} onChange={(e: any) => setForm({ ...form, lastname: e.target.value })} /></Field><Field label="Poste"><Input value={form.position} onChange={(e: any) => setForm({ ...form, position: e.target.value })} /></Field><Field label="Rôle"><Select value={form.role} onChange={(e: any) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="bureau">Bureau</option><option value="chef">Chef chantier</option><option value="terrain">Terrain</option></Select></Field><Button>Ajouter salarié</Button></form></Card>
        <Card><h3 className="mb-4 font-black">Affecter à un chantier</h3><form onSubmit={assign} className="space-y-3"><Field label="Salarié"><Select value={employeeId} onChange={(e: any) => setEmployeeId(e.target.value)}><option value="">Choisir</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstname} {e.lastname}</option>)}</Select></Field><Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Button>Affecter</Button></form></Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{employees.map((e: any) => <Card key={e.id}><h3 className="font-black">{e.firstname} {e.lastname}</h3><p className="text-sm text-slate-500">{e.position}</p><Badge>{e.role}</Badge></Card>)}</div>
    </div>
  );
}

function Vehicles({ vehicles, refreshAll }: any) {
  const [form, setForm] = useState({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" });
  async function addVehicle(e: any) {
    e.preventDefault();
    if (!form.name) return;
    const { error } = await supabase.from("vehicles").insert({ ...form, km: Number(form.km || 0) });
    if (error) return alert(error.message);
    setForm({ name: "", plate: "", driver: "", km: "", status: "ras", next_service: "", insurance_date: "", technical_control_date: "", notes: "" });
    await refreshAll();
  }
  return <div><Section title="Gestion véhicules" subtitle="Parc véhicules, conducteur, km, entretien, CT et assurance." /><Card><form onSubmit={addVehicle} className="grid gap-3 md:grid-cols-3"><Field label="Véhicule"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Immatriculation"><Input value={form.plate} onChange={(e: any) => setForm({ ...form, plate: e.target.value })} /></Field><Field label="Conducteur"><Input value={form.driver} onChange={(e: any) => setForm({ ...form, driver: e.target.value })} /></Field><Field label="Kilométrage"><Input type="number" value={form.km} onChange={(e: any) => setForm({ ...form, km: e.target.value })} /></Field><Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option value="ras">RAS</option><option value="entretien">Entretien</option><option value="probleme">Problème</option></Select></Field><Field label="Prochain entretien"><Input type="date" value={form.next_service} onChange={(e: any) => setForm({ ...form, next_service: e.target.value })} /></Field><Button className="md:col-span-3">Ajouter véhicule</Button></form></Card><div className="mt-6 grid gap-4 md:grid-cols-3">{vehicles.map((v: any) => <Card key={v.id}><h3 className="font-black">{v.name}</h3><p className="text-sm text-slate-500">{v.plate}</p><p className="mt-2 text-sm">Conducteur : <b>{v.driver}</b></p><p className="text-sm">KM : <b>{v.km}</b></p><Badge tone={v.status === "probleme" ? "red" : v.status === "entretien" ? "amber" : "green"}>{v.status}</Badge></Card>)}</div></div>;
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
  return <div><Section title="Demandes internes" subtitle="Demandes d'achat, matériel, messages chantier." /><Card><form onSubmit={addRequest} className="grid gap-3 md:grid-cols-3"><Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}><option value="">Sans chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Field label="Type"><Select value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}><option value="achat">Achat</option><option value="materiel">Matériel</option><option value="sav">SAV</option><option value="autre">Autre</option></Select></Field><Field label="Priorité"><Select value={form.priority} onChange={(e: any) => setForm({ ...form, priority: e.target.value })}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option></Select></Field><Field label="Demandeur"><Input value={form.requester} onChange={(e: any) => setForm({ ...form, requester: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Message"><Textarea value={form.message} onChange={(e: any) => setForm({ ...form, message: e.target.value })} /></Field></div><Button className="md:col-span-3">Créer demande</Button></form></Card><div className="mt-6 space-y-3">{requests.map((r: any) => <Card key={r.id}><div className="flex justify-between gap-3"><div><h3 className="font-black">{r.type} · {projectName(r.project_id)}</h3><p className="text-sm text-slate-600">{r.message}</p></div><Badge tone={r.priority === "haute" ? "red" : "amber"}>{r.priority}</Badge></div></Card>)}</div></div>;
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
  return <div><Section title="Mobile terrain" subtitle="Interface simplifiée pour téléphone." /><div className="mx-auto max-w-md space-y-4"><Card><Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir chantier</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field></Card><Card><h3 className="mb-3 font-black">Photo rapide</h3><form onSubmit={quickPhoto} className="space-y-3"><Input name="mobilePhoto" type="file" accept="image/*" capture="environment" /><Button className="w-full"><Camera size={16} className="mr-2" /> Envoyer photo</Button></form></Card><Card><h3 className="mb-3 font-black">Note rapide</h3><form onSubmit={quickNote} className="space-y-3"><Textarea value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Note chantier..." /><Button className="w-full">Ajouter note</Button></form></Card></div></div>;
}
