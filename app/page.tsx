"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Field, Input, Select, Textarea, Section, Badge } from "@/components/Ui";
import { Building2, Euro, CalendarDays, Clock, Truck, Smartphone, ClipboardCheck, Settings as SettingsIcon, LogOut } from "lucide-react";

const modules = [
  { id: "dashboard", title: "Tableau de bord", icon: Building2 },
  { id: "projects", title: "Gestion chantiers", icon: Building2 },
  { id: "payments", title: "Paiements / échéanciers", icon: Euro },
  { id: "planning", title: "Planning", icon: CalendarDays },
  { id: "time", title: "Pointage personnel", icon: Clock },
  { id: "vehicles", title: "Véhicules", icon: Truck },
  { id: "mobile", title: "Mobile terrain", icon: Smartphone },
  { id: "requests", title: "Demandes internes", icon: ClipboardCheck },
  { id: "settings", title: "Personnalisation", icon: SettingsIcon }
];

function money(v: any) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(v || 0));
}

function calc(start: string, end: string, pause: number) {
  if (!start || !end) return "0h00";
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const total = Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1) - Number(pause || 0));
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, "0")}`;
}

function cleanFileName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "";
  const base = name.replace(/\.[^/.]+$/, "");

  const cleaned = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${Date.now()}-${cleaned || "fichier"}${extension ? "." + extension.toLowerCase() : ""}`;
}

async function upload(bucket: string, file: File) {
  const path = cleanFileName(file.name);
  const { error } = await supabase.storage.from(bucket).upload(path, file);

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [planning, setPlanning] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

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
    const [
      projectsRes,
      photosRes,
      docsRes,
      paymentsRes,
      planningRes,
      timeRes,
      vehiclesRes,
      requestsRes,
      profileRes
    ] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_photos").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("planning").select("*").order("start_date", { ascending: true }),
      supabase.from("time_entries").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("internal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").maybeSingle()
    ]);

    setProjects(projectsRes.data || []);
    setPhotos(photosRes.data || []);
    setDocuments(docsRes.data || []);
    setPayments(paymentsRes.data || []);
    setPlanning(planningRes.data || []);
    setTimeEntries(timeRes.data || []);
    setVehicles(vehiclesRes.data || []);
    setRequests(requestsRes.data || []);
    setProfile(profileRes.data || null);
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
      <main className="flex min-h-screen items-center justify-center p-5">
        <Card className="w-full max-w-md">
          <h1 className="text-3xl font-black">ASB Intranet</h1>
          <p className="mt-2 text-sm text-slate-500">Connexion collaborateurs</p>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
            </Field>

            <Field label="Mot de passe">
              <Input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
            </Field>

            <Button className="w-full">Se connecter</Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-full w-80 border-r bg-white p-6 lg:block">
        <div className="mb-8 rounded-3xl bg-slate-900 p-5 text-white">
          <div className="text-2xl font-black">ASB Intranet</div>
          <div className="text-sm text-slate-300">Cloud entreprise</div>
          <div className="mt-3 text-xs text-slate-400">Rôle : {profile?.role || "à définir"}</div>
        </div>

        <nav className="space-y-2">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${
                  active === m.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
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
        <header className="sticky top-0 z-20 border-b bg-white/90 p-5">
          <div className="text-sm text-slate-500">Connecté : {session.user.email}</div>
          <h1 className="text-3xl font-black">{modules.find((m) => m.id === active)?.title}</h1>

          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            {modules.map((m) => (
              <Button key={m.id} variant={active === m.id ? "primary" : "secondary"} onClick={() => setActive(m.id)}>
                {m.title}
              </Button>
            ))}
          </div>
        </header>

        <section className="p-5 lg:p-8">
          {active === "dashboard" && <Dashboard projects={projects} photos={photos} documents={documents} payments={payments} setActive={setActive} />}
          {active === "projects" && <Projects projects={projects} photos={photos} documents={documents} refreshAll={refreshAll} />}
          {active === "payments" && <Payments projects={projects} payments={payments} refreshAll={refreshAll} projectName={projectName} />}
          {active === "planning" && <Planning projects={projects} planning={planning} refreshAll={refreshAll} projectName={projectName} />}
          {active === "time" && <TimeEntries projects={projects} timeEntries={timeEntries} refreshAll={refreshAll} projectName={projectName} />}
          {active === "vehicles" && <Vehicles vehicles={vehicles} refreshAll={refreshAll} />}
          {active === "mobile" && <MobileView />}
          {active === "requests" && <Requests projects={projects} requests={requests} refreshAll={refreshAll} projectName={projectName} />}
          {active === "settings" && <SettingsPage />}
        </section>
      </main>
    </div>
  );
}

function Dashboard({ projects, photos, documents, payments, setActive }: any) {
  const overdue = payments.filter((p: any) => p.status === "En retard").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  return (
    <div>
      <Section title="Tableau de bord" subtitle="Vue globale entreprise." />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Chantiers</p><p className="text-3xl font-black">{projects.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Photos</p><p className="text-3xl font-black">{photos.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Documents</p><p className="text-3xl font-black">{documents.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Retards paiement</p><p className="text-3xl font-black text-red-600">{money(overdue)}</p></Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {projects.map((p: any) => (
          <Card key={p.id}>
            <h3 className="font-black">{p.name}</h3>
            <p className="text-sm text-slate-500">{p.client}</p>
            <p className="mt-3 text-sm">Avancement : <b>{p.progress || 0}%</b></p>
            <Button className="mt-4" onClick={() => setActive("projects")}>Ouvrir</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Projects({ projects, photos, documents, refreshAll }: any) {
  const [form, setForm] = useState({ name: "", client: "", address: "", status: "En cours", progress: 0, manager: "" });
  const [photo, setPhoto] = useState({ project_id: "", title: "", phase: "Avant travaux", note: "" });
  const [doc, setDoc] = useState({ project_id: "", name: "", type: "Devis" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projects[0]) {
      setPhoto((p) => ({ ...p, project_id: projects[0].id }));
      setDoc((d) => ({ ...d, project_id: projects[0].id }));
    }
  }, [projects]);

  async function createProject(e: any) {
    e.preventDefault();
    if (!form.name) return;

    const { error } = await supabase.from("projects").insert(form);
    if (error) return alert(error.message);

    setForm({ name: "", client: "", address: "", status: "En cours", progress: 0, manager: "" });
    await refreshAll();
  }

  async function createPhoto(e:any){
  e.preventDefault()

  const formEl = e.currentTarget

  const file = formEl.photoFile.files[0]
  if(!file || !photo.title) return alert("Photo et titre obligatoires")

  setBusy(true)

  try {
    const file_url = await upload("photos", file)

    const { error } = await supabase
      .from("chantier_photos")
      .insert({ ...photo, file_url })

    if (error) throw error

    // reset propre
    formEl.reset()

    setPhoto({
      project_id: photo.project_id,
      title: "",
      phase: "Avant travaux",
      note: ""
    })

    refreshAll()

  } catch (err:any) {
    alert(err.message)
  } finally {
    setBusy(false)
  }
}

  async function createDoc(e: any) {
    e.preventDefault();

    const file = e.currentTarget?.documentFile?.files?.[0];
    if (!file || !doc.name) return alert("Document et nom obligatoires");

    setBusy(true);

    try {
      const file_url = await upload("documents", file);

      const { error } = await supabase.from("chantier_documents").insert({
        ...doc,
        file_url
      });

      if (error) throw error;

      setDoc({ ...doc, name: "" });
      await refreshAll();
      alert("Document envoyé avec succès");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Section title="Gestion chantiers" subtitle="Chantiers + photos réelles + documents PDF réels." />

      <Card>
        <form onSubmit={createProject} className="grid gap-3 md:grid-cols-3">
          <Field label="Nom chantier"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Client"><Input value={form.client} onChange={(e: any) => setForm({ ...form, client: e.target.value })} /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option>En cours</option><option>À planifier</option><option>Terminé</option></Select></Field>
          <Field label="Avancement %"><Input type="number" value={form.progress} onChange={(e: any) => setForm({ ...form, progress: Number(e.target.value) })} /></Field>
          <Field label="Responsable"><Input value={form.manager} onChange={(e: any) => setForm({ ...form, manager: e.target.value })} /></Field>
          <Button className="md:col-span-3">Créer chantier</Button>
        </form>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-black">Ajouter photo chantier</h3>

          <form onSubmit={createPhoto} className="mt-4 space-y-3">
            <Field label="Chantier">
              <Select value={photo.project_id} onChange={(e: any) => setPhoto({ ...photo, project_id: e.target.value })}>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field label="Titre"><Input value={photo.title} onChange={(e: any) => setPhoto({ ...photo, title: e.target.value })} /></Field>

            <Field label="Étape">
              <Select value={photo.phase} onChange={(e: any) => setPhoto({ ...photo, phase: e.target.value })}>
                <option>Avant travaux</option>
                <option>Pendant travaux</option>
                <option>Après travaux</option>
                <option>Réserve</option>
                <option>Désordre</option>
                <option>Sécurité</option>
              </Select>
            </Field>

            <Field label="Fichier photo"><Input name="photoFile" type="file" accept="image/*" /></Field>
            <Field label="Note"><Textarea value={photo.note} onChange={(e: any) => setPhoto({ ...photo, note: e.target.value })} /></Field>

            <Button disabled={busy}>{busy ? "Envoi..." : "Envoyer photo"}</Button>
          </form>
        </Card>

        <Card>
          <h3 className="font-black">Ajouter document chantier</h3>

          <form onSubmit={createDoc} className="mt-4 space-y-3">
            <Field label="Chantier">
              <Select value={doc.project_id} onChange={(e: any) => setDoc({ ...doc, project_id: e.target.value })}>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field label="Nom"><Input value={doc.name} onChange={(e: any) => setDoc({ ...doc, name: e.target.value })} /></Field>

            <Field label="Type">
              <Select value={doc.type} onChange={(e: any) => setDoc({ ...doc, type: e.target.value })}>
                <option>Devis</option>
                <option>Facture</option>
                <option>Plan</option>
                <option>PV réception</option>
                <option>Attestation</option>
              </Select>
            </Field>

            <Field label="Fichier PDF/doc"><Input name="documentFile" type="file" /></Field>

            <Button disabled={busy}>{busy ? "Envoi..." : "Envoyer document"}</Button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((p: any) => (
          <Card key={p.id}>
            <h3 className="font-black">{p.name}</h3>
            <p>{p.client}</p>
            <p className="text-sm">Photos : {photos.filter((x: any) => x.project_id === p.id).length}</p>
            <p className="text-sm">Documents : {documents.filter((x: any) => x.project_id === p.id).length}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Payments({ projects, payments, refreshAll, projectName }: any) {
  const [form, setForm] = useState({ project_id: "", label: "", amount: "", due_date: "", status: "À venir" });

  useEffect(() => {
    if (projects[0]) setForm((f) => ({ ...f, project_id: projects[0].id }));
  }, [projects]);

  async function add(e: any) {
    e.preventDefault();

    let file_url = null;
    const file = e.currentTarget?.paymentFile?.files?.[0];

    if (file) file_url = await upload("documents", file);

    const { error } = await supabase.from("payments").insert({
      ...form,
      amount: Number(form.amount),
      file_url
    });

    if (error) return alert(error.message);

    setForm({ ...form, label: "", amount: "" });
    await refreshAll();
  }

  return (
    <div>
      <Section title="Paiements clients / échéanciers" subtitle="Échéances + documents liés." />

      <Card>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-3">
          <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Échéance"><Input value={form.label} onChange={(e: any) => setForm({ ...form, label: e.target.value })} /></Field>
          <Field label="Montant"><Input type="number" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={form.due_date} onChange={(e: any) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option>À venir</option><option>À encaisser</option><option>Payé</option><option>En retard</option></Select></Field>
          <Field label="Document lié"><Input name="paymentFile" type="file" /></Field>
          <Button className="md:col-span-3">Ajouter échéance</Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {payments.map((p: any) => (
          <Card key={p.id} className="flex justify-between">
            <div><b>{projectName(p.project_id)}</b> · {p.label} · {money(p.amount)}<p>{p.due_date}</p></div>
            <div>{p.file_url && <a href={p.file_url} target="_blank" className="underline">Document</a>} <Badge tone={p.status === "En retard" ? "red" : p.status === "Payé" ? "green" : "amber"}>{p.status}</Badge></div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Planning({ projects, planning, refreshAll, projectName }: any) {
  const [form, setForm] = useState({ project_id: "", title: "", start_date: "", end_date: "", team: "", priority: "Normale" });

  useEffect(() => {
    if (projects[0]) setForm((f) => ({ ...f, project_id: projects[0].id }));
  }, [projects]);

  async function add(e: any) {
    e.preventDefault();
    const { error } = await supabase.from("planning").insert(form);
    if (error) return alert(error.message);
    setForm({ ...form, title: "" });
    await refreshAll();
  }

  return (
    <div>
      <Section title="Planning" />

      <Card>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-3">
          <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Tâche"><Input value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Équipe"><Input value={form.team} onChange={(e: any) => setForm({ ...form, team: e.target.value })} /></Field>
          <Field label="Début"><Input type="date" value={form.start_date} onChange={(e: any) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="Fin"><Input type="date" value={form.end_date} onChange={(e: any) => setForm({ ...form, end_date: e.target.value })} /></Field>
          <Field label="Priorité"><Select value={form.priority} onChange={(e: any) => setForm({ ...form, priority: e.target.value })}><option>Basse</option><option>Normale</option><option>Haute</option></Select></Field>
          <Button>Ajouter</Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {planning.map((x: any) => <Card key={x.id}><b>{projectName(x.project_id)}</b> · {x.title}<p>{x.start_date} → {x.end_date} · {x.team}</p></Card>)}
      </div>
    </div>
  );
}

function TimeEntries({ projects, timeEntries, refreshAll, projectName }: any) {
  const [form, setForm] = useState({ employee: "", project_id: "", work_date: new Date().toISOString().slice(0, 10), start_time: "08:00", end_time: "17:00", pause_minutes: 60 });

  useEffect(() => {
    if (projects[0]) setForm((f) => ({ ...f, project_id: projects[0].id }));
  }, [projects]);

  async function add(e: any) {
    e.preventDefault();
    const { error } = await supabase.from("time_entries").insert(form);
    if (error) return alert(error.message);
    await refreshAll();
  }

  return (
    <div>
      <Section title="Pointage personnel" />

      <Card>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-3">
          <Field label="Salarié"><Input value={form.employee} onChange={(e: any) => setForm({ ...form, employee: e.target.value })} /></Field>
          <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={form.work_date} onChange={(e: any) => setForm({ ...form, work_date: e.target.value })} /></Field>
          <Field label="Arrivée"><Input type="time" value={form.start_time} onChange={(e: any) => setForm({ ...form, start_time: e.target.value })} /></Field>
          <Field label="Départ"><Input type="time" value={form.end_time} onChange={(e: any) => setForm({ ...form, end_time: e.target.value })} /></Field>
          <Field label="Pause min"><Input type="number" value={form.pause_minutes} onChange={(e: any) => setForm({ ...form, pause_minutes: Number(e.target.value) })} /></Field>
          <div>Total : {calc(form.start_time, form.end_time, form.pause_minutes)}</div>
          <Button>Ajouter pointage</Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {timeEntries.map((x: any) => <Card key={x.id}><b>{x.employee}</b> · {projectName(x.project_id)}<p>{x.work_date} · {x.start_time} → {x.end_time} · {calc(x.start_time, x.end_time, x.pause_minutes)}</p></Card>)}
      </div>
    </div>
  );
}

function Vehicles({ vehicles, refreshAll }: any) {
  const [form, setForm] = useState({ name: "", driver: "", km: "", status: "RAS", alert: "" });

  async function add(e: any) {
    e.preventDefault();
    const { error } = await supabase.from("vehicles").insert({ ...form, km: Number(form.km || 0) });
    if (error) return alert(error.message);
    setForm({ name: "", driver: "", km: "", status: "RAS", alert: "" });
    await refreshAll();
  }

  return (
    <div>
      <Section title="Gestion véhicules" />

      <Card>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-3">
          <Field label="Véhicule"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Conducteur"><Input value={form.driver} onChange={(e: any) => setForm({ ...form, driver: e.target.value })} /></Field>
          <Field label="KM"><Input type="number" value={form.km} onChange={(e: any) => setForm({ ...form, km: e.target.value })} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}><option>RAS</option><option>Entretien</option><option>Problème</option></Select></Field>
          <Field label="Alerte"><Input value={form.alert} onChange={(e: any) => setForm({ ...form, alert: e.target.value })} /></Field>
          <Button>Ajouter véhicule</Button>
        </form>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {vehicles.map((v: any) => <Card key={v.id}><b>{v.name}</b><p>{v.driver} · {v.km} km</p><p className="text-red-600">{v.alert}</p></Card>)}
      </div>
    </div>
  );
}

function MobileView() {
  return (
    <div>
      <Section title="Application mobile terrain" subtitle="PWA installable depuis Chrome/Safari." />
      <Card>
        <p>Ouvre l'URL Vercel sur téléphone puis “Ajouter à l’écran d’accueil”.</p>
        <ul className="mt-4 list-disc pl-6">
          <li>Photos terrain</li>
          <li>Pointage</li>
          <li>Demandes internes</li>
          <li>Documents chantier</li>
        </ul>
      </Card>
    </div>
  );
}

function Requests({ projects, requests, refreshAll, projectName }: any) {
  const [form, setForm] = useState({ type: "Matériel", project_id: "", requester: "", message: "", status: "Ouverte" });

  useEffect(() => {
    if (projects[0]) setForm((f) => ({ ...f, project_id: projects[0].id }));
  }, [projects]);

  async function add(e: any) {
    e.preventDefault();
    const { error } = await supabase.from("internal_requests").insert(form);
    if (error) return alert(error.message);
    setForm({ ...form, message: "" });
    await refreshAll();
  }

  return (
    <div>
      <Section title="Demandes internes" />

      <Card>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-2">
          <Field label="Type"><Select value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}><option>Matériel</option><option>Véhicule</option><option>Congé</option><option>Sécurité</option></Select></Field>
          <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Demandeur"><Input value={form.requester} onChange={(e: any) => setForm({ ...form, requester: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Message"><Textarea value={form.message} onChange={(e: any) => setForm({ ...form, message: e.target.value })} /></Field></div>
          <Button>Créer demande</Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {requests.map((r: any) => <Card key={r.id}><b>{r.type}</b> · {projectName(r.project_id)}<p>{r.message}</p></Card>)}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <Section title="Personnalisation intranet" />
      <Card>
        <p>Prochaine évolution : écran admin complet pour gérer modules, rôles, utilisateurs, logo et couleurs.</p>
      </Card>
    </div>
  );
}
