"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { Card, Button, Field, Input, Select, Textarea, Section, Badge } from "@/components/Ui";
import {
  Building2, Camera, FileText, Users, Truck, MessageSquare, Smartphone,
  LayoutDashboard, LogOut, Pencil, Trash2, Copy, CalendarDays, Package, HardHat, Euro, ClipboardList, Wrench, Shovel, MapPinned, Image as ImageIcon, Download
} from "lucide-react";

const menu = [
  { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard },
  { id: "projects", title: "Chantiers", icon: Building2 },
  { id: "clients", title: "Clients / CDC", icon: ClipboardList },
  { id: "storekeeper", title: "Magasinier", icon: Package },
  { id: "earthworks", title: "Terrassement", icon: HardHat },
  { id: "planning", title: "Planning", icon: CalendarDays },
  { id: "employees", title: "Salariés", icon: Users },
  { id: "vehicles", title: "Véhicules", icon: Truck },
  { id: "requests", title: "Demandes internes", icon: ClipboardList },
  { id: "mobile", title: "Photos Express", icon: ImageIcon },
  { id: "management", title: "Gestion", icon: Euro },
  { id: "settings", title: "Paramètres", icon: Wrench }
];

const statusLabels: any = { preparation: "À préparer", en_cours: "En cours", termine: "Terminé", archive: "Archivé" };
const statusTone: any = { preparation: "amber", en_cours: "green", termine: "blue", archive: "slate" };

const projectColorPalette = [
  { name: "Bleu", value: "#2563eb" },
  { name: "Bleu foncé", value: "#1e3a8a" },
  { name: "Vert", value: "#16a34a" },
  { name: "Vert forêt", value: "#166534" },
  { name: "Orange", value: "#f97316" },
  { name: "Rouge", value: "#dc2626" },
  { name: "Bordeaux", value: "#991b1b" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Rose", value: "#db2777" },
  { name: "Jaune chantier", value: "#facc15" },
  { name: "Turquoise", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Gris", value: "#64748b" },
  { name: "Anthracite", value: "#0f172a" },
  { name: "Marron", value: "#92400e" }
];


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

function money(v: any) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v || 0));
}

function formatDisplayDate(value: any) {
  if (!value) return "—";
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const text = String(value);
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return text;
}

function formatDisplayRange(start: any, end: any) {
  if (!start && !end) return "—";
  const s = formatDisplayDate(start);
  const e = formatDisplayDate(end || start);
  return e && e !== s ? `${s} → ${e}` : s;
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

function daysBetween(start: string, end: string) {
  if (!start) return 0;
  const s = new Date(start);
  const e = new Date(end || start);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000)) + 1;
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
  const [companyExpenses, setCompanyExpenses] = useState<any[]>([]);
  const [clientPayments, setClientPayments] = useState<any[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [quoteCalculations, setQuoteCalculations] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [pilotageWorkProjects, setPilotageWorkProjects] = useState<any[]>([]);
  const [clientSpecs, setClientSpecs] = useState<any[]>([]);
  const [clientSpecItems, setClientSpecItems] = useState<any[]>([]);
  const [clientSpecPaymentTerms, setClientSpecPaymentTerms] = useState<any[]>([]);
  const [clientPaymentSchedules, setClientPaymentSchedules] = useState<any[]>([]);
  const [clientPaymentScheduleItems, setClientPaymentScheduleItems] = useState<any[]>([]);
  const [dataWarning, setDataWarning] = useState<string>("");
  
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
    const [p, ph, d, e, l, n, v, r, pl, mat, vig, inv, rev, ret, ew, ewph, ewd, ewn, ewm, ewv, ewp, ewr, ewi, ewrev, ewret, ce, cp, si, qc, wpj, wi, cs, csi, csp, cps, cpsi] = await Promise.all([
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
      supabase.from("earthwork_returns").select("*").order("return_date", { ascending: false }),
      supabase.from("company_expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("client_payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("supplier_invoices").select("*").order("invoice_date", { ascending: false }),
      supabase.from("quote_calculations").select("*").order("updated_at", { ascending: false }),
      supabase.from("pilotage_work_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("chantier_work_items").select("*").order("position", { ascending: true }),
      supabase.from("client_specs").select("*").order("created_at", { ascending: false }),
      supabase.from("client_spec_items").select("*").order("position", { ascending: true }),
      supabase.from("client_spec_payment_terms").select("*").order("position", { ascending: true }),
      supabase.from("client_payment_schedules").select("*").order("created_at", { ascending: false }),
      supabase.from("client_payment_schedule_items").select("*").order("position", { ascending: true })
    ]);

    const errors = [p, ph, d, e, l, n, v, r, pl, mat, vig, inv, rev, ret, ew, ewph, ewd, ewn, ewm, ewv, ewp, ewr, ewi, ewrev, ewret, ce, cp, si, wpj, wi].filter((x: any) => x?.error).map((x: any) => x.error.message);
    setDataWarning(errors.length ? errors.join(" | ") : "");

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
    setCompanyExpenses(ce.data || []);
    setClientPayments(cp.data || []);
    setSupplierInvoices(si.data || []);
    setQuoteCalculations(qc.data || []);
    setPilotageWorkProjects(wpj.data || []);
    setWorkItems(wi.data || []);
    setClientSpecs(cs.data || []);
    setClientSpecItems(csi.data || []);
    setClientSpecPaymentTerms(csp.data || []);
    setClientPaymentSchedules(cps.data || []);
    setClientPaymentScheduleItems(cpsi.data || []);
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

  function openModule(id: string) {
    if (["management", "employees"].includes(id)) {
      const label = id === "management" ? "Gestion" : "Salariés";
      const key = id === "management" ? "asb_pin_management" : "asb_pin_employees";
      const expected = localStorage.getItem(key) || "1234";
      const code = prompt(`Code d'accès ${label}`);
      if (code !== expected) {
        alert("Code incorrect");
        return;
      }
    }
    setActive(id);
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
              <button key={m.id} onClick={() => openModule(m.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${active === m.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
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
                    <Button key={m.id} variant={active === m.id ? "primary" : "secondary"} onClick={() => { openModule(m.id); setMobileMenuOpen(false); }}>
                      <Icon size={16} className="mr-2" /> {m.title}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        <section className="p-5 pb-28 lg:p-8">
          {active === "dashboard" && userRole === "admin" && <Dashboard projects={projects} photos={photos} docs={docs} requests={requests} materials={materials} setActive={setActive} />}
          {active === "clients" && userRole === "admin" && <ClientSpecs specs={clientSpecs} items={clientSpecItems} paymentTerms={clientSpecPaymentTerms} paymentSchedules={clientPaymentSchedules} paymentScheduleItems={clientPaymentScheduleItems} projects={projects} refreshAll={refreshAll} />}
          {active === "storekeeper" && userRole === "admin" && <Storekeeper projects={projects} materials={materials} invoices={invoices} returns={returns} refreshAll={refreshAll} />}
          {active === "projects" && <Projects projects={projects} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} invoices={invoices} revenues={revenues} returns={returns} employees={employees} links={links} planning={planning} refreshAll={refreshAll} />}
          {active === "earthworks" && <Earthworks earthworks={earthworks} photos={earthworkPhotos} docs={earthworkDocs} notes={earthworkNotes} materials={earthworkMaterials} vigilance={earthworkVigilance} planning={earthworkPlanning} rentals={earthworkRentals} earthworkInvoices={earthworkInvoices} earthworkRevenues={earthworkRevenues} earthworkReturns={earthworkReturns} refreshAll={refreshAll} />}
          {active === "planning" && <Planning projects={projects} employees={employees} links={links} planning={planning} requests={requests} refreshAll={refreshAll} />}
          {active === "employees" && userRole === "admin" && <Employees employees={employees} projects={projects} refreshAll={refreshAll} />}
          {active === "vehicles" && userRole === "admin" && <Vehicles vehicles={vehicles} refreshAll={refreshAll} />}
          {active === "requests" && userRole === "admin" && <Requests requests={requests} projects={projects} employees={employees} refreshAll={refreshAll} projectName={projectName} />}
          {active === "mobile" && userRole === "admin" && <Mobile projects={projects} refreshAll={refreshAll} />}
          {active === "management" && userRole === "admin" && <Management projects={projects} photos={photos} docs={docs} notes={notes} materials={materials} vigilance={vigilance} employees={employees} planning={planning} invoices={invoices} revenues={revenues} returns={returns} companyExpenses={companyExpenses} clientPayments={clientPayments} supplierInvoices={supplierInvoices} quoteCalculations={quoteCalculations} workItems={workItems} pilotageWorkProjects={pilotageWorkProjects} refreshAll={refreshAll} />}
          {active === "settings" && userRole === "admin" && <AccessSettings session={session} />}
        </section>
      </main>
    </div>
  );
}


function ClientSpecs({ specs, items, paymentTerms = [], paymentSchedules = [], paymentScheduleItems = [], projects, refreshAll }: any) {
  const emptySpec = { title: "", client_name: "", project_id: "", address: "", notes: "", status: "brouillon" };
  const emptyItem = { title: "", supplier: "", reference: "", quantity: 1, unit_price_ht: 0, tva_rate: 20, visual_url: "", notes: "" };
  const emptyTerm = { label: "", percentage: "", amount_ttc: "", due_text: "", notes: "" };
  const [selectedId, setSelectedId] = useState<string>(specs?.[0]?.id || "");
  const [specForm, setSpecForm] = useState<any>(emptySpec);
  const [editSpecForm, setEditSpecForm] = useState<any>(emptySpec);
  const [itemForm, setItemForm] = useState<any>(emptyItem);
  const [editingItemId, setEditingItemId] = useState<string>("");
  const [editingItemForm, setEditingItemForm] = useState<any>(emptyItem);
  const [termForm, setTermForm] = useState<any>(emptyTerm);
  const [editingTermId, setEditingTermId] = useState<string>("");
  const [editingTermForm, setEditingTermForm] = useState<any>(emptyTerm);
  const [saving, setSaving] = useState(false);
  const [clientSubTab, setClientSubTab] = useState<"cdc" | "payments">("cdc");
  const emptySchedule = { title: "", client_name: "", project_id: "", address: "", amount_ttc: "", notes: "", status: "brouillon" };
  const emptyScheduleItem = { label: "", percentage: "", amount_ttc: "", due_date: "", due_text: "", status: "a_encaisser", notes: "" };
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(paymentSchedules?.[0]?.id || "");
  const [scheduleForm, setScheduleForm] = useState<any>(emptySchedule);
  const [editScheduleForm, setEditScheduleForm] = useState<any>(emptySchedule);
  const [scheduleItemForm, setScheduleItemForm] = useState<any>(emptyScheduleItem);
  const [editingScheduleItemId, setEditingScheduleItemId] = useState<string>("");
  const [editingScheduleItemForm, setEditingScheduleItemForm] = useState<any>(emptyScheduleItem);

  useEffect(() => {
    if (!selectedId && specs?.length) setSelectedId(specs[0].id);
  }, [specs, selectedId]);

  useEffect(() => {
    if (!selectedScheduleId && paymentSchedules?.length) setSelectedScheduleId(paymentSchedules[0].id);
  }, [paymentSchedules, selectedScheduleId]);

  const selected = specs.find((s: any) => s.id === selectedId);
  const specItems = items.filter((i: any) => i.spec_id === selectedId).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const selectedPaymentTerms = paymentTerms.filter((t: any) => t.spec_id === selectedId).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const totalHT = specItems.reduce((sum: number, i: any) => sum + (Number(i.quantity || 0) * Number(i.unit_price_ht || 0)), 0);
  const totalTVA = specItems.reduce((sum: number, i: any) => sum + (Number(i.quantity || 0) * Number(i.unit_price_ht || 0) * Number(i.tva_rate || 0) / 100), 0);
  const totalTTC = totalHT + totalTVA;
  const paymentTermsTotal = selectedPaymentTerms.reduce((sum: number, t: any) => sum + Number(t.amount_ttc || 0), 0);
  const selectedSchedule = paymentSchedules.find((s: any) => s.id === selectedScheduleId);
  const scheduleItems = paymentScheduleItems.filter((i: any) => i.schedule_id === selectedScheduleId).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const scheduleItemsTotal = scheduleItems.reduce((sum: number, i: any) => sum + Number(i.amount_ttc || 0), 0);

  useEffect(() => {
    if (selected) setEditSpecForm({
      title: selected.title || "",
      client_name: selected.client_name || "",
      project_id: selected.project_id || "",
      address: selected.address || "",
      notes: selected.notes || "",
      status: selected.status || "brouillon"
    });
  }, [selectedId, selected?.updated_at]);

  useEffect(() => {
    if (selectedSchedule) setEditScheduleForm({
      title: selectedSchedule.title || "",
      client_name: selectedSchedule.client_name || "",
      project_id: selectedSchedule.project_id || "",
      address: selectedSchedule.address || "",
      amount_ttc: selectedSchedule.amount_ttc ?? "",
      notes: selectedSchedule.notes || "",
      status: selectedSchedule.status || "brouillon"
    });
  }, [selectedScheduleId, selectedSchedule?.updated_at]);

  function setupWarning(error: any) {
    if (error?.code === "42P01") {
      alert("Tables manquantes. Lance le fichier supabase/schema-client-specs-v94.sql dans Supabase SQL Editor, puis reviens ici.");
      return true;
    }
    return false;
  }

  async function createSpec(e: any) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...specForm, project_id: specForm.project_id || null, status: specForm.status || "brouillon", updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("client_specs").insert(payload).select("*").single();
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setSpecForm(emptySpec);
    setSelectedId(data.id);
    await refreshAll();
  }

  async function updateSpec(e: any) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const payload = { ...editSpecForm, project_id: editSpecForm.project_id || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("client_specs").update(payload).eq("id", selected.id);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    await refreshAll();
  }

  async function addItem(e: any) {
    e.preventDefault();
    if (!selectedId) return alert("Crée ou sélectionne un cahier des charges client d'abord.");
    setSaving(true);
    let visualUrl = itemForm.visual_url;
    const file = e.currentTarget.visual_file?.files?.[0];
    if (file) {
      try { visualUrl = await uploadFile("client-specs", file); }
      catch (err: any) { alert("Upload visuel impossible : " + err.message); setSaving(false); return; }
    }
    const payload = { ...itemForm, spec_id: selectedId, visual_url: visualUrl, position: specItems.length + 1, quantity: Number(itemForm.quantity || 0), unit_price_ht: Number(itemForm.unit_price_ht || 0), tva_rate: Number(itemForm.tva_rate || 0) };
    const { error } = await supabase.from("client_spec_items").insert(payload);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setItemForm(emptyItem);
    e.currentTarget.reset();
    await refreshAll();
  }

  function startEditItem(i: any) {
    setEditingItemId(i.id);
    setEditingItemForm({
      title: i.title || "",
      supplier: i.supplier || "",
      reference: i.reference || "",
      quantity: i.quantity ?? 1,
      unit_price_ht: i.unit_price_ht ?? 0,
      tva_rate: i.tva_rate ?? 20,
      visual_url: i.visual_url || "",
      notes: i.notes || ""
    });
  }

  async function updateItem(e: any) {
    e.preventDefault();
    if (!editingItemId) return;
    setSaving(true);
    let visualUrl = editingItemForm.visual_url;
    const file = e.currentTarget.visual_file?.files?.[0];
    if (file) {
      try { visualUrl = await uploadFile("client-specs", file); }
      catch (err: any) { alert("Upload visuel impossible : " + err.message); setSaving(false); return; }
    }
    const payload = { ...editingItemForm, visual_url: visualUrl, quantity: Number(editingItemForm.quantity || 0), unit_price_ht: Number(editingItemForm.unit_price_ht || 0), tva_rate: Number(editingItemForm.tva_rate || 0) };
    const { error } = await supabase.from("client_spec_items").update(payload).eq("id", editingItemId);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setEditingItemId("");
    setEditingItemForm(emptyItem);
    await refreshAll();
  }

  async function deleteItem(id: string) {
    if (!confirm("Supprimer cette ligne du cahier des charges ?")) return;
    const { error } = await supabase.from("client_spec_items").delete().eq("id", id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  async function deleteSpec(id: string) {
    if (!confirm("Supprimer définitivement ce cahier des charges client et toutes ses lignes produit ?")) return;
    await supabase.from("client_spec_items").delete().eq("spec_id", id);
    await supabase.from("client_spec_payment_terms").delete().eq("spec_id", id);
    const { error } = await supabase.from("client_specs").delete().eq("id", id);
    if (error) return alert(error.message);
    setSelectedId("");
    await refreshAll();
  }

  async function addPaymentTerm(e: any) {
    e.preventDefault();
    if (!selectedId) return alert("Crée ou sélectionne un cahier des charges client d'abord.");
    const percent = Number(termForm.percentage || 0);
    const amount = termForm.amount_ttc !== "" && termForm.amount_ttc !== null ? Number(termForm.amount_ttc || 0) : (totalTTC * percent / 100);
    setSaving(true);
    const payload = {
      spec_id: selectedId,
      position: selectedPaymentTerms.length + 1,
      label: termForm.label || "Échéance",
      percentage: percent,
      amount_ttc: amount,
      due_text: termForm.due_text || "",
      notes: termForm.notes || ""
    };
    const { error } = await supabase.from("client_spec_payment_terms").insert(payload);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setTermForm(emptyTerm);
    await refreshAll();
  }

  function startEditPaymentTerm(t: any) {
    setEditingTermId(t.id);
    setEditingTermForm({
      label: t.label || "",
      percentage: t.percentage ?? "",
      amount_ttc: t.amount_ttc ?? "",
      due_text: t.due_text || "",
      notes: t.notes || ""
    });
  }

  async function updatePaymentTerm(e: any) {
    e.preventDefault();
    if (!editingTermId) return;
    const percent = Number(editingTermForm.percentage || 0);
    const amount = editingTermForm.amount_ttc !== "" && editingTermForm.amount_ttc !== null ? Number(editingTermForm.amount_ttc || 0) : (totalTTC * percent / 100);
    setSaving(true);
    const payload = {
      label: editingTermForm.label || "Échéance",
      percentage: percent,
      amount_ttc: amount,
      due_text: editingTermForm.due_text || "",
      notes: editingTermForm.notes || ""
    };
    const { error } = await supabase.from("client_spec_payment_terms").update(payload).eq("id", editingTermId);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setEditingTermId("");
    setEditingTermForm(emptyTerm);
    await refreshAll();
  }

  async function deletePaymentTerm(id: string) {
    if (!confirm("Supprimer cette condition de règlement ?")) return;
    const { error } = await supabase.from("client_spec_payment_terms").delete().eq("id", id);
    if (error) return alert(error.message);
    await refreshAll();
  }


  async function createSchedule(e: any) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...scheduleForm, project_id: scheduleForm.project_id || null, amount_ttc: Number(scheduleForm.amount_ttc || 0), status: scheduleForm.status || "brouillon", updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("client_payment_schedules").insert(payload).select("*").single();
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setScheduleForm(emptySchedule);
    setSelectedScheduleId(data.id);
    await refreshAll();
  }

  async function updateSchedule(e: any) {
    e.preventDefault();
    if (!selectedSchedule) return;
    setSaving(true);
    const payload = { ...editScheduleForm, project_id: editScheduleForm.project_id || null, amount_ttc: Number(editScheduleForm.amount_ttc || 0), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("client_payment_schedules").update(payload).eq("id", selectedSchedule.id);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    await refreshAll();
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Supprimer définitivement ce planning de règlement ?")) return;
    await supabase.from("client_payment_schedule_items").delete().eq("schedule_id", id);
    const { error } = await supabase.from("client_payment_schedules").delete().eq("id", id);
    if (error) return alert(error.message);
    setSelectedScheduleId("");
    await refreshAll();
  }

  async function addScheduleItem(e: any) {
    e.preventDefault();
    if (!selectedScheduleId) return alert("Crée ou sélectionne un planning de règlement d'abord.");
    const base = Number(selectedSchedule?.amount_ttc || 0);
    const percent = Number(scheduleItemForm.percentage || 0);
    const amount = scheduleItemForm.amount_ttc !== "" && scheduleItemForm.amount_ttc !== null ? Number(scheduleItemForm.amount_ttc || 0) : (base * percent / 100);
    setSaving(true);
    const payload = { schedule_id: selectedScheduleId, position: scheduleItems.length + 1, label: scheduleItemForm.label || "Échéance", percentage: percent, amount_ttc: amount, due_date: scheduleItemForm.due_date || null, due_text: scheduleItemForm.due_text || "", status: scheduleItemForm.status || "a_encaisser", notes: scheduleItemForm.notes || "" };
    const { error } = await supabase.from("client_payment_schedule_items").insert(payload);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setScheduleItemForm(emptyScheduleItem);
    await refreshAll();
  }

  function startEditScheduleItem(item: any) {
    setEditingScheduleItemId(item.id);
    setEditingScheduleItemForm({
      label: item.label || "",
      percentage: item.percentage ?? "",
      amount_ttc: item.amount_ttc ?? "",
      due_date: item.due_date || "",
      due_text: item.due_text || "",
      status: item.status || "a_encaisser",
      notes: item.notes || ""
    });
  }

  async function updateScheduleItem(e: any) {
    e.preventDefault();
    if (!editingScheduleItemId) return;
    const base = Number(selectedSchedule?.amount_ttc || 0);
    const percent = Number(editingScheduleItemForm.percentage || 0);
    const amount = editingScheduleItemForm.amount_ttc !== "" && editingScheduleItemForm.amount_ttc !== null ? Number(editingScheduleItemForm.amount_ttc || 0) : (base * percent / 100);
    setSaving(true);
    const payload = {
      label: editingScheduleItemForm.label || "Échéance",
      percentage: percent,
      amount_ttc: amount,
      due_date: editingScheduleItemForm.due_date || null,
      due_text: editingScheduleItemForm.due_text || "",
      status: editingScheduleItemForm.status || "a_encaisser",
      notes: editingScheduleItemForm.notes || ""
    };
    const { error } = await supabase.from("client_payment_schedule_items").update(payload).eq("id", editingScheduleItemId);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    setEditingScheduleItemId("");
    setEditingScheduleItemForm(emptyScheduleItem);
    await refreshAll();
  }

  async function duplicateScheduleItem(item: any) {
    if (!selectedScheduleId) return;
    const payload = {
      schedule_id: selectedScheduleId,
      position: scheduleItems.length + 1,
      label: `${item.label || "Échéance"} - copie`,
      percentage: Number(item.percentage || 0),
      amount_ttc: Number(item.amount_ttc || 0),
      due_date: item.due_date || null,
      due_text: item.due_text || "",
      status: item.status || "a_encaisser",
      notes: item.notes || ""
    };
    setSaving(true);
    const { error } = await supabase.from("client_payment_schedule_items").insert(payload);
    setSaving(false);
    if (error) { if (!setupWarning(error)) alert(error.message); return; }
    await refreshAll();
  }

  async function deleteScheduleItem(id: string) {
    if (!confirm("Supprimer cette échéance ?")) return;
    const { error } = await supabase.from("client_payment_schedule_items").delete().eq("id", id);
    if (error) return alert(error.message);
    if (editingScheduleItemId === id) {
      setEditingScheduleItemId("");
      setEditingScheduleItemForm(emptyScheduleItem);
    }
    await refreshAll();
  }

  function exportSchedulePdf() {
    if (!selectedSchedule) return alert("Sélectionne un planning de règlement.");
    const rows = scheduleItems.map((i: any) => `<tr><td><b>${i.label || "Échéance"}</b><br/><span>${i.notes || ""}</span></td><td>${i.due_date ? formatDisplayDate(i.due_date) : (i.due_text || "À définir")}</td><td class="num">${Number(i.percentage || 0)}%</td><td class="num"><b>${money(i.amount_ttc || 0)}</b></td><td>${i.status === "encaisse" ? "Encaissé" : i.status === "a_relancer" ? "À relancer" : "À encaisser"}</td></tr>`).join("");
    const amountTtc = Number(selectedSchedule.amount_ttc || 0);
    const amountHt = amountTtc / 1.2;
    const amountTva = amountTtc - amountHt;
    const conditionsReglement = `
      <section class="conditions">
        <h2>Conditions de règlement</h2>
        <p>Le prix est payable par le client à réception des factures émises conformément au présent échéancier de paiement. Les montants indiqués sont facturés en incluant la TVA applicable au taux en vigueur à la date de facturation.</p>
        <p>La facturation sera établie mensuellement, en fonction de l'avancement des travaux et de la livraison des fournitures. Le solde sera facturé à la fin des prestations.</p>
        <h3>Défaut de paiement dans les délais</h3>
        <p>Tout retard de paiement sera considéré comme un défaut de paiement. Le règlement de l'ensemble des factures, même non échues, deviendra immédiatement exigible.</p>
        <p>Le prestataire sera en droit, sans mise en demeure préalable, d'obtenir le paiement d'intérêts moratoires par jour calendaire de retard, sur la base de trois (3) fois le taux d'intérêt légal en vigueur.</p>
        <p>Une indemnité forfaitaire pour frais de recouvrement d'un montant de 40 euros pourra être appliquée, majorée des frais réels de recouvrement si le client est un professionnel.</p>
        <p>À compter de l'arrêt des prestations, les risques afférents aux matériaux et matériels présents sur le chantier, aux travaux déjà effectués ainsi que la garde du chantier sont transférés au client jusqu'à la reprise des prestations. Toute reprise des prestations sera subordonnée à la reprise des paiements.</p>
        <p>Le prestataire pourra récupérer tout matériau livré sur le chantier et non incorporé à l'ouvrage, ces matériaux appartenant au prestataire jusqu'au paiement intégral du prix, intérêts et frais.</p>
        <p>En cas de multiplicité de contrats entre le client et le prestataire, il ne pourra y avoir aucune compensation de créances sans accord écrit préalable.</p>
      </section>`;
    const signatures = `
      <section class="signaturePage">
        <h2>Acceptation du planning de règlement</h2>
        <p>Le client reconnaît avoir pris connaissance du présent échéancier ainsi que des conditions de règlement ci-dessus et les accepter sans réserve.</p>
        <div class="signatures">
          <div class="signatureBox">
            <h3>Société ASB</h3>
            <p>Nom : ______________________________</p>
            <p>Fonction : __________________________</p>
            <p>Date : ____ / ____ / ______</p>
            <div class="largeSign">Signature et cachet</div>
          </div>
          <div class="signatureBox">
            <h3>Client</h3>
            <p>Nom : ______________________________</p>
            <p>Mention : Bon pour accord</p>
            <p>Date : ____ / ____ / ______</p>
            <div class="largeSign">Signature précédée de la mention<br/>« Bon pour accord »</div>
          </div>
        </div>
      </section>`;
    const html = `<html><head><title>Planning de règlement - ${selectedSchedule.title}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0f172a;margin:0;background:white}.hero{display:flex;justify-content:space-between;gap:20px;border-radius:28px;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:24px}.logo{height:75px;background:white;border-radius:18px;padding:10px}.title{font-size:32px;font-weight:900;margin:6px 0}.meta{color:#cbd5e1;line-height:1.55}.ref{margin-top:10px;display:inline-block;border-radius:999px;background:rgba(255,255,255,.12);padding:6px 10px;color:#fdba74;font-size:11px;font-weight:900;text-transform:uppercase}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.card{border:1px solid #e2e8f0;border-radius:22px;padding:15px;background:#f8fafc}.card b{font-size:11px;text-transform:uppercase;color:#64748b}.value{font-size:25px;font-weight:900;margin-top:6px}table{width:100%;border-collapse:separate;border-spacing:0 10px;margin-top:18px;font-size:12px}th{text-align:left;background:#0f172a;color:white;padding:10px}td{background:#f8fafc;border:1px solid #e2e8f0;border-left:0;border-right:0;padding:12px;vertical-align:top}td:first-child{border-left:1px solid #e2e8f0;border-radius:16px 0 0 16px}td:last-child{border-right:1px solid #e2e8f0;border-radius:0 16px 16px 0}.num{text-align:right;white-space:nowrap}.conditions{margin-top:22px;border:1px solid #e2e8f0;border-left:8px solid #f97316;border-radius:22px;background:#f8fafc;padding:18px;page-break-inside:avoid}.conditions h2{margin:0 0 8px;font-size:20px}.conditions h3{margin:14px 0 6px;font-size:15px}.conditions p{margin:7px 0;font-size:11.5px;line-height:1.45;color:#334155}.signaturePage{margin-top:28px;page-break-inside:avoid}.signaturePage h2{font-size:22px;margin-bottom:8px}.signaturePage>p{font-size:13px;color:#475569}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:18px}.signatureBox{min-height:230px;border:1px solid #cbd5e1;border-radius:22px;padding:18px;background:white}.signatureBox h3{margin:0 0 14px;font-size:18px}.signatureBox p{font-size:13px;margin:10px 0}.largeSign{height:105px;margin-top:18px;border:1px dashed #94a3b8;border-radius:16px;display:flex;align-items:center;justify-content:center;text-align:center;color:#64748b;font-weight:800}.footer{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}@media print{.signaturePage{page-break-before:auto}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="hero"><div><div style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#fdba74;font-weight:900">Planning de règlement contractuel</div><div class="title">${selectedSchedule.title || "Échéancier client"}</div><div class="meta"><b>${selectedSchedule.client_name || "Client"}</b> · ${selectedSchedule.address || "Adresse non renseignée"}<br/>Date d'édition : ${formatDisplayDate(new Date())}<br/>Référence document : ASB-REG-${String(selectedSchedule.id || "").slice(0, 8).toUpperCase()}</div><div class="ref">Document indépendant Clients / CDC</div></div><img src="/logo-asb.png" class="logo"/></div><div class="cards"><div class="card"><b>Total HT estimé</b><div class="value">${money(amountHt)}</div></div><div class="card"><b>TVA estimée</b><div class="value">${money(amountTva)}</div></div><div class="card"><b>Montant devis TTC</b><div class="value">${money(amountTtc)}</div></div></div><div class="cards"><div class="card"><b>Total échéancier</b><div class="value">${money(scheduleItemsTotal)}</div></div><div class="card"><b>Reste à planifier</b><div class="value">${money(amountTtc - scheduleItemsTotal)}</div></div><div class="card"><b>Statut</b><div class="value">${selectedSchedule.status || "Brouillon"}</div></div></div>${selectedSchedule.notes ? `<p><b>Observations :</b><br/>${selectedSchedule.notes}</p>` : ""}<table><thead><tr><th>Désignation</th><th>Échéance</th><th class="num">%</th><th class="num">Montant TTC</th><th>Statut</th></tr></thead><tbody>${rows || `<tr><td colspan="5">Aucune échéance.</td></tr>`}</tbody></table>${conditionsReglement}${signatures}<div class="footer"><span>ASB — Planning de règlement</span><span>Document généré le ${formatDisplayDate(new Date())}</span></div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Popup bloquée. Autorise les popups pour générer le PDF.");
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
  }

  function exportScheduleExcel() {
    if (!selectedSchedule) return alert("Sélectionne un planning de règlement.");
    const rows = scheduleItems.map((i: any) => `<tr><td>${i.label || ""}</td><td>${i.due_date || i.due_text || ""}</td><td>${Number(i.percentage || 0)}</td><td>${Number(i.amount_ttc || 0)}</td><td>${i.status || ""}</td><td>${i.notes || ""}</td></tr>`).join("");
    const html = `<table><tr><th colspan="6">Planning de règlement ASB - ${selectedSchedule.title || ""}</th></tr><tr><td>Client</td><td colspan="5">${selectedSchedule.client_name || ""}</td></tr><tr><td>Adresse</td><td colspan="5">${selectedSchedule.address || ""}</td></tr><tr><td>Montant devis TTC</td><td colspan="5">${Number(selectedSchedule.amount_ttc || 0)}</td></tr><tr><th>Désignation</th><th>Échéance</th><th>%</th><th>Montant TTC</th><th>Statut</th><th>Notes</th></tr>${rows}</table>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planning-reglement-asb-${(selectedSchedule.title || "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xls`;
    a.click();
  }

  function exportPdf() {
    if (!selected) return alert("Sélectionne un cahier des charges.");
    const rows = specItems.map((i: any) => {
      const lineHT = Number(i.quantity || 0) * Number(i.unit_price_ht || 0);
      const visual = i.visual_url ? `<img src="${i.visual_url}" class="visual"/>` : `<div class="empty">Visuel</div>`;
      return `<tr><td>${visual}</td><td><b>${i.title || "Produit"}</b><br/><span>${i.notes || ""}</span></td><td>${i.supplier || ""}</td><td>${i.reference || ""}</td><td class="num">${i.quantity || 0}</td><td class="num">${money(Number(i.unit_price_ht || 0))}</td><td class="num">${i.tva_rate || 0}%</td><td class="num"><b>${money(lineHT)}</b></td></tr>`;
    }).join("");
    const paymentRows = selectedPaymentTerms.map((t: any) => `<tr><td><b>${t.label || "Échéance"}</b><br/><span>${t.notes || ""}</span></td><td>${t.due_text || "À définir"}</td><td class="num">${Number(t.percentage || 0)}%</td><td class="num"><b>${money(t.amount_ttc || 0)}</b></td></tr>`).join("");
    const paymentSection = paymentRows ? `<div class="payment"><h2>Conditions de règlement</h2><p>Échéancier proposé au client pour validation du chiffrage.</p><table><thead><tr><th>Étape</th><th>Échéance</th><th class="num">%</th><th class="num">Montant TTC</th></tr></thead><tbody>${paymentRows}</tbody></table></div>` : "";
    const html = `<html><head><title>Cahier des charges - ${selected.title}</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#e5e7eb;color:#0f172a;margin:0}.page{max-width:1100px;margin:auto;background:white;padding:30px}.hero{display:flex;justify-content:space-between;gap:18px;border-radius:28px;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:24px}.logo{height:78px;background:white;border-radius:18px;padding:10px}.kicker{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#cbd5e1;font-weight:900}.title{font-size:34px;font-weight:900;margin:6px 0 0;letter-spacing:-.04em}.meta{margin-top:14px;color:#cbd5e1}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.card{border:1px solid #e2e8f0;border-radius:22px;padding:15px;background:#f8fafc}.card b{font-size:11px;text-transform:uppercase;color:#64748b}.value{font-size:25px;font-weight:900;margin-top:6px}table{width:100%;border-collapse:separate;border-spacing:0 10px;margin-top:18px;font-size:12px}th{text-align:left;background:#0f172a;color:white;padding:10px}td{background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:10px;vertical-align:middle}td:first-child{border-left:1px solid #e2e8f0;border-radius:16px 0 0 16px}td:last-child{border-right:1px solid #e2e8f0;border-radius:0 16px 16px 0}.visual{width:92px;height:70px;object-fit:cover;border-radius:14px}.empty{width:92px;height:70px;border-radius:14px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:900}.num{text-align:right;white-space:nowrap}.footer{margin-top:20px;font-size:11px;color:#64748b}.notes{margin-top:18px;border-left:8px solid #f97316;background:#fff7ed;border-radius:20px;padding:14px}.payment{margin-top:18px;border:1px solid #fed7aa;background:#fff7ed;border-radius:24px;padding:16px}.payment h2{margin:0;font-size:20px}.payment p{margin:6px 0 0;color:#64748b;font-size:12px}@media print{body{background:white}.page{padding:0}}</style></head><body><div class="page"><div class="hero"><div><div class="kicker">Cahier des charges client</div><div class="title">${selected.title || "Sélection matériaux"}</div><div class="meta"><b>${selected.client_name || "Client"}</b> · ${selected.address || ""}<br/>Document de chiffrage · ${formatDisplayDate(new Date())}</div></div><img src="/logo-asb.png" class="logo"/></div><div class="cards"><div class="card"><b>Total HT</b><div class="value">${money(totalHT)}</div></div><div class="card"><b>TVA estimée</b><div class="value">${money(totalTVA)}</div></div><div class="card"><b>Total TTC</b><div class="value">${money(totalTTC)}</div></div></div>${selected.notes ? `<div class="notes"><b>Notes client / choix techniques</b><br/>${selected.notes}</div>` : ""}<table><thead><tr><th>Visuel</th><th>Désignation</th><th>Fournisseur</th><th>Référence</th><th class="num">Qté</th><th class="num">PU HT</th><th class="num">TVA</th><th class="num">Total HT</th></tr></thead><tbody>${rows || `<tr><td colspan="8">Aucune ligne produit.</td></tr>`}</tbody></table>${paymentSection}<p class="footer">ASB — document de préparation chiffrage. Les prix et disponibilités fournisseurs sont à vérifier avant commande.</p></div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Popup bloquée. Autorise les popups pour générer le PDF.");
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
  }

  function exportExcel() {
    if (!selected) return alert("Sélectionne un cahier des charges.");
    const rows = specItems.map((i: any) => `<tr><td>${i.title || ""}</td><td>${i.supplier || ""}</td><td>${i.reference || ""}</td><td>${i.quantity || 0}</td><td>${Number(i.unit_price_ht || 0)}</td><td>${i.tva_rate || 0}</td><td>${Number(i.quantity || 0) * Number(i.unit_price_ht || 0)}</td><td>${i.visual_url || ""}</td><td>${i.notes || ""}</td></tr>`).join("");
    const paymentRows = selectedPaymentTerms.map((t: any) => `<tr><td>${t.label || ""}</td><td>${t.due_text || ""}</td><td>${Number(t.percentage || 0)}</td><td>${Number(t.amount_ttc || 0)}</td><td>${t.notes || ""}</td></tr>`).join("");
    const html = `<table><tr><th colspan="9">Cahier des charges client ASB - ${selected.title || ""}</th></tr><tr><td>Client</td><td colspan="8">${selected.client_name || ""}</td></tr><tr><td>Adresse</td><td colspan="8">${selected.address || ""}</td></tr><tr><th>Désignation</th><th>Fournisseur</th><th>Référence</th><th>Quantité</th><th>PU HT</th><th>TVA %</th><th>Total HT</th><th>Visuel</th><th>Notes</th></tr>${rows}<tr><td colspan="6"><b>Total HT</b></td><td><b>${totalHT}</b></td></tr><tr><td colspan="6"><b>Total TVA</b></td><td><b>${totalTVA}</b></td></tr><tr><td colspan="6"><b>Total TTC</b></td><td><b>${totalTTC}</b></td></tr></table><br/><table><tr><th colspan="5">Conditions de règlement</th></tr><tr><th>Étape</th><th>Échéance</th><th>%</th><th>Montant TTC</th><th>Notes</th></tr>${paymentRows}</table>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cahier-des-charges-asb-${(selected.title || "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xls`;
    a.click();
  }

  return <div>
    <Section title="Clients / CDC" subtitle="Deux documents séparés : cahier des charges produit et planning de règlement indépendant." />
    <div className="mb-5 flex flex-wrap gap-2">
      <Button type="button" variant={clientSubTab === "cdc" ? "primary" : "secondary"} onClick={() => setClientSubTab("cdc")}>Cahiers des charges</Button>
      <Button type="button" variant={clientSubTab === "payments" ? "primary" : "secondary"} onClick={() => setClientSubTab("payments")}>Planning de règlement</Button>
    </div>
    {clientSubTab === "payments" ? (
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <Card className="border-l-8 border-blue-600">
            <h3 className="text-xl font-black">Créer un planning de règlement</h3>
            <form onSubmit={createSchedule} className="mt-4 space-y-3">
              <Field label="Titre"><Input required value={scheduleForm.title} onChange={(e: any) => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="Échéancier devis Mme Dupont" /></Field>
              <Field label="Client"><Input value={scheduleForm.client_name} onChange={(e: any) => setScheduleForm({ ...scheduleForm, client_name: e.target.value })} /></Field>
              <Field label="Chantier lié"><Select value={scheduleForm.project_id} onChange={(e: any) => setScheduleForm({ ...scheduleForm, project_id: e.target.value })}><option value="">Aucun</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
              <Field label="Adresse"><Input value={scheduleForm.address} onChange={(e: any) => setScheduleForm({ ...scheduleForm, address: e.target.value })} /></Field>
              <Field label="Montant devis TTC"><Input type="number" step="0.01" value={scheduleForm.amount_ttc} onChange={(e: any) => setScheduleForm({ ...scheduleForm, amount_ttc: e.target.value })} /></Field>
              <Field label="Statut"><Select value={scheduleForm.status || "brouillon"} onChange={(e: any) => setScheduleForm({ ...scheduleForm, status: e.target.value })}><option value="brouillon">Brouillon</option><option value="valide">Validé</option><option value="signe">Signé</option></Select></Field>
              <Field label="Conditions générales"><Textarea value={scheduleForm.notes} onChange={(e: any) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Ex : règlement par virement, échéances selon avancement chantier..." /></Field>
              <Button disabled={saving} className="w-full">Créer le planning</Button>
            </form>
          </Card>
          <Card>
            <h3 className="mb-3 text-xl font-black">Plannings de règlement</h3>
            <div className="space-y-2">
              {paymentSchedules.map((s: any) => <button key={s.id} onClick={() => setSelectedScheduleId(s.id)} className={`w-full rounded-2xl border p-3 text-left ${selectedScheduleId === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-900"}`}><b>{s.title}</b><br/><span className="text-xs opacity-75">{s.client_name || "Client non renseigné"} · {money(s.amount_ttc || 0)}</span></button>)}
              {paymentSchedules.length === 0 && <p className="text-sm text-slate-500">Aucun planning de règlement pour le moment.</p>}
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          {selectedSchedule ? <>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 to-blue-900 text-white shadow-xl">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Planning de règlement indépendant</p><h2 className="mt-2 text-3xl font-black">{selectedSchedule.title}</h2><p className="mt-2 text-sm text-slate-300">{selectedSchedule.client_name || "Client"} · {selectedSchedule.address || "Adresse non renseignée"}</p><span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-orange-200">{selectedSchedule.status || "brouillon"}</span></div><img src="/logo-asb.png" className="h-20 w-fit rounded-2xl bg-white p-2" /></div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-slate-900"><div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Devis TTC</p><p className="text-2xl font-black">{money(selectedSchedule.amount_ttc || 0)}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Échéancier</p><p className="text-2xl font-black">{money(scheduleItemsTotal)}</p></div><div className="rounded-2xl bg-orange-400 p-4"><p className="text-xs font-black uppercase text-orange-950">Reste</p><p className="text-2xl font-black">{money(Number(selectedSchedule.amount_ttc || 0) - scheduleItemsTotal)}</p></div></div>
              <div className="mt-5 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={exportSchedulePdf}><Download size={16} className="mr-2"/> Export PDF</Button><Button type="button" variant="amber" onClick={exportScheduleExcel}><Download size={16} className="mr-2"/> Export Excel</Button><Button type="button" variant="danger" onClick={() => deleteSchedule(selectedSchedule.id)}>Supprimer planning</Button></div>
            </Card>
            <Card className="border-l-8 border-orange-400"><h3 className="text-xl font-black">Modifier le planning</h3><form onSubmit={updateSchedule} className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Titre"><Input required value={editScheduleForm.title} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, title: e.target.value })} /></Field><Field label="Client"><Input value={editScheduleForm.client_name} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, client_name: e.target.value })} /></Field><Field label="Chantier lié"><Select value={editScheduleForm.project_id} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, project_id: e.target.value })}><option value="">Aucun</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Field label="Montant devis TTC"><Input type="number" step="0.01" value={editScheduleForm.amount_ttc} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, amount_ttc: e.target.value })} /></Field><Field label="Adresse"><Input value={editScheduleForm.address} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, address: e.target.value })} /></Field><Field label="Statut"><Select value={editScheduleForm.status || "brouillon"} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, status: e.target.value })}><option value="brouillon">Brouillon</option><option value="valide">Validé</option><option value="signe">Signé</option></Select></Field><Field label="Conditions générales"><Textarea value={editScheduleForm.notes} onChange={(e: any) => setEditScheduleForm({ ...editScheduleForm, notes: e.target.value })} /></Field><div className="md:col-span-2"><Button disabled={saving} variant="amber">Enregistrer</Button></div></form></Card>
            <Card><h3 className="text-xl font-black">Ajouter une échéance</h3><form onSubmit={addScheduleItem} className="mt-4 grid gap-3 md:grid-cols-6"><Field label="Désignation"><Input required value={scheduleItemForm.label} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, label: e.target.value })} placeholder="Acompte commande" /></Field><Field label="%"><Input type="number" step="0.01" value={scheduleItemForm.percentage} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, percentage: e.target.value })} /></Field><Field label="Montant TTC"><Input type="number" step="0.01" value={scheduleItemForm.amount_ttc} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, amount_ttc: e.target.value })} placeholder="Auto si %" /></Field><Field label="Date prévue"><Input type="date" value={scheduleItemForm.due_date} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, due_date: e.target.value })} /></Field><Field label="Échéance texte"><Input value={scheduleItemForm.due_text} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, due_text: e.target.value })} placeholder="À signature" /></Field><Field label="Statut"><Select value={scheduleItemForm.status} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, status: e.target.value })}><option value="a_encaisser">À encaisser</option><option value="encaisse">Encaissé</option><option value="a_relancer">À relancer</option></Select></Field><Field label="Notes"><Input value={scheduleItemForm.notes} onChange={(e: any) => setScheduleItemForm({ ...scheduleItemForm, notes: e.target.value })} /></Field><div className="md:col-span-6"><Button disabled={saving}>+ Ajouter l’échéance</Button></div></form></Card>
            {editingScheduleItemId && <Card className="border-l-8 border-orange-400"><h3 className="text-xl font-black">Modifier l’échéance</h3><form onSubmit={updateScheduleItem} className="mt-4 grid gap-3 md:grid-cols-6"><Field label="Désignation"><Input required value={editingScheduleItemForm.label} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, label: e.target.value })} /></Field><Field label="%"><Input type="number" step="0.01" value={editingScheduleItemForm.percentage} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, percentage: e.target.value })} /></Field><Field label="Montant TTC"><Input type="number" step="0.01" value={editingScheduleItemForm.amount_ttc} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, amount_ttc: e.target.value })} placeholder="Auto si %" /></Field><Field label="Date prévue"><Input type="date" value={editingScheduleItemForm.due_date} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, due_date: e.target.value })} /></Field><Field label="Échéance texte"><Input value={editingScheduleItemForm.due_text} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, due_text: e.target.value })} placeholder="À signature" /></Field><Field label="Statut"><Select value={editingScheduleItemForm.status} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, status: e.target.value })}><option value="a_encaisser">À encaisser</option><option value="encaisse">Encaissé</option><option value="a_relancer">À relancer</option></Select></Field><Field label="Notes"><Input value={editingScheduleItemForm.notes} onChange={(e: any) => setEditingScheduleItemForm({ ...editingScheduleItemForm, notes: e.target.value })} /></Field><div className="md:col-span-6 flex flex-wrap gap-2"><Button disabled={saving} variant="amber"><Pencil size={16} className="mr-2 inline"/> Enregistrer la modification</Button><Button type="button" variant="secondary" onClick={() => { setEditingScheduleItemId(""); setEditingScheduleItemForm(emptyScheduleItem); }}>Annuler</Button></div></form></Card>}
            <Card><h3 className="mb-4 text-xl font-black">Échéancier client</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="p-3">Désignation</th><th className="p-3">Échéance</th><th className="p-3 text-right">%</th><th className="p-3 text-right">Montant TTC</th><th className="p-3">Statut</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{scheduleItems.map((i: any) => <tr key={i.id} className="border-b"><td className="p-3 font-bold">{i.label}</td><td className="p-3">{i.due_date ? formatDisplayDate(i.due_date) : (i.due_text || "—")}</td><td className="p-3 text-right">{Number(i.percentage || 0)}%</td><td className="p-3 text-right font-black">{money(i.amount_ttc || 0)}</td><td className="p-3"><Badge tone={i.status === "encaisse" ? "green" : i.status === "a_relancer" ? "amber" : "blue"}>{i.status === "encaisse" ? "Encaissé" : i.status === "a_relancer" ? "À relancer" : "À encaisser"}</Badge></td><td className="p-3 text-right"><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => duplicateScheduleItem(i)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black text-blue-600 hover:bg-blue-50"><Copy size={17}/> Dupliquer</button><button type="button" onClick={() => startEditScheduleItem(i)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black text-orange-500 hover:bg-orange-50"><Pencil size={17}/> Modifier</button><button type="button" onClick={() => deleteScheduleItem(i.id)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black text-red-600 hover:bg-red-50"><Trash2 size={17}/> Supprimer</button></div></td></tr>)}{scheduleItems.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucune échéance.</td></tr>}</tbody><tfoot>{scheduleItems.length > 0 && <tr className="font-black"><td className="p-3 text-slate-500" colSpan={2}>Total</td><td className="p-3 text-right">{scheduleItems.reduce((sum: number, i: any) => sum + Number(i.percentage || 0), 0)}%</td><td className="p-3 text-right">{money(scheduleItemsTotal)} TTC</td><td className="p-3" colSpan={2}></td></tr>}</tfoot></table></div>{scheduleItems.length > 0 && <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Le total des échéances est de {scheduleItems.reduce((sum: number, i: any) => sum + Number(i.percentage || 0), 0)}%. Le solde restant sera facturé à la fin des prestations.</div>}</Card>
          </> : <Card><p className="text-sm text-slate-500">Crée ou sélectionne un planning de règlement pour commencer.</p></Card>}
        </div>
      </div>
    ) : (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="space-y-5">
        <Card className="border-l-8 border-slate-900">
          <h3 className="text-xl font-black">Créer un cahier des charges</h3>
          <form onSubmit={createSpec} className="mt-4 space-y-3">
            <Field label="Titre"><Input required value={specForm.title} onChange={(e: any) => setSpecForm({ ...specForm, title: e.target.value })} placeholder="Salle de bains Mme Dupont" /></Field>
            <Field label="Client"><Input value={specForm.client_name} onChange={(e: any) => setSpecForm({ ...specForm, client_name: e.target.value })} /></Field>
            <Field label="Chantier lié"><Select value={specForm.project_id} onChange={(e: any) => setSpecForm({ ...specForm, project_id: e.target.value })}><option value="">Aucun</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Adresse"><Input value={specForm.address} onChange={(e: any) => setSpecForm({ ...specForm, address: e.target.value })} /></Field>
            <Field label="Statut"><Select value={specForm.status || "brouillon"} onChange={(e: any) => setSpecForm({ ...specForm, status: e.target.value })}><option value="brouillon">Brouillon</option><option value="valide">Validé</option><option value="commande">Commandé</option></Select></Field>
            <Field label="Notes"><Textarea value={specForm.notes} onChange={(e: any) => setSpecForm({ ...specForm, notes: e.target.value })} placeholder="Choix client, gamme souhaitée, contraintes..." /></Field>
            <Button disabled={saving} className="w-full">Créer</Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-3 text-xl font-black">Documents clients</h3>
          <div className="space-y-2">
            {specs.map((s: any) => <button key={s.id} onClick={() => setSelectedId(s.id)} className={`w-full rounded-2xl border p-3 text-left ${selectedId === s.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-900"}`}><b>{s.title}</b><br/><span className="text-xs opacity-75">{s.client_name || "Client non renseigné"} · {formatDisplayDate(s.created_at)}</span></button>)}
            {specs.length === 0 && <p className="text-sm text-slate-500">Aucun cahier des charges pour le moment.</p>}
          </div>
        </Card>
      </div>
      <div className="space-y-5">
        {selected ? <>
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 to-slate-800 text-white shadow-xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Cahier des charges client</p><h2 className="mt-2 text-3xl font-black">{selected.title}</h2><p className="mt-2 text-sm text-slate-300">{selected.client_name || "Client"} · {selected.address || "Adresse non renseignée"}</p><span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-orange-200">{selected.status || "brouillon"}</span></div>
              <img src="/logo-asb.png" className="h-20 w-fit rounded-2xl bg-white p-2" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-slate-900">
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Total HT</p><p className="text-2xl font-black">{money(totalHT)}</p></div>
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">TVA</p><p className="text-2xl font-black">{money(totalTVA)}</p></div>
              <div className="rounded-2xl bg-orange-400 p-4"><p className="text-xs font-black uppercase text-orange-950">Total TTC</p><p className="text-2xl font-black">{money(totalTTC)}</p></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={exportPdf}><Download size={16} className="mr-2"/> Export PDF</Button><Button type="button" variant="amber" onClick={exportExcel}><Download size={16} className="mr-2"/> Export Excel</Button><Button type="button" variant="danger" onClick={() => deleteSpec(selected.id)}>Supprimer client / CDC</Button></div>
          </Card>

          <Card className="border-l-8 border-orange-400">
            <h3 className="text-xl font-black">Modifier le cahier client</h3>
            <form onSubmit={updateSpec} className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Titre"><Input required value={editSpecForm.title} onChange={(e: any) => setEditSpecForm({ ...editSpecForm, title: e.target.value })} /></Field>
              <Field label="Client"><Input value={editSpecForm.client_name} onChange={(e: any) => setEditSpecForm({ ...editSpecForm, client_name: e.target.value })} /></Field>
              <Field label="Chantier lié"><Select value={editSpecForm.project_id} onChange={(e: any) => setEditSpecForm({ ...editSpecForm, project_id: e.target.value })}><option value="">Aucun</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
              <Field label="Statut"><Select value={editSpecForm.status || "brouillon"} onChange={(e: any) => setEditSpecForm({ ...editSpecForm, status: e.target.value })}><option value="brouillon">Brouillon</option><option value="valide">Validé</option><option value="commande">Commandé</option></Select></Field>
              <Field label="Adresse"><Input value={editSpecForm.address} onChange={(e: any) => setEditSpecForm({ ...editSpecForm, address: e.target.value })} /></Field>
              <Field label="Notes"><Textarea value={editSpecForm.notes} onChange={(e: any) => setEditSpecForm({ ...editSpecForm, notes: e.target.value })} /></Field>
              <div className="md:col-span-2"><Button disabled={saving} variant="amber">Enregistrer les modifications client</Button></div>
            </form>
          </Card>

          <Card className="border-l-8 border-blue-500">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-black">Conditions de règlement</h3>
                <p className="text-sm text-slate-500">Crée un échéancier clair pour le client : acompte, démarrage, avancement, solde.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right text-blue-900">
                <p className="text-xs font-black uppercase">Total échéancier</p>
                <p className="text-xl font-black">{money(paymentTermsTotal)}</p>
              </div>
            </div>
            <form onSubmit={addPaymentTerm} className="mt-4 grid gap-3 md:grid-cols-5">
              <Field label="Étape"><Input required value={termForm.label} onChange={(e: any) => setTermForm({ ...termForm, label: e.target.value })} placeholder="Acompte commande" /></Field>
              <Field label="Échéance"><Input value={termForm.due_text} onChange={(e: any) => setTermForm({ ...termForm, due_text: e.target.value })} placeholder="À signature / fin de chantier" /></Field>
              <Field label="%"><Input type="number" step="0.01" value={termForm.percentage} onChange={(e: any) => setTermForm({ ...termForm, percentage: e.target.value })} placeholder="30" /></Field>
              <Field label="Montant TTC"><Input type="number" step="0.01" value={termForm.amount_ttc} onChange={(e: any) => setTermForm({ ...termForm, amount_ttc: e.target.value })} placeholder="Auto si %" /></Field>
              <Field label="Notes"><Input value={termForm.notes} onChange={(e: any) => setTermForm({ ...termForm, notes: e.target.value })} placeholder="Optionnel" /></Field>
              <div className="md:col-span-5"><Button disabled={saving} variant="secondary">+ Ajouter une condition</Button></div>
            </form>
            <div className="mt-4 space-y-2">
              {selectedPaymentTerms.map((t: any) => editingTermId === t.id ? (
                <form key={t.id} onSubmit={updatePaymentTerm} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 md:grid-cols-5">
                  <Field label="Étape"><Input required value={editingTermForm.label} onChange={(e: any) => setEditingTermForm({ ...editingTermForm, label: e.target.value })} /></Field>
                  <Field label="Échéance"><Input value={editingTermForm.due_text} onChange={(e: any) => setEditingTermForm({ ...editingTermForm, due_text: e.target.value })} /></Field>
                  <Field label="%"><Input type="number" step="0.01" value={editingTermForm.percentage} onChange={(e: any) => setEditingTermForm({ ...editingTermForm, percentage: e.target.value })} /></Field>
                  <Field label="Montant TTC"><Input type="number" step="0.01" value={editingTermForm.amount_ttc} onChange={(e: any) => setEditingTermForm({ ...editingTermForm, amount_ttc: e.target.value })} /></Field>
                  <Field label="Notes"><Input value={editingTermForm.notes} onChange={(e: any) => setEditingTermForm({ ...editingTermForm, notes: e.target.value })} /></Field>
                  <div className="flex gap-2 md:col-span-5"><Button disabled={saving} variant="amber">Enregistrer</Button><Button type="button" variant="secondary" onClick={() => setEditingTermId("")}>Annuler</Button></div>
                </form>
              ) : (
                <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div><p className="font-black">{t.label || "Échéance"}</p><p className="text-xs text-slate-500">{t.due_text || "Échéance à définir"}{t.notes ? ` · ${t.notes}` : ""}</p></div>
                  <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{Number(t.percentage || 0)}%</Badge><b>{money(t.amount_ttc || 0)}</b><button type="button" onClick={() => startEditPaymentTerm(t)} className="rounded-xl bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">Modifier</button><button type="button" onClick={() => deletePaymentTerm(t.id)} className="rounded-xl bg-red-50 px-2 py-1 text-xs font-black text-red-700">Suppr.</button></div>
                </div>
              ))}
              {selectedPaymentTerms.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aucune condition de règlement. Exemple : 30% à la commande, 40% au démarrage, 30% à réception.</p>}
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-black">Ajouter une ligne produit</h3>
            <form onSubmit={addItem} className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Désignation"><Input required value={itemForm.title} onChange={(e: any) => setItemForm({ ...itemForm, title: e.target.value })} placeholder="Meuble vasque, faïence..." /></Field>
              <Field label="Fournisseur"><Input value={itemForm.supplier} onChange={(e: any) => setItemForm({ ...itemForm, supplier: e.target.value })} placeholder="Leroy Merlin, Cedeo..." /></Field>
              <Field label="Référence"><Input value={itemForm.reference} onChange={(e: any) => setItemForm({ ...itemForm, reference: e.target.value })} /></Field>
              <Field label="Quantité"><Input type="number" step="0.01" value={itemForm.quantity} onChange={(e: any) => setItemForm({ ...itemForm, quantity: e.target.value })} /></Field>
              <Field label="Prix unitaire HT"><Input type="number" step="0.01" value={itemForm.unit_price_ht} onChange={(e: any) => setItemForm({ ...itemForm, unit_price_ht: e.target.value })} /></Field>
              <Field label="TVA %"><Input type="number" step="0.01" value={itemForm.tva_rate} onChange={(e: any) => setItemForm({ ...itemForm, tva_rate: e.target.value })} /></Field>
              <Field label="Visuel photo"><Input name="visual_file" type="file" accept="image/*" /></Field>
              <Field label="Lien visuel existant"><Input value={itemForm.visual_url} onChange={(e: any) => setItemForm({ ...itemForm, visual_url: e.target.value })} placeholder="Optionnel" /></Field>
              <Field label="Notes"><Input value={itemForm.notes} onChange={(e: any) => setItemForm({ ...itemForm, notes: e.target.value })} /></Field>
              <div className="md:col-span-3"><Button disabled={saving}>+ Ajouter la ligne</Button></div>
            </form>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {specItems.map((i: any) => { const ht = Number(i.quantity || 0) * Number(i.unit_price_ht || 0); const editing = editingItemId === i.id; return <Card key={i.id} className="space-y-4">
              {!editing ? <div className="flex gap-4">
                <div className="h-28 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-100">{i.visual_url ? <img src={i.visual_url} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-xs font-black text-slate-400">VISUEL</div>}</div>
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="font-black">{i.title}</h4><p className="text-xs text-slate-500">{i.supplier || "Fournisseur"} · réf. {i.reference || "—"}</p></div><div className="flex gap-2"><button type="button" onClick={() => startEditItem(i)} className="rounded-xl bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">Modifier</button><button type="button" onClick={() => deleteItem(i.id)} className="rounded-xl bg-red-50 px-2 py-1 text-xs font-black text-red-700">Suppr.</button></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-slate-50 p-2"><b>Qté</b><br/>{i.quantity}</div><div className="rounded-xl bg-slate-50 p-2"><b>PU HT</b><br/>{money(i.unit_price_ht)}</div><div className="rounded-xl bg-orange-50 p-2 text-orange-900"><b>Total</b><br/>{money(ht)}</div></div>{i.notes && <p className="mt-2 text-xs text-slate-500">{i.notes}</p>}</div>
              </div> : <form onSubmit={updateItem} className="grid gap-3 md:grid-cols-2">
                <Field label="Désignation"><Input required value={editingItemForm.title} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, title: e.target.value })} /></Field>
                <Field label="Fournisseur"><Input value={editingItemForm.supplier} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, supplier: e.target.value })} /></Field>
                <Field label="Référence"><Input value={editingItemForm.reference} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, reference: e.target.value })} /></Field>
                <Field label="Quantité"><Input type="number" step="0.01" value={editingItemForm.quantity} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, quantity: e.target.value })} /></Field>
                <Field label="Prix unitaire HT"><Input type="number" step="0.01" value={editingItemForm.unit_price_ht} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, unit_price_ht: e.target.value })} /></Field>
                <Field label="TVA %"><Input type="number" step="0.01" value={editingItemForm.tva_rate} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, tva_rate: e.target.value })} /></Field>
                <Field label="Nouveau visuel"><Input name="visual_file" type="file" accept="image/*" /></Field>
                <Field label="Lien visuel"><Input value={editingItemForm.visual_url} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, visual_url: e.target.value })} /></Field>
                <Field label="Notes"><Input value={editingItemForm.notes} onChange={(e: any) => setEditingItemForm({ ...editingItemForm, notes: e.target.value })} /></Field>
                <div className="flex gap-2 md:col-span-2"><Button disabled={saving} variant="amber">Enregistrer la ligne</Button><Button type="button" variant="secondary" onClick={() => setEditingItemId("")}>Annuler</Button></div>
              </form>}
            </Card>; })}
          </div>
        </> : <Card><p className="text-sm text-slate-500">Crée ou sélectionne un cahier des charges pour commencer.</p></Card>}
      </div>
    </div>
    )}
  </div>;
}


function Dashboard({ projects, photos, docs, requests, materials = [], setActive }: any) {
  const enCours = projects.filter((p: any) => p.status === "en_cours");
  const materialTodo = materials.filter((m: any) => !m.ready);
  const openRequests = requests.filter((r: any) => !["termine", "traité", "traite", "closed", "fait"].includes(String(r.status || "").toLowerCase()));
  const priorityRank: any = { urgente: 0, haute: 1, normale: 2, basse: 3 };
  const priorityRequests = [...openRequests].sort((a: any, b: any) => (priorityRank[String(a.priority || "normale").toLowerCase()] ?? 2) - (priorityRank[String(b.priority || "normale").toLowerCase()] ?? 2)).slice(0, 6);
  function priorityUi(priority: string) {
    const p = String(priority || "normale").toLowerCase();
    if (p === "urgente") return { label: "Urgente", tone: "red", card: "border-red-200 bg-red-50", text: "text-red-800", dot: "bg-red-500" };
    if (p === "haute") return { label: "Haute", tone: "amber", card: "border-orange-200 bg-orange-50", text: "text-orange-800", dot: "bg-orange-500" };
    if (p === "basse") return { label: "Basse", tone: "green", card: "border-emerald-200 bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" };
    return { label: "Normale", tone: "blue", card: "border-blue-200 bg-blue-50", text: "text-blue-800", dot: "bg-blue-500" };
  }

  const dashboardCards = [
    { title: "Chantiers en cours", value: enCours.length, subtitle: enCours.slice(0, 3).map((p: any) => p.name).join(" · ") || "Aucun chantier en cours", tone: "border-emerald-500 bg-emerald-50 text-emerald-700", action: "Voir chantiers", target: "projects" },
    { title: "Matériel à prévoir", value: materialTodo.length, subtitle: materialTodo.slice(0, 3).map((m: any) => m.title || "Matériel").join(" · ") || "Aucun matériel en attente", tone: "border-amber-400 bg-amber-50 text-amber-700", action: "Voir magasinier", target: "storekeeper" },
    { title: "Demandes internes", value: openRequests.length, subtitle: openRequests.slice(0, 3).map((r: any) => r.title || r.message || "Demande").join(" · ") || "Aucune demande ouverte", tone: "border-blue-500 bg-blue-50 text-blue-700", action: "Voir demandes", target: "requests" }
  ];

  return (
    <div>
      <Section title="Tableau de bord" subtitle="Vue synthétique sans détail long, optimisée mobile." />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">💬 Priorités demandes internes</h3>
            <Button variant="secondary" className="text-xs" onClick={() => setActive("requests")}>Voir tout</Button>
          </div>
          <div className="mt-4 space-y-2">
            {priorityRequests.map((r: any) => {
              const ui = priorityUi(r.priority);
              return (
                <div key={r.id} className={`rounded-2xl border p-3 ${ui.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-black line-clamp-1">{r.title || r.message || "Demande interne"}</div>
                      <div className="text-xs text-slate-500">{projects.find((p: any) => p.id === r.project_id)?.name || "Sans chantier"}{r.planned_date ? ` · ${formatDisplayDate(r.planned_date)}` : ""}</div>
                    </div>
                    <Badge tone={ui.tone}><span className={`h-2 w-2 rounded-full ${ui.dot}`}></span>{ui.label}</Badge>
                  </div>
                </div>
              );
            })}
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
  const [showArchives, setShowArchives] = useState(false);

  async function saveProject(e: any) {
    e.preventDefault();
    if (!form.name) return alert("Nom chantier obligatoire");
    const query = editingId ? supabase.from("projects").update(form).eq("id", editingId) : supabase.from("projects").insert(form);
    const { error } = await query;
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
  const activeEmployees = employees.filter((e: any) => e.active !== false && e.archived !== true);
  const archivedProjects = projects.filter((p: any) => p.status === "archive");
  const activeProjectIds = new Set(activeProjects.map((p: any) => p.id));

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
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-bold uppercase text-slate-500">Couleur chantier prédéfinie</div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-5">
              {projectColorPalette.map((c) => {
                const selected = form.color === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => setForm({ ...form, color: c.value })} className={`rounded-2xl border p-2 text-left text-[11px] font-black transition ${selected ? "border-slate-900 bg-white shadow-sm ring-2 ring-slate-900" : "border-white bg-white/80 hover:border-slate-300"}`}>
                    <span className="mb-1 block h-7 rounded-xl" style={{ background: c.value }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Avancement %"><Input type="number" min="0" max="100" value={form.progress} onChange={(e: any) => setForm({ ...form, progress: Number(e.target.value) })} /></Field>
          <div className="md:col-span-3"><Field label="Description"><Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <Button className="md:col-span-3">{editingId ? "Modifier chantier" : "Créer chantier"}</Button>
        </form>
      </Card>}

      <div className="mt-6 space-y-6">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black">Chantiers actifs</h3>
            <Badge tone="blue">{activeProjects.length} chantier(s)</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

          {activeProjects.map((p: any) => {
            const progress = Math.min(100, Number(p.progress || 0));
            const tone = statusTone[p.status] || "slate";
            const statusClass: any = {
              preparation: "from-amber-50 to-white border-amber-300",
              en_cours: "from-emerald-50 to-white border-emerald-300",
              termine: "from-blue-50 to-white border-blue-300",
              archive: "from-slate-50 to-white border-slate-300"
            };
            return (
              <Card key={p.id} className={`border-l-8 bg-gradient-to-br ${statusClass[p.status] || "from-white to-slate-50 border-slate-200"} ${current?.id === p.id ? "ring-2 ring-slate-900" : ""}`} style={{ borderLeftColor: p.color || "#0f172a" }}>
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-black">{p.name}</h3><p className="text-sm text-slate-500">{p.client || "Client non renseigné"}</p><p className="text-sm text-slate-500">{p.address || "Adresse non renseignée"}</p></div>
                  <Badge tone={tone}>{statusLabels[p.status] || p.status}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${progress}%`, background: p.color || "#0f172a" }} /></div><span className="text-xs font-black text-slate-500">{progress}%</span></div>
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
            );
          })}

          {activeProjects.length === 0 && <Card><p className="text-sm text-slate-500">Aucun chantier actif.</p></Card>}
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-black">Archives chantiers</h3><p className="text-sm text-slate-500">Masquées par défaut pour alléger l’affichage.</p></div>
            <Button variant="secondary" onClick={() => setShowArchives(!showArchives)}>{showArchives ? "Masquer les archives" : `Voir les archives (${archivedProjects.length})`}</Button>
          </div>
          {showArchives && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
          </div>}
        </div>
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    const html = `<html><head><title>Rapport chantier - ${project.name}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;background:#f1f5f9;color:#0f172a}.page{max-width:980px;margin:auto;background:white;padding:28px}.header{border-bottom:4px solid #0f172a;padding-bottom:16px}.logo{height:70px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.card{border-radius:20px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0}.value{font-size:24px;font-weight:900}.section{margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f172a;color:white;text-align:left;padding:10px}td{padding:10px;border-bottom:1px solid #e2e8f0}.summary{margin-top:22px;border-radius:24px;padding:20px;background:${marginHT>=0?'#ecfdf5':'#fef2f2'};border-left:10px solid ${marginHT>=0?'#10b981':'#ef4444'}}@media print{body{background:white}.page{padding:0}}</style></head><body><div class="page"><div class="header"><img class="logo" src="/logo-asb.png"/><h1>Rapport chantier / gestion TVA</h1><p><b>${project.name}</b> · ${project.client || ''}</p><p>${project.address || ''}</p></div><div class="grid"><div class="card"><b>Facturation client HT</b><div class="value">${money(revenuesHT)}</div></div><div class="card"><b>Dépenses HT</b><div class="value">${money(invoicesHT)}</div></div><div class="card"><b>Retours HT</b><div class="value">-${money(returnsHT)}</div></div><div class="card"><b>Marge HT</b><div class="value">${money(marginHT)}</div></div></div><div class="summary"><b>TVA</b><p>TVA collectée : ${money(revenuesTVA)} · TVA déductible nette : ${money(Math.max(0, invoicesTVA - returnsTVA))} · Solde TVA estimatif : ${money(tvaBalance)}</p></div><div class="section"><h2>Facturation client</h2><table><thead><tr><th>Libellé</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead><tbody>${projectRevenues.map((r:any)=>`<tr><td><b>${r.label||'Facturation client'}</b></td><td>${formatDisplayDate(r.billing_date)}</td><td>${money(amountHT(r))}</td><td>${money(amountTVA(r))}</td><td>${money(amountTTC(r))}</td></tr>`).join('') || '<tr><td colspan="5">Aucune facturation.</td></tr>'}</tbody></table></div><div class="section"><h2>Factures fournisseurs</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead><tbody>${projectInvoices.map((i:any)=>`<tr><td><b>${i.supplier||'Fournisseur'}</b></td><td>${formatDisplayDate(i.invoice_date)}</td><td>${money(amountHT(i))}</td><td>${money(amountTVA(i))}</td><td>${money(amountTTC(i))}</td></tr>`).join('') || '<tr><td colspan="5">Aucune facture.</td></tr>'}</tbody></table></div><div class="section"><h2>Retours</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>HT</th><th>TVA corrigée</th><th>TTC</th></tr></thead><tbody>${projectReturns.map((r:any)=>`<tr><td><b>${r.supplier||'Retour'}</b></td><td>${formatDisplayDate(r.return_date)}</td><td>-${money(amountHT(r))}</td><td>-${money(amountTVA(r))}</td><td>-${money(amountTTC(r))}</td></tr>`).join('') || '<tr><td colspan="5">Aucun retour.</td></tr>'}</tbody></table></div><p style="font-size:12px;color:#64748b;margin-top:22px">Document interne ASB — rapport chantier.</p></div></body></html>`;
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
            <div className="flex flex-wrap gap-2"><Badge tone={statusTone[project.status] || "slate"}>{statusLabels[project.status] || project.status}</Badge></div>
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
            ["factures", "🧾 Achats / retours", projectInvoices.length + projectReturns.length],
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
            {projectInvoices.map((inv: any) => <div key={inv.id} className="rounded-3xl bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-emerald-700">🧾 Fournisseur</div><div className="text-xl font-black">{inv.supplier}</div><div className="mt-2 text-sm text-slate-600">{inv.category || "catégorie"} · {formatDisplayDate(inv.invoice_date)}</div><div className="mt-3 text-2xl font-black text-emerald-700">HT {money(amountHT(inv))}</div><div className="text-sm font-bold text-slate-600">TVA {money(amountTVA(inv))} · TTC {money(amountTTC(inv))}</div>{inv.notes && <div className="mt-2 rounded-2xl bg-emerald-50 p-2 text-sm">{inv.notes}</div>}<div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => updateInvoice(inv)}>Modifier</Button><Button variant="danger" onClick={() => deleteInvoice(inv)}>Supprimer</Button></div></div>)}
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

function Planning({ projects, employees, links, planning, requests = [], refreshAll }: any) {
  const emptyForm = {
    project_id: "",
    employee_ids: [] as string[],
    title: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    notes: ""
  };

  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeProjects = projects.filter((p: any) => p.status !== "archive");
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  const assignedIds = form.project_id
    ? links.filter((l: any) => l.project_id === form.project_id).map((l: any) => l.employee_id)
    : [];

  const orderedEmployees = [...employees]
    .filter((e: any) => e.active !== false && e.archived !== true)
    .filter((e: any) => employeeFilter === "all" || e.id === employeeFilter)
    .sort((a: any, b: any) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`));

  const formEmployees = [...employees].sort((a: any, b: any) => {
    const aAssigned = assignedIds.includes(a.id) ? 0 : 1;
    const bAssigned = assignedIds.includes(b.id) ? 0 : 1;
    return aAssigned - bAssigned || `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`);
  });

  function employeeName(id: string) {
    const e = employees.find((x: any) => x.id === id);
    return e ? `${e.firstname} ${e.lastname}` : "Salarié inconnu";
  }

  function projectNameLocal(id: string, row?: any) {
    const project = projects.find((p: any) => p.id === id);
    return project?.name || row?.project_name_snapshot || row?.project_name || row?.chantier_name || "Chantier archivé";
  }

  function projectColor(id: string) {
    return projects.find((p: any) => p.id === id)?.color || "#0f172a";
  }

  function projectAddress(id: string) {
    return projects.find((p: any) => p.id === id)?.address || "Adresse non renseignée";
  }

  function isLightColor(hex: string) {
    const value = String(hex || "#0f172a").replace("#", "");
    if (value.length !== 6) return false;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 170;
  }

  function openCreatePlanning() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
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
      notes: item.notes || ""
    });
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  function openProjectFull(projectId: string) {
    setSelectedProjectId(projectId);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  function toggleEmployee(employeeId: string) {
    const current = form.employee_ids || [];
    setForm({ ...form, employee_ids: current.includes(employeeId) ? current.filter((id: string) => id !== employeeId) : [...current, employeeId] });
  }

  const activeEmployees = employees.filter((e: any) => e.active !== false && e.archived !== true);
  function employeeSnapshot(employeeId: string) { const emp = employees.find((e: any) => e.id === employeeId); return { employee_name_snapshot: emp ? `${emp.firstname || ""} ${emp.lastname || ""}`.trim() : null, employee_daily_cost_snapshot: Number(emp?.daily_cost || 0) }; }

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
      color: projectColor(form.project_id),
      notes: form.notes
    };

    if (editing) {
      const { error } = await supabase.from("employee_planning").update({ ...basePayload, employee_id: form.employee_ids[0], ...employeeSnapshot(form.employee_ids[0]) }).eq("id", editing.id);
      if (error) return alert(error.message);
    } else {
      const rows = form.employee_ids.map((employee_id: string) => ({ ...basePayload, employee_id, ...employeeSnapshot(employee_id) }));
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

  function eventsForEmployeeAndDate(employeeId: string, date: Date) {
    const key = formatDate(date);
    const term = search.trim().toLowerCase();
    return planning.filter((p: any) => {
      const project = projects.find((x: any) => x.id === p.project_id);
      const matchDate = (p.start_date || "") <= key && (p.end_date || p.start_date || "") >= key;
      const matchEmployee = p.employee_id === employeeId;
      const matchSearch = !term || `${project?.name || ""} ${project?.client || ""} ${project?.address || ""} ${p.title || ""}`.toLowerCase().includes(term);
      return matchDate && matchEmployee && matchSearch;
    });
  }

  const weekStart = startOfWeek(cursor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const month = monthDays(cursor);
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  function eventsForDate(date: Date) {
    const key = formatDate(date);
    const term = search.trim().toLowerCase();
    return planning.filter((p: any) => {
      const project = projects.find((x: any) => x.id === p.project_id);
      const matchDate = (p.start_date || "") <= key && (p.end_date || p.start_date || "") >= key;
      const matchEmployee = employeeFilter === "all" || p.employee_id === employeeFilter;
      const matchSearch = !term || `${project?.name || ""} ${project?.client || ""} ${project?.address || ""} ${p.title || ""}`.toLowerCase().includes(term);
      return matchDate && matchEmployee && matchSearch;
    });
  }

  const monthWeeks = Array.from({ length: 6 }, (_, w) => month.slice(w * 7, w * 7 + 7));

  function compactMonthEventsForWeek(weekDays: Date[]) {
    const weekStartKey = formatDate(weekDays[0]);
    const weekEndKey = formatDate(weekDays[6]);
    const term = search.trim().toLowerCase();
    const grouped: any = {};

    planning.forEach((p: any) => {
      const project = projects.find((x: any) => x.id === p.project_id);
      const start = p.start_date || "";
      const end = p.end_date || p.start_date || "";
      if (!start || start > weekEndKey || end < weekStartKey) return;
      if (employeeFilter !== "all" && p.employee_id !== employeeFilter) return;
      if (term && !`${project?.name || p.project_name_snapshot || ""} ${project?.client || ""} ${project?.address || ""} ${p.title || ""}`.toLowerCase().includes(term)) return;

      const key = `${p.project_id}-${p.title || "planning"}-${start}-${end}`;
      if (!grouped[key]) grouped[key] = { ...p, employee_ids: [], start_date: start, end_date: end };
      if (p.employee_id && !grouped[key].employee_ids.includes(p.employee_id)) grouped[key].employee_ids.push(p.employee_id);
    });

    const events = Object.values(grouped).sort((a: any, b: any) => {
      const spanA = daysBetween(a.start_date, a.end_date || a.start_date);
      const spanB = daysBetween(b.start_date, b.end_date || b.start_date);
      return (a.start_date || "").localeCompare(b.start_date || "") || spanB - spanA;
    });

    const lanes: any[] = [];
    return events.map((e: any) => {
      const startKey = e.start_date < weekStartKey ? weekStartKey : e.start_date;
      const endKey = (e.end_date || e.start_date) > weekEndKey ? weekEndKey : (e.end_date || e.start_date);
      const startIndex = weekDays.findIndex((d) => formatDate(d) === startKey);
      const endIndex = weekDays.findIndex((d) => formatDate(d) === endKey);
      let lane = lanes.findIndex((lastEnd) => lastEnd < startIndex);
      if (lane === -1) { lane = lanes.length; lanes.push(endIndex); } else { lanes[lane] = endIndex; }
      return { ...e, startIndex: Math.max(0, startIndex), endIndex: Math.max(0, endIndex), lane };
    });
  }

  if (showForm) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-30 mb-5 rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Planning</p>
              <h2 className="text-2xl font-black">{editing ? "Modifier un planning" : "Créer un planning"}</h2>
              <p className="text-sm text-slate-500">Page dédiée, plus lisible sur tablette/mobile. La couleur vient automatiquement du chantier.</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>← Retour agenda</Button>
          </div>
        </div>

        <Card id="planning-form" className="border-l-8" style={{ borderLeftColor: form.project_id ? projectColor(form.project_id) : "#e2e8f0" }}>
          <form onSubmit={savePlanning} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Chantier"><Select value={form.project_id} onChange={(e: any) => setForm({ ...form, project_id: e.target.value, employee_ids: [] })}><option value="">Choisir chantier</option>{activeProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Tâche"><Input value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Pose isolation, RDV client..." /></Field>
            <Field label="Date début"><Input type="date" value={form.start_date} onChange={(e: any) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Date fin"><Input type="date" value={form.end_date} onChange={(e: any) => setForm({ ...form, end_date: e.target.value })} /></Field>
            <Field label="Heure début"><Input type="time" value={form.start_time} onChange={(e: any) => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label="Heure fin"><Input type="time" value={form.end_time} onChange={(e: any) => setForm({ ...form, end_time: e.target.value })} /></Field>

            <div className="md:col-span-2 xl:col-span-3">
              <div className="mb-2 text-xs font-bold uppercase text-slate-500">Salariés à planifier</div>
              <div className="grid gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4">
                {formEmployees.map((emp: any) => {
                  const checked = (form.employee_ids || []).includes(emp.id);
                  const isAssigned = assignedIds.includes(emp.id);
                  return (
                    <label key={emp.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border p-3 text-sm font-bold ${checked ? "border-slate-900 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}>
                      <span>{emp.firstname} {emp.lastname} {!isAssigned && form.project_id ? <span className="ml-1 text-xs text-amber-600">à ajouter</span> : null}</span>
                      <input type="checkbox" checked={checked} onChange={() => toggleEmployee(emp.id)} />
                    </label>
                  );
                })}
                {activeEmployees.length === 0 && <p className="text-sm text-slate-500">Aucun salarié actif enregistré.</p>}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-3"><Field label="Notes"><Textarea value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} /></Field></div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
              <Button>{editing ? "Enregistrer la modification" : "Ajouter au planning"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>Annuler</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (selectedProject) {
    const projectEvents = planning.filter((p: any) => p.project_id === selectedProject.id);
    const projectEmployees = Array.from(new Set(projectEvents.map((p: any) => p.employee_id))).map((id: any) => employeeName(id));
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-30 mb-5 rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Planning / fiche chantier</p>
              <h2 className="text-2xl font-black">{selectedProject.name}</h2>
              <p className="text-sm text-slate-500">{selectedProject.client || "Client non renseigné"} · {selectedProject.address || "Adresse non renseignée"}</p>
            </div>
            <Button variant="secondary" onClick={() => setSelectedProjectId(null)}>← Retour planning</Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-l-8" style={{ borderLeftColor: projectColor(selectedProject.id) }}>
            <p className="text-xs font-black uppercase text-slate-500">Chantier</p>
            <h3 className="mt-2 text-xl font-black">{selectedProject.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{selectedProject.description || "Aucune description."}</p>
          </Card>
          <Card>
            <p className="text-xs font-black uppercase text-slate-500">Équipe planifiée</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {projectEmployees.map((name: any) => <Badge key={name}>{name}</Badge>)}
              {projectEmployees.length === 0 && <p className="text-sm text-slate-500">Aucun salarié planifié.</p>}
            </div>
          </Card>
          <Card>
            <p className="text-xs font-black uppercase text-slate-500">Avancement</p>
            <div className="mt-3 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full" style={{ width: `${Number(selectedProject.progress || 0)}%`, background: projectColor(selectedProject.id) }} /></div>
            <p className="mt-2 text-2xl font-black">{Number(selectedProject.progress || 0)}%</p>
          </Card>
        </div>

        <Card className="mt-5">
          <h3 className="mb-4 text-xl font-black">Planning du chantier</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projectEvents.map((e: any) => (
              <div key={e.id} className="rounded-3xl p-4 shadow-sm" style={{ background: projectColor(e.project_id), color: "#0f172a" }}>
                <div className="text-lg font-black">{e.title}</div>
                <div className="mt-1 text-sm opacity-90">{employeeName(e.employee_id)}</div>
                <div className="mt-2 text-sm font-bold">{formatDisplayRange(e.start_date, e.end_date)}</div>
                <div className="text-sm opacity-90">{e.start_time || ""}{e.end_time ? ` - ${e.end_time}` : ""}</div>
              </div>
            ))}
            {projectEvents.length === 0 && <p className="text-sm text-slate-500">Aucune ligne planning pour ce chantier.</p>}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <Section title="Planning simple" subtitle="Une couleur = un chantier. Les salariés prennent automatiquement la couleur du chantier." />
        <Button onClick={openCreatePlanning}>+ Créer planning</Button>
      </div>



      <Card className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 gap-3 md:grid-cols-2">
            <Field label="Recherche chantier"><Input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Nom chantier, client, adresse..." /></Field>
            <Field label="Salarié"><Select value={employeeFilter} onChange={(e: any) => setEmployeeFilter(e.target.value)}><option value="all">Tous les salariés actifs</option>{activeEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.firstname} {e.lastname}</option>)}</Select></Field>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCursor(addDays(cursor, -7))}>← Semaine</Button>
            <div className="min-w-48 rounded-2xl bg-slate-50 px-4 py-3 text-center font-black">Semaine du {formatDisplayDate(weekStart)}</div>
            <Button variant="secondary" onClick={() => setCursor(addDays(cursor, 7))}>Semaine →</Button>
          </div>
        </div>
      </Card>

      <Card className="mb-5 overflow-hidden p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 sm:text-xs">Agenda mensuel type Google</p>
            <h3 className="text-lg font-black capitalize sm:text-xl">{monthLabel}</h3>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Button variant="secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>←</Button>
            <Button variant="secondary" onClick={() => setCursor(new Date())}>Aujourd’hui</Button>
            <Button variant="secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>→</Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-white">
          <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-[10px] font-black uppercase text-slate-500 sm:text-xs">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={`${d}-${i}`} className="py-2 sm:py-3">{d}</div>)}
          </div>

          <div className="divide-y">
            {monthWeeks.map((weekDays, weekIndex) => {
              const weekEvents = compactMonthEventsForWeek(weekDays);
              const visibleEvents = weekEvents.filter((e: any) => e.lane < 3);
              const hiddenCount = weekEvents.length - visibleEvents.length;
              return (
                <div key={weekIndex} className="relative h-[106px] sm:h-[128px]">
                  <div className="absolute inset-0 grid grid-cols-7">
                    {weekDays.map((day) => {
                      const key = formatDate(day);
                      const inMonth = day.getMonth() === cursor.getMonth();
                      const isToday = key === formatDate(new Date());
                      return (
                        <div key={key} className={`border-r px-1 py-1 last:border-r-0 ${inMonth ? "bg-white" : "bg-slate-50 text-slate-300"}`}>
                          <div className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black sm:h-6 sm:w-6 sm:text-xs ${isToday ? "bg-slate-900 text-white" : ""}`}>{day.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="absolute left-0 right-0 top-7 sm:top-8">
                    {visibleEvents.map((e: any) => {
                      const bg = projectColor(e.project_id);
                      const textColor = "#0f172a";
                      const left = `${(e.startIndex / 7) * 100}%`;
                      const width = `${((e.endIndex - e.startIndex + 1) / 7) * 100}%`;
                      const top = `${e.lane * 24}px`;
                      const names = (e.employee_ids || []).map((id: string) => employeeName(id).split(" ")[0]).join(", ");
                      return (
                        <button
                          key={`${e.project_id}-${e.title}-${e.start_date}-${e.end_date}-${e.lane}`}
                          type="button"
                          onClick={() => openProjectFull(e.project_id)}
                          className="absolute h-5 truncate rounded-lg border border-black/10 px-2 text-left text-[10px] font-black leading-5 shadow-md sm:h-6 sm:rounded-xl sm:px-3 sm:text-[12px] sm:leading-6"
                          style={{ left, width, top, background: bg, color: textColor, boxShadow: "0 6px 14px rgba(15,23,42,.18)" }}
                          title={`${projectNameLocal(e.project_id, e)} · ${e.title || "Planning"}${names ? ` · ${names}` : ""}`}
                        >
                          {projectNameLocal(e.project_id, e)}
                        </button>
                      );
                    })}
                    {hiddenCount > 0 && <div className="absolute right-1 top-[74px] rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 sm:top-[82px]">+{hiddenCount}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-3xl border bg-white shadow-sm">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[190px_repeat(7,1fr)] border-b bg-slate-50">
            <div className="p-4 text-sm font-black text-slate-600">Salarié</div>
            {week.map((day) => (
              <div key={formatDate(day)} className="border-l p-4 text-center">
                <div className="text-sm font-black capitalize">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                <div className="text-xs text-slate-500">{formatDisplayDate(day)}</div>
              </div>
            ))}
          </div>

          {orderedEmployees.map((emp: any) => (
            <div key={emp.id} className="grid min-h-32 grid-cols-[190px_repeat(7,1fr)] border-b last:border-b-0">
              <div className="sticky left-0 z-10 border-r bg-white p-4">
                <div className="font-black">{emp.firstname}</div>
                <div className="text-sm text-slate-500">{emp.lastname}</div>
              </div>
              {week.map((day) => {
                const dayEvents = eventsForEmployeeAndDate(emp.id, day);
                return (
                  <div key={`${emp.id}-${formatDate(day)}`} className="min-h-32 border-l p-2">
                    <div className="space-y-2">
                      {dayEvents.map((e: any) => {
                        const bg = projectColor(e.project_id);
                        const textColor = "#0f172a";
                        return (
                          <div key={e.id} className="rounded-2xl border border-black/10 p-3 text-left shadow-md" style={{ background: bg, color: textColor }}>
                            <button type="button" onClick={() => openProjectFull(e.project_id)} className="block w-full text-left">
                              <div className="text-sm font-black leading-tight">{projectNameLocal(e.project_id, e)}</div>
                              <div className="mt-1 text-xs opacity-90">{e.title}</div>
                              <div className="mt-1 text-[11px] opacity-80">{projectAddress(e.project_id)}</div>
                              {(e.start_time || e.end_time) && <div className="mt-2 text-xs font-black">{e.start_time || ""}{e.end_time ? ` - ${e.end_time}` : ""}</div>}
                            </button>
                            <div className="mt-3 flex gap-1">
                              <button className="rounded-xl bg-white/70 px-2 py-1 text-[11px] font-black text-slate-950 shadow-sm" onClick={() => openEditPlanning(e)}>Modifier</button>
                              <button className="rounded-xl bg-white/70 px-2 py-1 text-[11px] font-black text-slate-950 shadow-sm" onClick={() => deletePlanning(e)}>Suppr.</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {orderedEmployees.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Aucun salarié à afficher.</div>}
        </div>
      </div>
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
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { loadAssignments(); }, []);
  async function loadAssignments() { const { data } = await supabase.from("employee_projects").select("*"); setAssignments(data || []); }
  async function refreshEmployeesAll() { await loadAssignments(); await refreshAll(); }

  async function saveEmployee(e: any) {
    e.preventDefault();
    if (!form.firstname || !form.lastname) return alert("Nom et prénom obligatoires");
    const payload = { ...form, daily_cost: Number(form.daily_cost || 0) };
    const query = editingId ? supabase.from("employees").update(payload).eq("id", editingId) : supabase.from("employees").insert(payload);
    const { error } = await query;
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
    setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "", daily_cost: "" });
    setEditingId(null);
    setShowEmployeeForm(false);
    await refreshEmployeesAll();
  }
  function editEmployee(emp: any) { setEditingId(emp.id); setShowEmployeeForm(true); setForm({ firstname: emp.firstname || "", lastname: emp.lastname || "", position: emp.position || "", role: emp.role || "terrain", phone: emp.phone || "", email: emp.email || "", daily_cost: String(emp.daily_cost || "") }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function deleteEmployee(emp: any) { if (!confirm(`Archiver le salarié "${emp.firstname} ${emp.lastname}" ?\n\nIl sera masqué des nouvelles listes mais l’historique planning, chantier et gestion restera conservé.`)) return; const { error } = await supabase.from("employees").update({ active: false, archived: true, archived_at: new Date().toISOString() }).eq("id", emp.id); if (error) return alert(error.message + "\n\nLance le script supabase/schema-v80-archivage-salaries.sql si les colonnes active/archived manquent."); await refreshEmployeesAll(); }
  async function restoreEmployee(emp: any) { const { error } = await supabase.from("employees").update({ active: true, archived: false, archived_at: null }).eq("id", emp.id); if (error) return alert(error.message); await refreshEmployeesAll(); }
  async function assign(e: any) { e.preventDefault(); if (!employeeId || !projectId) return alert("Choisis un salarié et un chantier"); const already = assignments.find((a: any) => a.employee_id === employeeId && a.project_id === projectId); if (already) return alert("Ce salarié est déjà affecté à ce chantier"); const { error } = await supabase.from("employee_projects").insert({ employee_id: employeeId, project_id: projectId }); if (error) return alert(error.message); await refreshEmployeesAll(); }
  async function removeAssignment(assignment: any) { if (!confirm("Retirer cette affectation ?")) return; const { error } = await supabase.from("employee_projects").delete().eq("id", assignment.id); if (error) return alert(error.message); await refreshEmployeesAll(); }
  function employeeName(id: string) { const e = employees.find((x: any) => x.id === id); return e ? `${e.firstname} ${e.lastname}` : "Salarié inconnu"; }
  function projectNameLocal(id: string) { return projects.find((p: any) => p.id === id)?.name || "Chantier inconnu"; }
  const activeProjects = projects.filter((p: any) => p.status !== "archive");
  const activeEmployees = employees.filter((e: any) => e.active !== false && e.archived !== true);
  const archivedEmployees = employees.filter((e: any) => e.active === false || e.archived === true);
  const visibleEmployees = showArchived ? employees : activeEmployees;
  const activeAssignments = assignments.filter((a: any) => activeProjects.find((p: any) => p.id === a.project_id));
  return (
    <div>
      <Section title="Gestion salariés" subtitle="Création, modification, coût journée, archivage sécurisé et affectation aux chantiers." />
      <Button className="mb-4" onClick={() => { if (showEmployeeForm && !editingId) { setShowEmployeeForm(false); } else { setShowEmployeeForm(true); setEditingId(null); setForm({ firstname: "", lastname: "", position: "", role: "terrain", phone: "", email: "", daily_cost: "" }); } }}>
        {showEmployeeForm ? (editingId ? "Formulaire salarié ouvert" : "Fermer création salarié") : "+ Créer salarié"}
      </Button>
      <Button className="mb-4 ml-2" variant="secondary" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Masquer archivés" : `Voir archivés (${archivedEmployees.length})`}</Button>
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
        <Card><h3 className="mb-4 font-black">Affecter un salarié à un chantier</h3><form onSubmit={assign} className="space-y-3"><Field label="Salarié"><Select value={employeeId} onChange={(e: any) => setEmployeeId(e.target.value)}><option value="">Choisir salarié</option>{activeEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.firstname} {e.lastname} — {e.position || e.role}</option>)}</Select></Field><Field label="Chantier"><Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}><option value="">Choisir chantier actif</option>{activeProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field><Button>Affecter au chantier</Button><p className="text-xs text-slate-500">Les affectations détaillées restent visibles dans chaque fiche chantier pour garder cette page légère.</p></form></Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{visibleEmployees.map((e: any) => { const employeeAssignments = activeAssignments.filter((a: any) => a.employee_id === e.id); return <Card key={e.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{e.firstname} {e.lastname}</h3><p className="text-sm text-slate-500">{e.position}</p><p className="text-sm font-bold text-slate-700">{e.daily_cost ? `${e.daily_cost} €/jour` : "Coût journée non renseigné"}</p></div><div className="flex flex-col items-end gap-2"><Badge>{e.role}</Badge>{(e.active === false || e.archived === true) && <Badge tone="amber">Archivé</Badge>}</div></div><div className="mt-4 space-y-1"><p className="text-xs font-bold uppercase text-slate-500">Chantiers affectés</p>{employeeAssignments.map((a: any) => <div key={a.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">{projectNameLocal(a.project_id)}</div>)}{employeeAssignments.length === 0 && <p className="text-xs text-slate-400">Aucune affectation active.</p>}</div><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => editEmployee(e)}>Modifier</Button>{(e.active === false || e.archived === true) ? <Button variant="green" onClick={() => restoreEmployee(e)}>Réactiver</Button> : <Button variant="danger" onClick={() => deleteEmployee(e)}>Archiver</Button>}</div></Card>; })}</div>
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
      status: form.planned_date ? "planifiee" : (form.status || "nouvelle")
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
      status: editForm.planned_date ? "planifiee" : (editForm.status || "nouvelle")
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    if (error) {
      console.error("Erreur company_expenses", error);
      return alert("Impossible d’enregistrer la charge : " + error.message + "\n\nSi le message parle de permission, lance le SQL V39 dans Supabase.");
    }
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
    const html = `<html><head><title>Rapport terrassement - ${item.name}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;background:#f1f5f9;color:#0f172a}.page{max-width:980px;margin:auto;background:white;padding:28px}.header{border-bottom:4px solid #92400e;padding-bottom:16px}.logo{height:70px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.card{border-radius:20px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0}.value{font-size:24px;font-weight:900}.section{margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f172a;color:white;text-align:left;padding:10px}td{padding:10px;border-bottom:1px solid #e2e8f0}.summary{margin-top:22px;border-radius:24px;padding:20px;background:${margin>=0?'#ecfdf5':'#fef2f2'};border-left:10px solid ${margin>=0?'#10b981':'#ef4444'}}@media print{body{background:white}.page{padding:0}}</style></head><body><div class="page"><div class="header"><img class="logo" src="/logo-asb.png"/><h1>Rapport terrassement / rentabilité</h1><p><b>${item.name}</b> · ${item.client || ''}</p><p>${item.address || ''}</p></div><div class="grid"><div class="card"><b>Facturation client</b><div class="value">${money(clientBilling)}</div></div><div class="card"><b>Factures</b><div class="value">${money(invoicesHT)}</div></div><div class="card"><b>Locations engins HT</b><div class="value">${money(rentalsTotal)}</div><p>TVA ${money(rentalsTVA)} · TTC ${money(rentalsTTC)}</p></div><div class="card"><b>Marge</b><div class="value">${money(margin)} · ${marginRate}%</div></div></div><div class="summary"><b>Synthèse</b><div style="font-size:34px;font-weight:900">${margin>=0?'+':''}${money(margin)}</div><p>Coût total terrassement HT : ${money(totalCosts)}. TVA collectée : ${money(revenuesTVA)} · TVA déductible achats + locations : ${money(invoicesTVA + rentalsTVA - returnsTVA)} · Solde TVA : ${money(tvaBalance)}.</p></div><div class="section"><h2>Factures terrassement</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th><th>Notes</th></tr></thead><tbody>${myInvoices.map((i:any)=>`<tr><td><b>${i.supplier||'Fournisseur'}</b></td><td>${formatDisplayDate(i.invoice_date)}</td><td>${money(amountHT(i))}</td><td>${i.notes||''}</td></tr>`).join('') || '<tr><td colspan="4">Aucune facture.</td></tr>'}</tbody></table></div><div class="section"><h2>Locations d’engins</h2><table><thead><tr><th>Engin</th><th>Début</th><th>Fin</th><th>HT</th><th>TVA</th><th>TTC</th><th>Notes</th></tr></thead><tbody>${myRentals.map((r:any)=>`<tr><td><b>${r.machine_type||'Engin'}</b></td><td>${r.start_date||''}</td><td>${r.end_date||''}</td><td>${money(amountHT({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price }))}</td><td>${money(amountTVA({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva }))}</td><td>${money(amountTTC({ amount_ht: r.amount_ht ?? r.rental_price, amount: r.rental_price, tva_rate: r.tva_rate ?? 20, amount_tva: r.amount_tva, amount_ttc: r.amount_ttc }))}</td><td>${r.notes||''}</td></tr>`).join('') || '<tr><td colspan="7">Aucune location.</td></tr>'}</tbody></table></div><p style="font-size:12px;color:#64748b;margin-top:22px">Document interne ASB — rapport terrassement.</p></div></body></html>`;
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

      <Card><h3 className="mb-3 font-black">Planning terrassement autonome</h3><form onSubmit={savePlanning} className="grid gap-3 md:grid-cols-3"><Field label="Tâche"><Input value={plan.title} onChange={(e: any) => setPlan({ ...plan, title: e.target.value })} /></Field><Field label="Début"><Input type="date" value={plan.start_date} onChange={(e: any) => setPlan({ ...plan, start_date: e.target.value })} /></Field><Field label="Fin"><Input type="date" value={plan.end_date} onChange={(e: any) => setPlan({ ...plan, end_date: e.target.value })} /></Field><div className="flex gap-2 md:col-span-3"><Button>{editingPlanningId ? "Modifier planning" : "Ajouter au planning"}</Button>{editingPlanningId && <Button type="button" variant="secondary" onClick={() => { setEditingPlanningId(null); setPlan({ title: "", start_date: "", end_date: "", start_time: "", end_time: "", color: item.color || "#92400e", notes: "" }); }}>Annuler</Button>}</div></form><div className="mt-4 space-y-2">{myPlanning.map((p: any) => <div key={p.id} className="rounded-2xl p-3 text-slate-950" style={{ background: p.color || item.color || "#92400e" }}><b>{p.title}</b><br />{p.start_date} → {p.end_date}<div className="mt-2 flex gap-2"><button onClick={() => editPlanning(p)} className="rounded-xl bg-white/70 px-3 py-1 text-xs text-slate-950">Modifier</button><button onClick={() => deleteRow("earthwork_planning", p.id)} className="rounded-xl bg-white/70 px-3 py-1 text-xs text-slate-950">Supprimer</button></div></div>)}</div></Card>

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

  function projectNameLocal(id: string, row?: any) {
    const project = projects.find((p: any) => p.id === id);
    return project?.name || row?.project_name_snapshot || row?.project_name || row?.chantier_name || "Chantier archivé";
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
    if (!invoiceForm.supplier || !invoiceForm.amount || !invoiceForm.invoice_date) return alert("Fournisseur, montant et date obligatoires");
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
    if (!returnForm.supplier || !returnForm.amount || !returnForm.return_date) return alert("Fournisseur, montant et date obligatoires");
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


function Management({ projects, photos = [], docs = [], notes = [], materials = [], vigilance = [], employees, planning, invoices, revenues, returns = [], companyExpenses = [], clientPayments = [], supplierInvoices = [], quoteCalculations = [], workItems = [], pilotageWorkProjects = [], refreshAll }: any) {
  const [tab, setTab] = useState("pilotage");
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("");
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [revenueForm, setRevenueForm] = useState({ project_id: "", label: "", amount: "", tva_rate: "10", billing_date: formatDate(new Date()), notes: "" });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ name: "", category: "Total à encaisser", amount: "", tva_rate: "20", frequency: "mensuelle", expense_date: formatDate(new Date()), notes: "", active: true });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ project_id: "", revenue_id: "", client: "", invoice_number: "", amount_ttc: "", payment_method: "Virement bancaire", payment_date: formatDate(new Date()), notes: "" });
  const emptyQuoteForm = { project_id: "", project_name: "", client: "", revenue_ht: "", input_mode: "HT", tva_rate: "10", fixed_costs: "0", notes: "" };
  const [quoteForm, setQuoteForm] = useState(emptyQuoteForm);
  const [savedQuoteCalculations, setSavedQuoteCalculations] = useState<any[]>([]);
  const [quoteCalculationsLoaded, setQuoteCalculationsLoaded] = useState(false);
  const [editingQuoteCalcId, setEditingQuoteCalcId] = useState<string | null>(null);
  const [quoteExpenses, setQuoteExpenses] = useState<any[]>([
    { id: 1, label: "Matériaux", amount: "", tva_rate: "20", amount_mode: "HT" },
    { id: 2, label: "Sous-traitance", amount: "", tva_rate: "20", amount_mode: "HT" },
    { id: 3, label: "Location / engins", amount: "", tva_rate: "20", amount_mode: "HT" }
  ]);
  const [quoteLabor, setQuoteLabor] = useState<any[]>([
    { id: 1, employee_id: "", label: "Personnel", days: "1", daily_cost: "" }
  ]);
  const [editingPurchaseInvoiceId, setEditingPurchaseInvoiceId] = useState<string | null>(null);
  const [purchaseInvoiceForm, setPurchaseInvoiceForm] = useState({ project_id: "", supplier: "", invoice_number: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: formatDate(new Date()), notes: "" });
  const [selectedDetailProject, setSelectedDetailProject] = useState<any | null>(null);
  const today = new Date();
  const [periodMode, setPeriodMode] = useState("month");
  const [periodStart, setPeriodStart] = useState(formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)));

  useEffect(() => {
    // V82 : source unique = Supabase.
    // On ne recharge plus le localStorage appareil par appareil, car cela créait des listes différentes entre téléphone, tablette et ordinateur.
    setSavedQuoteCalculations(Array.isArray(quoteCalculations) ? quoteCalculations : []);
    setQuoteCalculationsLoaded(true);
  }, [quoteCalculations]);


  function money(v: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v || 0)); }
  function amountHT(x: any) { return Number(x.amount_ht ?? x.amount ?? 0); }
  function amountTVA(x: any) { return Number(x.amount_tva ?? (amountHT(x) * Number(x.tva_rate || 0) / 100)); }
  function amountTTC(x: any) { return Number(x.amount_ttc ?? (amountHT(x) + amountTVA(x))); }
  function taxPayload(amount: string, rate: string) { const ht = Math.round(Number(amount || 0) * 100) / 100; const tva = Math.round((ht * Number(rate || 0) / 100) * 100) / 100; const ttc = Math.round((ht + tva) * 100) / 100; return { amount: ht, amount_ht: ht, tva_rate: Number(rate || 0), amount_tva: tva, amount_ttc: ttc }; }
  function daysBetween(start: string, end: string) { if (!start) return 0; const s = new Date(start); const e = new Date(end || start); return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000)) + 1; }
  function employeeCost(employeeId: string, row?: any) {
    // V81 : ne jamais laisser les anciennes lignes planning tomber à 0.
    // En V80, la colonne snapshot pouvait être créée avec default 0 : on l'utilise seulement si elle est réellement > 0.
    const snapshot = Number(row?.employee_daily_cost_snapshot || 0);
    if (snapshot > 0) return snapshot;
    const emp = employees.find((e: any) => e.id === employeeId);
    return Number(emp?.daily_cost || 0);
  }
  function employeeName(emp: any) { return [emp?.firstname, emp?.lastname].filter(Boolean).join(" ") || emp?.name || emp?.full_name || emp?.email || "Salarié"; }
  function employeeNameById(id: string, row?: any) { const savedName = String(row?.employee_name_snapshot || "").trim(); if (savedName) return savedName; const emp = employees.find((e: any) => e.id === id); return emp ? employeeName(emp) : "Salarié non renseigné"; }
  function projectLabel(id: string) { const p = projects.find((x: any) => x.id === id); return p ? `${p.name}${p.status === "archive" ? " · archivé" : ""}` : "Chantier"; }
  function dateOnly(value: string) { return value ? String(value).slice(0, 10) : ""; }
  function inPeriod(value: string) { const d = dateOnly(value); if (!d) return false; return d >= periodStart && d <= periodEnd; }
  function overlapsPeriod(start: string, end: string) { const s = dateOnly(start); const e = dateOnly(end || start); if (!s) return false; return s <= periodEnd && e >= periodStart; }
  function applyPeriod(mode: string) {
    setPeriodMode(mode);
    const now = new Date();
    let start = new Date(now); let end = new Date(now);
    if (mode === "today") { start = now; end = now; }
    if (mode === "week") { start = startOfWeek(now); end = addDays(start, 6); }
    if (mode === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    if (mode === "quarter") { const q = Math.floor(now.getMonth() / 3) * 3; start = new Date(now.getFullYear(), q, 1); end = new Date(now.getFullYear(), q + 3, 0); }
    if (mode === "year") { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); }
    if (mode !== "custom") { setPeriodStart(formatDate(start)); setPeriodEnd(formatDate(end)); }
  }
  const periodLabel = `${periodStart.split("-").reverse().join("/")} → ${periodEnd.split("-").reverse().join("/")}`;

  const activeProjects = projects.filter((p: any) => p.status !== "archive");
  const activeEmployees = employees.filter((e: any) => e.active !== false && e.archived !== true);
  const archivedProjects = projects.filter((p: any) => p.status === "archive");
  const activeProjectIds = new Set(activeProjects.map((p: any) => p.id));
  const searchedActiveProjects = activeProjects.filter((p: any) => {
    const txt = `${p.name || ""} ${p.client || ""} ${p.address || ""}`.toLowerCase();
    const searchOk = !projectSearch || txt.includes(projectSearch.toLowerCase());
    const selectOk = !selectedProjectFilter || p.id === selectedProjectFilter;
    return searchOk && selectOk;
  });

  // Pilotage comptable : le CA doit reprendre TOUS les chantiers, y compris les archivés.
  // Les chantiers archivés restent cachés des cartes actives, mais ils comptent dans les KPI, la TVA et la répartition du CA.
  const searchedAccountingProjects = projects.filter((p: any) => {
    const txt = `${p.name || ""} ${p.client || ""} ${p.address || ""}`.toLowerCase();
    const searchOk = !projectSearch || txt.includes(projectSearch.toLowerCase());
    const selectOk = !selectedProjectFilter || p.id === selectedProjectFilter;
    return searchOk && selectOk;
  });

  function projectStats(projectId: string, usePeriodFilter = true) {
    const myInvoices = invoices.filter((i: any) => i.project_id === projectId && (!usePeriodFilter || inPeriod(i.invoice_date || i.created_at)));
    const myReturns = returns.filter((r: any) => r.project_id === projectId && (!usePeriodFilter || inPeriod(r.return_date || r.created_at)));
    const myRevenues = revenues.filter((r: any) => r.project_id === projectId && (!usePeriodFilter || inPeriod(r.billing_date || r.created_at)));
    const grossSupplierTotal = myInvoices.reduce((s: number, i: any) => s + amountHT(i), 0);
    const supplierTVA = myInvoices.reduce((s: number, i: any) => s + amountTVA(i), 0);
    const returnsTotal = myReturns.reduce((s: number, r: any) => s + amountHT(r), 0);
    const returnsTVA = myReturns.reduce((s: number, r: any) => s + amountTVA(r), 0);
    const supplierTotal = Math.max(0, grossSupplierTotal - returnsTotal);
    const revenueTotal = myRevenues.reduce((s: number, r: any) => s + amountHT(r), 0);
    const revenueTVA = myRevenues.reduce((s: number, r: any) => s + amountTVA(r), 0);
    const netDeductibleTVA = Math.max(0, supplierTVA - returnsTVA);
    const laborTotal = planning.filter((p: any) => p.project_id === projectId && (!usePeriodFilter || overlapsPeriod(p.start_date, p.end_date))).reduce((s: number, p: any) => s + daysBetween(p.start_date, p.end_date) * employeeCost(p.employee_id, p), 0);
    const margin = revenueTotal - supplierTotal - laborTotal;
    const marginRate = revenueTotal > 0 ? Math.round((margin / revenueTotal) * 100) : 0;
    return { grossSupplierTotal, supplierTotal, supplierTVA, returnsTotal, returnsTVA, revenueTotal, revenueTVA, netDeductibleTVA, laborTotal, margin, marginRate, tvaBalance: revenueTVA - netDeductibleTVA };
  }

  const allStats = projects.reduce((a: any, p: any) => {
    const s = projectStats(p.id);
    a.revenue += s.revenueTotal; a.revenueTVA += s.revenueTVA; a.purchases += s.supplierTotal; a.deductibleTVA += s.netDeductibleTVA; a.labor += s.laborTotal; a.margin += s.margin; return a;
  }, { revenue: 0, revenueTVA: 0, purchases: 0, deductibleTVA: 0, labor: 0, margin: 0 });

  const chantierStats = activeProjects.reduce((a: any, p: any) => {
    const s = projectStats(p.id, false);
    a.revenue += s.revenueTotal;
    a.revenueTVA += s.revenueTVA;
    a.purchases += s.supplierTotal;
    a.deductibleTVA += s.netDeductibleTVA;
    a.labor += s.laborTotal;
    a.margin += s.margin;
    return a;
  }, { revenue: 0, revenueTVA: 0, purchases: 0, deductibleTVA: 0, labor: 0, margin: 0 });
  // V99 : les charges entreprise récurrentes doivent se cumuler sur toute la période filtrée.
  // Avant, une charge mensuelle n'était comptée qu'une seule fois si sa date tombait dans le filtre.
  // Exemple : loyer 1 000 €/mois sur une période de 2 mois = 2 000 €.
  function parseLocalDate(value: string) {
    const d = dateOnly(value);
    if (!d) return null;
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, (m || 1) - 1, day || 1);
  }
  function monthCountInclusive(startValue: string, endValue: string) {
    const s = parseLocalDate(startValue);
    const e = parseLocalDate(endValue);
    if (!s || !e || s > e) return 0;
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  }
  function expenseMultiplier(expense: any) {
    if (expense.active === false) return 0;
    const freq = String(expense.frequency || "ponctuelle").toLowerCase();
    const expenseStart = dateOnly(expense.expense_date || expense.created_at || periodStart);
    if (!expenseStart) return 0;

    // Une charge ponctuelle reste liée à sa date.
    if (freq.includes("ponct")) return inPeriod(expenseStart) ? 1 : 0;

    // Les charges récurrentes sont prises à partir de leur date de départ jusqu'à la fin du filtre.
    if (expenseStart > periodEnd) return 0;
    const effectiveStart = expenseStart > periodStart ? expenseStart : periodStart;

    if (freq.includes("mens")) return monthCountInclusive(effectiveStart, periodEnd);
    if (freq.includes("hebdo")) return Math.ceil(daysBetween(effectiveStart, periodEnd) / 7);
    if (freq.includes("ann")) return monthCountInclusive(effectiveStart, periodEnd) / 12;

    return inPeriod(expenseStart) ? 1 : 0;
  }
  const activeExpenses = companyExpenses.filter((e: any) => e.active !== false && expenseMultiplier(e) > 0);
  const expensesHT = activeExpenses.reduce((s: number, e: any) => s + amountHT(e) * expenseMultiplier(e), 0);
  const expensesTVA = activeExpenses.reduce((s: number, e: any) => s + amountTVA(e) * expenseMultiplier(e), 0);
  const tvaDeductibleGlobal = allStats.deductibleTVA + expensesTVA;
  const tvaBalanceGlobal = allStats.revenueTVA - tvaDeductibleGlobal;
  const globalResultHT = allStats.revenue - allStats.purchases - allStats.labor - expensesHT;
  const globalMarginRate = allStats.revenue > 0 ? Math.round((globalResultHT / allStats.revenue) * 100) : 0;
  const periodPayments = clientPayments.filter((p: any) => inPeriod(p.payment_date || p.created_at));
  const paidTTC = periodPayments.reduce((s: number, p: any) => s + Number(p.amount_ttc || 0), 0);
  const activeRevenues = revenues.filter((r: any) => projects.find((p: any) => p.id === r.project_id)?.status !== "archive");
  const periodActiveRevenues = activeRevenues.filter((r: any) => inPeriod(r.billing_date || r.created_at));
  const activeInvoices = invoices.filter((i: any) => activeProjectIds.has(i.project_id));
  const periodActiveInvoices = activeInvoices.filter((i: any) => inPeriod(i.invoice_date || i.created_at));
  const purchaseSummary = { count: periodActiveInvoices.length, ht: periodActiveInvoices.reduce((s: number, i: any) => s + amountHT(i), 0), tva: periodActiveInvoices.reduce((s: number, i: any) => s + amountTVA(i), 0), ttc: periodActiveInvoices.reduce((s: number, i: any) => s + amountTTC(i), 0) };

  const periodSupplierInvoices = supplierInvoices.filter((i: any) => inPeriod(i.invoice_date || i.created_at));
  const supplierTotalHT = periodSupplierInvoices.reduce((s: number, i: any) => s + amountHT(i), 0);
  const supplierTotalTVA = periodSupplierInvoices.reduce((s: number, i: any) => s + amountTVA(i), 0);
  const supplierTotalTTC = periodSupplierInvoices.reduce((s: number, i: any) => s + amountTTC(i), 0);
  const supplierPaidTTC = periodSupplierInvoices.reduce((s: number, i: any) => s + Number(i.paid_ttc || 0), 0);
  const supplierOutstandingTTC = Math.max(0, supplierTotalTTC - supplierPaidTTC);
  const [editingSupplierInvoiceId, setEditingSupplierInvoiceId] = useState<string | null>(null);
  const [supplierInvoiceForm, setSupplierInvoiceForm] = useState({ supplier: "", invoice_number: "", project_id: "", category: "matériaux", invoice_date: formatDate(new Date()), due_date: "", amount: "", tva_rate: "20", paid_ttc: "0", status: "En attente", notes: "" });
  const emptyWorkItemForm = { project_id: "", numero: "", designation: "", category: "", quantity: "", unit: "", sold_ht: "", realization_date: formatDate(new Date()), employee_ids: [] as string[], employee_names: "", merchandise_ht: "", subcontract_ht: "", other_costs_ht: "", progress: "100", notes: "" };
  const [workItemForm, setWorkItemForm] = useState<any>(emptyWorkItemForm);
  const emptyWorkDayForm = { date: formatDate(new Date()), employee_ids: [] as string[], selected_item_ids: [] as string[] };
  const [workDayForm, setWorkDayForm] = useState<any>(emptyWorkDayForm);
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [workProjectFilter, setWorkProjectFilter] = useState<string>("");
  const [workSearch, setWorkSearch] = useState<string>("");
  const [showProjectWorkItems, setShowProjectWorkItems] = useState<boolean>(false);
  const emptyPilotageProjectForm = { name: "", client: "", address: "", reference: "", notes: "", status: "en_cours" };
  const [pilotageProjectForm, setPilotageProjectForm] = useState<any>(emptyPilotageProjectForm);
  const [editingPilotageProjectId, setEditingPilotageProjectId] = useState<string | null>(null);
  const pilotageProjectList = pilotageWorkProjects || [];


  function resetSupplierInvoiceForm() {
    setEditingSupplierInvoiceId(null);
    setSupplierInvoiceForm({ supplier: "", invoice_number: "", project_id: "", category: "matériaux", invoice_date: formatDate(new Date()), due_date: "", amount: "", tva_rate: "20", paid_ttc: "0", status: "En attente", notes: "" });
  }

  function editSupplierInvoice(inv: any) {
    setEditingSupplierInvoiceId(inv.id);
    setSupplierInvoiceForm({
      supplier: inv.supplier || "",
      invoice_number: inv.invoice_number || "",
      project_id: inv.project_id || "",
      category: inv.category || "matériaux",
      invoice_date: inv.invoice_date || formatDate(new Date()),
      due_date: inv.due_date || "",
      amount: String(amountHT(inv) || ""),
      tva_rate: String(inv.tva_rate ?? 20),
      paid_ttc: String(inv.paid_ttc ?? 0),
      status: inv.status || "En attente",
      notes: inv.notes || ""
    });
    setTab("supplier-invoices");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSupplierInvoice(e: any) {
    e.preventDefault();
    if (!supplierInvoiceForm.supplier || !supplierInvoiceForm.amount || !supplierInvoiceForm.invoice_date) return alert("Fournisseur, montant HT et date de facture obligatoires.");
    const tax = taxPayload(supplierInvoiceForm.amount, supplierInvoiceForm.tva_rate);
    const payload = {
      supplier: supplierInvoiceForm.supplier,
      invoice_number: supplierInvoiceForm.invoice_number || null,
      project_id: supplierInvoiceForm.project_id || null,
      category: supplierInvoiceForm.category || "matériaux",
      invoice_date: supplierInvoiceForm.invoice_date || null,
      due_date: supplierInvoiceForm.due_date || null,
      ...tax,
      paid_ttc: Number(supplierInvoiceForm.paid_ttc || 0),
      status: supplierInvoiceForm.status || "En attente",
      notes: supplierInvoiceForm.notes || ""
    };
    const q = editingSupplierInvoiceId ? supabase.from("supplier_invoices").update(payload).eq("id", editingSupplierInvoiceId) : supabase.from("supplier_invoices").insert(payload);
    const { error } = await q;
    if (error) return alert("Facture fournisseur impossible : " + error.message + "\n\nLance le script Supabase V98 si besoin.");
    resetSupplierInvoiceForm();
    await refreshAll();
  }

  async function deleteSupplierInvoice(inv: any) {
    if (!confirm(`Supprimer la facture fournisseur ${inv.invoice_number || inv.supplier || ""} ?`)) return;
    const { error } = await supabase.from("supplier_invoices").delete().eq("id", inv.id);
    if (error) return alert(error.message);
    await refreshAll();
  }

  function duplicateSupplierInvoice(inv: any) {
    setEditingSupplierInvoiceId(null);
    setSupplierInvoiceForm({
      supplier: inv.supplier || "",
      invoice_number: inv.invoice_number ? `${inv.invoice_number}-copie` : "",
      project_id: inv.project_id || "",
      category: inv.category || "matériaux",
      invoice_date: formatDate(new Date()),
      due_date: inv.due_date || "",
      amount: String(amountHT(inv) || ""),
      tva_rate: String(inv.tva_rate ?? 20),
      paid_ttc: "0",
      status: "En attente",
      notes: inv.notes || ""
    });
    setTab("supplier-invoices");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  function workProjectName(id: string) { return pilotageProjectList.find((p: any) => p.id === id)?.name || "Chantier de pilotage non défini"; }
  function workProjectLabel(p: any) { return `${p.name || "Chantier"}${p.client ? ` · ${p.client}` : ""}`; }
  function pilotageProjectTotals(projectId: string) {
    const items = (workItems || []).filter((x: any) => x.project_id === projectId);
    const groups = buildWorkDateGroups(items);
    const totals = groups.reduce((a: any, g: any) => { a.count += g.count; a.sold += g.sold; a.cost += g.totalCost; a.margin += g.margin; a.laborCost += g.laborCost; return a; }, { count: 0, sold: 0, cost: 0, margin: 0, laborCost: 0 });
    totals.profitability = totals.sold > 0 ? Math.round((totals.margin / totals.sold) * 1000) / 10 : 0;
    return totals;
  }
  function editPilotageProject(p: any) {
    setEditingPilotageProjectId(p.id);
    setPilotageProjectForm({ name: p.name || "", client: p.client || "", address: p.address || "", reference: p.reference || "", notes: p.notes || "", status: p.status || "en_cours" });
    setWorkProjectFilter(p.id);
    setWorkItemForm({ ...workItemForm, project_id: p.id });
  }
  function resetPilotageProjectForm() { setEditingPilotageProjectId(null); setPilotageProjectForm(emptyPilotageProjectForm); }
  async function savePilotageProject(e: any) {
    e.preventDefault();
    if (!pilotageProjectForm.name) return alert("Nom du chantier obligatoire.");
    const payload = { name: pilotageProjectForm.name, client: pilotageProjectForm.client || null, address: pilotageProjectForm.address || null, reference: pilotageProjectForm.reference || null, notes: pilotageProjectForm.notes || null, status: pilotageProjectForm.status || "en_cours" };
    const q = editingPilotageProjectId ? supabase.from("pilotage_work_projects").update(payload).eq("id", editingPilotageProjectId) : supabase.from("pilotage_work_projects").insert(payload).select("id").single();
    const { data, error } = await q;
    if (error) return alert("Chantier de pilotage impossible : " + error.message + "\n\nLance le script Supabase V104 si besoin.");
    const newId = editingPilotageProjectId || data?.id;
    if (newId) { setWorkProjectFilter(newId); setWorkItemForm({ ...workItemForm, project_id: newId }); }
    resetPilotageProjectForm();
    await refreshAll();
  }
  async function deletePilotageProject(p: any) {
    const totals = pilotageProjectTotals(p.id);
    if (totals.count > 0) {
      if (!confirm(`Ce chantier contient ${totals.count} ligne(s) d'ouvrage. Supprimer le chantier ET ses lignes ?`)) return;
      const { error: itemsError } = await supabase.from("chantier_work_items").delete().eq("project_id", p.id);
      if (itemsError) return alert(itemsError.message);
    } else if (!confirm(`Supprimer le chantier ${p.name || ""} ?`)) return;
    const { error } = await supabase.from("pilotage_work_projects").delete().eq("id", p.id);
    if (error) return alert(error.message);
    if (workProjectFilter === p.id) setWorkProjectFilter("");
    await refreshAll();
  }
  function employeeIdsFromWorkItem(x: any): string[] {
    const raw = Array.isArray(x.employee_ids) ? x.employee_ids.join(",") : String(x.employee_ids || "");
    return raw.split(",").map((v: string) => v.trim()).filter(Boolean);
  }
  function employeeLabelFromIds(ids: string[], fallback?: string) {
    if (!ids.length) return fallback || "-";
    return ids.map((id: string) => { const emp = employees.find((e: any) => e.id === id); return emp ? employeeName(emp) : id; }).join(", ");
  }
  function employeeDayCost(id: string) {
    const emp = employees.find((e: any) => e.id === id);
    return Number(emp?.daily_cost || 0);
  }
  function workItemNumbers(x: any) {
    const sold = Number(x.sold_ht || 0);
    const merchandise = Number(x.merchandise_ht || 0);
    const subcontract = Number(x.subcontract_ht || 0);
    const other = Number(x.other_costs_ht || 0);
    const totalCost = merchandise + subcontract + other;
    const margin = sold - totalCost;
    const profitability = sold > 0 ? Math.round((margin / sold) * 1000) / 10 : 0;
    return { sold, laborCost: 0, merchandise, subcontract, other, totalCost, margin, profitability };
  }
  function buildWorkDateGroups(items: any[]) {
    const map: Record<string, any> = {};
    items.forEach((x: any) => {
      const date = x.realization_date || "Non daté";
      if (!map[date]) map[date] = { date, items: [], employeeIds: new Set<string>(), count: 0, sold: 0, merchandise: 0, subcontract: 0, other: 0, itemCosts: 0, laborCost: 0, totalCost: 0, margin: 0, profitability: 0 };
      const n = workItemNumbers(x);
      map[date].items.push(x); map[date].count += 1; map[date].sold += n.sold; map[date].merchandise += n.merchandise; map[date].subcontract += n.subcontract; map[date].other += n.other; map[date].itemCosts += n.totalCost;
      employeeIdsFromWorkItem(x).forEach((id: string) => map[date].employeeIds.add(id));
    });
    return Object.values(map).map((g: any) => {
      const ids = Array.from(g.employeeIds) as string[];
      g.employeeIdsList = ids;
      g.employeeNames = employeeLabelFromIds(ids);
      g.laborCost = ids.reduce((s: number, id: string) => s + employeeDayCost(id), 0);
      g.totalCost = g.itemCosts + g.laborCost;
      g.margin = g.sold - g.totalCost;
      g.profitability = g.sold > 0 ? Math.round((g.margin / g.sold) * 1000) / 10 : 0;
      return g;
    }).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  }
  const filteredWorkItems = (workItems || []).filter((x: any) => {
    const okProject = !workProjectFilter || x.project_id === workProjectFilter;
    const txt = `${x.numero || ""} ${x.designation || ""} ${x.category || ""} ${x.employee_names || ""} ${employeeLabelFromIds(employeeIdsFromWorkItem(x))} ${x.realization_date || ""} ${workProjectName(x.project_id)}`.toLowerCase();
    const okSearch = !workSearch || txt.includes(workSearch.toLowerCase());
    return okProject && okSearch;
  });
  const workDateGroups = buildWorkDateGroups(filteredWorkItems);
  const workTotals = workDateGroups.reduce((a: any, g: any) => {
    a.count += g.count; a.sold += g.sold; a.cost += g.totalCost; a.margin += g.margin; a.laborCost += g.laborCost; a.merchandise += g.merchandise;
    return a;
  }, { count: 0, sold: 0, cost: 0, margin: 0, laborCost: 0, merchandise: 0 });
  workTotals.profitability = workTotals.sold > 0 ? Math.round((workTotals.margin / workTotals.sold) * 1000) / 10 : 0;
  const selectedPilotageProject = workProjectFilter ? pilotageProjectList.find((p: any) => p.id === workProjectFilter) : null;
  const selectedProjectWorkItems = selectedPilotageProject ? filteredWorkItems : [];

  function resetWorkItemForm() { setEditingWorkItemId(null); setWorkItemForm({ ...emptyWorkItemForm, project_id: workProjectFilter || "", realization_date: formatDate(new Date()), employee_ids: [] }); }
  function editWorkItem(item: any) {
    setEditingWorkItemId(item.id);
    setWorkItemForm({
      project_id: item.project_id || "", numero: item.numero || "", designation: item.designation || "", category: item.category || "",
      quantity: String(item.quantity ?? ""), unit: item.unit || "", sold_ht: String(item.sold_ht ?? ""), realization_date: item.realization_date || formatDate(new Date()), employee_ids: employeeIdsFromWorkItem(item), employee_names: item.employee_names || "",
      merchandise_ht: String(item.merchandise_ht ?? ""), subcontract_ht: String(item.subcontract_ht ?? ""), other_costs_ht: String(item.other_costs_ht ?? ""),
      progress: String(item.progress ?? 0), notes: item.notes || ""
    });
    setTab("ouvrage-pilotage");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function saveWorkItem(e: any) {
    e.preventDefault();
    if (!workItemForm.project_id || !workItemForm.designation) return alert("Chantier et désignation obligatoires.");
    const payload = {
      project_id: workItemForm.project_id,
      numero: workItemForm.numero || null,
      designation: workItemForm.designation,
      category: workItemForm.category || null,
      quantity: Number(workItemForm.quantity || 0),
      unit: workItemForm.unit || null,
      sold_ht: Number(workItemForm.sold_ht || 0),
      realization_date: workItemForm.realization_date || null,
      employee_ids: Array.isArray(workItemForm.employee_ids) ? workItemForm.employee_ids.join(",") : String(workItemForm.employee_ids || ""),
      employee_names: employeeLabelFromIds(Array.isArray(workItemForm.employee_ids) ? workItemForm.employee_ids : [], workItemForm.employee_names || "") || null,
      planned_hours: 0,
      real_hours: 0,
      labor_rate: 0,
      merchandise_ht: Number(workItemForm.merchandise_ht || 0),
      subcontract_ht: Number(workItemForm.subcontract_ht || 0),
      other_costs_ht: Number(workItemForm.other_costs_ht || 0),
      progress: Number(workItemForm.progress || 0),
      notes: workItemForm.notes || null,
      position: Number(workItemForm.numero ? String(workItemForm.numero).replace(/\D/g, "") : workItems.length + 1) || workItems.length + 1
    };
    const q = editingWorkItemId ? supabase.from("chantier_work_items").update(payload).eq("id", editingWorkItemId) : supabase.from("chantier_work_items").insert(payload);
    const { error } = await q;
    if (error) return alert("Ouvrage impossible : " + error.message + "\n\nLance le script Supabase V100 si besoin.");
    setWorkProjectFilter(payload.project_id);
    resetWorkItemForm();
    await refreshAll();
  }
  async function deleteWorkItem(item: any) {
    if (!confirm(`Supprimer l'ouvrage ${item.designation || ""} ?`)) return;
    const { error } = await supabase.from("chantier_work_items").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await refreshAll();
  }
  async function deleteAllWorkItemsForSelectedProject() {
    if (!workProjectFilter) return alert("Ouvre d'abord un chantier de pilotage.");
    const count = selectedProjectWorkItems.length;
    if (count === 0) return alert("Aucun ouvrage à supprimer dans ce chantier.");
    if (!confirm(`Supprimer définitivement les ${count} ouvrage(s) importés de ce chantier ?`)) return;
    const { error } = await supabase.from("chantier_work_items").delete().eq("project_id", workProjectFilter);
    if (error) return alert(error.message);
    setShowProjectWorkItems(false);
    resetWorkItemForm();
    await refreshAll();
  }
  function addEmployeeToWorkItem(employeeId: string) {
    if (!employeeId) return;
    const current = Array.isArray(workItemForm.employee_ids) ? workItemForm.employee_ids : [];
    if (current.includes(employeeId)) return;
    setWorkItemForm({ ...workItemForm, employee_ids: [...current, employeeId] });
  }
  function removeEmployeeFromWorkItem(employeeId: string) {
    const current = Array.isArray(workItemForm.employee_ids) ? workItemForm.employee_ids : [];
    setWorkItemForm({ ...workItemForm, employee_ids: current.filter((id: string) => id !== employeeId) });
  }
  function resetWorkDayForm(keepDate = false) {
    setWorkDayForm({ ...emptyWorkDayForm, date: keepDate ? workDayForm.date : formatDate(new Date()), employee_ids: [], selected_item_ids: [] });
  }
  function addEmployeeToWorkDay(employeeId: string) {
    if (!employeeId) return;
    const current = Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : [];
    if (current.includes(employeeId)) return;
    setWorkDayForm({ ...workDayForm, employee_ids: [...current, employeeId] });
  }
  function removeEmployeeFromWorkDay(employeeId: string) {
    const current = Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : [];
    setWorkDayForm({ ...workDayForm, employee_ids: current.filter((id: string) => id !== employeeId) });
  }
  function toggleWorkDayItem(itemId: string) {
    const current = Array.isArray(workDayForm.selected_item_ids) ? workDayForm.selected_item_ids : [];
    setWorkDayForm({ ...workDayForm, selected_item_ids: current.includes(itemId) ? current.filter((id: string) => id !== itemId) : [...current, itemId] });
  }
  function selectAllVisibleWorkDayItems() {
    const ids = selectedProjectWorkItems.map((x: any) => x.id).filter(Boolean);
    setWorkDayForm({ ...workDayForm, selected_item_ids: ids });
  }
  function clearWorkDayItems() {
    setWorkDayForm({ ...workDayForm, selected_item_ids: [] });
  }
  async function saveWorkDayAssignment(e: any) {
    e.preventDefault();
    if (!workProjectFilter) return alert("Ouvre d'abord un chantier.");
    if (!workDayForm.date) return alert("Date obligatoire.");
    const selectedIds = Array.isArray(workDayForm.selected_item_ids) ? workDayForm.selected_item_ids : [];
    if (selectedIds.length === 0) return alert("Sélectionne au moins un ouvrage réalisé sur cette journée.");
    const employeeIds = Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : [];
    const payload = {
      realization_date: workDayForm.date,
      employee_ids: employeeIds.join(","),
      employee_names: employeeLabelFromIds(employeeIds) || null,
      progress: 100
    };
    const { error } = await supabase.from("chantier_work_items").update(payload).in("id", selectedIds).eq("project_id", workProjectFilter);
    if (error) return alert("Imputation de la journée impossible : " + error.message);
    resetWorkDayForm(true);
    await refreshAll();
  }
  async function duplicateWorkItem(item: any) {
    const payload = { ...item, id: undefined, created_at: undefined, updated_at: undefined, designation: `${item.designation || "Ouvrage"} - copie`, position: Number(item.position || 0) + 1 };
    const { error } = await supabase.from("chantier_work_items").insert(payload);
    if (error) return alert(error.message);
    await refreshAll();
  }
  function exportWorkItemsCsv() {
    const header = ["Chantier", "Date réalisation", "N°", "Désignation", "Qté", "Unité", "Prix ouvrage HT", "Marchandises HT", "Sous-traitance HT", "Autres HT", "Coût hors salariés", "Marge hors salariés", "Rentabilité %", "Avancement %", "Salariés"];
    const rows = filteredWorkItems.map((x: any) => { const n = workItemNumbers(x); return [workProjectName(x.project_id), x.realization_date || "", x.numero || "", x.designation || "", x.quantity || 0, x.unit || "", n.sold, n.merchandise, n.subcontract, n.other, n.totalCost, n.margin, n.profitability, x.progress || 0, employeeLabelFromIds(employeeIdsFromWorkItem(x), x.employee_names || "")]; });
    const csv = [header, ...rows].map(r => r.map((v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pilotage-ouvrages-asb.csv"; a.click(); URL.revokeObjectURL(url);
  }


  function normalizeObatHeader(value: any) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function numberFromObat(value: any) {
    if (typeof value === "number") return value;
    const cleaned = String(value ?? "").replace(/\s/g, "").replace(/€/g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  function findObatColumn(headers: string[], keywords: string[]) {
    return headers.findIndex((h: string) => keywords.some((k: string) => h.includes(k)));
  }
  async function importObatExcel(e: any) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!workProjectFilter) return alert("Ouvre d'abord un chantier de pilotage, puis importe le fichier OBAT.");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
      const headerIndex = rows.findIndex((r: any[]) => {
        const h = r.map(normalizeObatHeader).join(" | ");
        return h.includes("designation") && (h.includes("quantite") || h.includes("qte")) && h.includes("total");
      });
      if (headerIndex < 0) return alert("Impossible de trouver l'en-tête OBAT. Il faut les colonnes Désignation, Quantité, Unité et Total HT.");
      const headers = rows[headerIndex].map(normalizeObatHeader);
      const colNumero = findObatColumn(headers, ["numero", "n "]);
      const colDesignation = findObatColumn(headers, ["designation", "libelle"]);
      const colQty = findObatColumn(headers, ["quantite", "qte", "qt "]);
      const colUnit = findObatColumn(headers, ["unite", "unit"]);
      const colPu = findObatColumn(headers, ["prix unitaire ht", "pu ht", "p u ht", "prix u ht"]);
      const colTotal = findObatColumn(headers, ["total ht", "montant ht", "prix total ht"]);
      let currentCategory = "";
      const imported = rows.slice(headerIndex + 1).map((r: any[], idx: number) => {
        const designation = String(r[colDesignation] ?? "").trim();
        const quantity = colQty >= 0 ? numberFromObat(r[colQty]) : 0;
        const unit = colUnit >= 0 ? String(r[colUnit] ?? "").trim() : "";
        const pu = colPu >= 0 ? numberFromObat(r[colPu]) : 0;
        const total = colTotal >= 0 ? numberFromObat(r[colTotal]) : quantity * pu;
        const numero = colNumero >= 0 ? String(r[colNumero] ?? "").trim() : "";
        const lower = designation.toLowerCase();
        if (designation && !quantity && !total && !lower.includes("total") && designation.length > 2) currentCategory = designation;
        if (!designation || lower.includes("total") || (!quantity && !total)) return null;
        return {
          project_id: workProjectFilter,
          position: workItems.length + idx + 1,
          numero: numero || null,
          designation,
          category: currentCategory || null,
          quantity,
          unit: unit || null,
          sold_ht: total,
          realization_date: null,
          employee_ids: null,
          employee_names: null,
          planned_hours: 0,
          real_hours: 0,
          labor_rate: 0,
          merchandise_ht: 0,
          subcontract_ht: 0,
          other_costs_ht: 0,
          progress: 0,
          notes: `Import OBAT : ${file.name}`
        };
      }).filter(Boolean);
      if (imported.length === 0) return alert("Aucune ligne d'ouvrage exploitable trouvée dans ce fichier OBAT.");
      if (!confirm(`${imported.length} lignes OBAT vont être ajoutées au chantier ${workProjectName(workProjectFilter)}. Continuer ?`)) return;
      const { error } = await supabase.from("chantier_work_items").insert(imported);
      if (error) return alert("Import OBAT impossible : " + error.message + "\n\nVérifie que le script Supabase V100/V102 est lancé.");
      await refreshAll();
      setShowProjectWorkItems(false);
      alert(`${imported.length} lignes d'ouvrage importées depuis OBAT. Elles sont bien enregistrées dans le chantier et restent masquées sur la page principale.`);
    } catch (err: any) {
      alert("Lecture du fichier Excel impossible : " + (err?.message || err));
    }
  }

  function generateSupplierInvoicesPdf() {
    const rows = periodSupplierInvoices.map((i: any) => `<tr><td>${i.invoice_number || "—"}</td><td><b>${i.supplier || ""}</b></td><td>${projectLabel(i.project_id)}</td><td>${formatDisplayDate(i.invoice_date)}</td><td>${formatDisplayDate(i.due_date)}</td><td class="num">${money(amountTTC(i))}</td><td class="num">${money(Number(i.paid_ttc || 0))}</td><td class="num">${money(Math.max(0, amountTTC(i) - Number(i.paid_ttc || 0)))}</td><td>${i.status || ""}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Factures fournisseurs ASB</title><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:32px}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f172a;padding-bottom:16px}.logo{height:58px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.kpi{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#f8fafc}.kpi b{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0f172a;color:white;text-align:left;padding:10px}td{border-bottom:1px solid #e2e8f0;padding:9px}.num{text-align:right;font-weight:bold}.note{margin-top:24px;color:#64748b;font-size:11px}</style></head><body><div class="head"><div><h1>Factures fournisseurs</h1><p>Période : ${periodLabel}</p></div><img class="logo" src="/logo-asb.png" /></div><div class="kpis"><div class="kpi">Total HT<br><b>${money(supplierTotalHT)}</b></div><div class="kpi">TVA<br><b>${money(supplierTotalTVA)}</b></div><div class="kpi">Total TTC<br><b>${money(supplierTotalTTC)}</b></div><div class="kpi">Encours<br><b>${money(supplierOutstandingTTC)}</b></div></div><table><thead><tr><th>N°</th><th>Fournisseur</th><th>Chantier</th><th>Date</th><th>Échéance</th><th>TTC</th><th>Réglé</th><th>Encours</th><th>Statut</th></tr></thead><tbody>${rows || `<tr><td colspan="9">Aucune facture fournisseur.</td></tr>`}</tbody></table><p class="note">Document interne ASB — suivi des encours fournisseurs indépendant des règlements clients.</p><script>window.print()</script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  }

  function resetPurchaseInvoiceForm() {
    setEditingPurchaseInvoiceId(null);
    setPurchaseInvoiceForm({ project_id: "", supplier: "", invoice_number: "", category: "matériaux", amount: "", tva_rate: "20", invoice_date: formatDate(new Date()), notes: "" });
  }

  function editPurchaseInvoice(inv: any) {
    setEditingPurchaseInvoiceId(inv.id);
    setPurchaseInvoiceForm({
      project_id: inv.project_id || "",
      supplier: inv.supplier || "",
      invoice_number: inv.invoice_number || inv.label || "",
      category: inv.category || "matériaux",
      amount: String(amountHT(inv) || ""),
      tva_rate: String(inv.tva_rate ?? 20),
      invoice_date: inv.invoice_date || formatDate(new Date()),
      notes: inv.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePurchaseInvoice(e: any) {
    e.preventDefault();
    if (!editingPurchaseInvoiceId) return alert("Sélectionne une facture à modifier depuis le tableau.");
    if (!purchaseInvoiceForm.project_id || !purchaseInvoiceForm.supplier || !purchaseInvoiceForm.amount || !purchaseInvoiceForm.invoice_date) return alert("Chantier, fournisseur, montant et date obligatoires.");
    const payload = {
      project_id: purchaseInvoiceForm.project_id,
      supplier: purchaseInvoiceForm.supplier,
      invoice_number: purchaseInvoiceForm.invoice_number || null,
      label: purchaseInvoiceForm.invoice_number || purchaseInvoiceForm.supplier,
      category: purchaseInvoiceForm.category,
      ...taxPayload(purchaseInvoiceForm.amount, purchaseInvoiceForm.tva_rate),
      invoice_date: purchaseInvoiceForm.invoice_date || null,
      notes: purchaseInvoiceForm.notes
    };
    const { error } = await supabase.from("invoices").update(payload).eq("id", editingPurchaseInvoiceId);
    if (error) return alert("Modification facture impossible : " + error.message);
    resetPurchaseInvoiceForm();
    await refreshAll();
    alert("Facture d’achat modifiée.");
  }
  function paymentsForRevenue(r: any) { return clientPayments.filter((p: any) => (p.revenue_id && p.revenue_id === r.id) || (!p.revenue_id && p.project_id === r.project_id && p.invoice_number && (p.invoice_number === r.invoice_number || p.invoice_number === r.label))); }
  function paidForRevenue(r: any) { return paymentsForRevenue(r).reduce((s: number, p: any) => s + Number(p.amount_ttc || 0), 0); }
  function remainingForRevenue(r: any) { return Math.max(0, Math.round((amountTTC(r) - paidForRevenue(r)) * 100) / 100); }
  function revenuePaymentStatus(r: any) { const rest = remainingForRevenue(r); if (rest <= 0) return { label: "Payée", tone: "green" }; if (paidForRevenue(r) > 0) return { label: "Partiel", tone: "amber" }; return { label: "À encaisser", tone: "red" }; }
  function isClientPaymentPaid(p: any) { return String(p.notes || "").toLowerCase().includes("payé"); }
  function isClientPaymentReminder(p: any) { return String(p.notes || "").toLowerCase().includes("à relancer") || String(p.notes || "").toLowerCase().includes("a relancer"); }
  const clientOutstandingTotal = clientPayments
    .filter((p: any) => !isClientPaymentPaid(p))
    .reduce((s: number, p: any) => s + Number(p.amount_ttc || 0), 0);
  const allRevenueHT = revenues.reduce((s: number, r: any) => s + amountHT(r), 0);
  const allPurchasesHT = invoices.reduce((s: number, i: any) => s + amountHT(i), 0) - returns.reduce((s: number, r: any) => s + amountHT(r), 0);

  async function archiveProject(project: any, archived: boolean) {
    const { error } = await supabase.from("projects").update({ status: archived ? "archive" : "termine" }).eq("id", project.id);
    if (error) return alert(error.message);
    await refreshAll();
  }
  async function saveRevenue(e: any) {
    e.preventDefault(); if (!revenueForm.project_id || !revenueForm.amount || !revenueForm.billing_date) return alert("Chantier, montant HT et date obligatoires");
    const payload = { project_id: revenueForm.project_id, label: revenueForm.label || "Facturation client", ...taxPayload(revenueForm.amount, revenueForm.tva_rate), billing_date: revenueForm.billing_date || null, notes: revenueForm.notes };
    const query = editingRevenueId ? supabase.from("project_revenues").update(payload).eq("id", editingRevenueId) : supabase.from("project_revenues").insert(payload);
    const { error } = await query; if (error) return alert(error.message);
    setEditingRevenueId(null); setShowRevenueForm(false); setRevenueForm({ project_id: revenueForm.project_id, label: "", amount: "", tva_rate: "10", billing_date: formatDate(new Date()), notes: "" }); await refreshAll();
  }
  function editRevenue(item: any) { setEditingRevenueId(item.id); setShowRevenueForm(true); setTab("factures"); setRevenueForm({ project_id: item.project_id || "", label: item.label || "", amount: String(amountHT(item) || ""), tva_rate: String(item.tva_rate ?? 10), billing_date: item.billing_date || "", notes: item.notes || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function deleteRevenue(item: any) { if (!confirm("Supprimer cette facture client ?")) return; const { error } = await supabase.from("project_revenues").delete().eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }
  async function saveExpense(e: any) { e.preventDefault(); if (!expenseForm.name || !expenseForm.amount) return alert("Nom et montant obligatoires"); const payload = { ...expenseForm, ...taxPayload(expenseForm.amount, expenseForm.tva_rate), active: expenseForm.active }; const query = editingExpenseId ? supabase.from("company_expenses").update(payload).eq("id", editingExpenseId) : supabase.from("company_expenses").insert(payload); const { error } = await query; if (error) return alert(error.message); setEditingExpenseId(null); setShowExpenseForm(false); setExpenseForm({ name: "", category: "Charges fixes", amount: "", tva_rate: "20", frequency: "mensuelle", expense_date: formatDate(new Date()), notes: "", active: true }); await refreshAll(); }
  function editExpense(item: any) { setEditingExpenseId(item.id); setShowExpenseForm(true); setTab("charges"); setExpenseForm({ name: item.name || "", category: item.category || "Charges fixes", amount: String(amountHT(item) || ""), tva_rate: String(item.tva_rate ?? 20), frequency: item.frequency || "mensuelle", expense_date: item.expense_date || formatDate(new Date()), notes: item.notes || "", active: item.active !== false }); }
  async function deleteExpense(item: any) { if (!confirm("Supprimer cette charge ?")) return; const { error } = await supabase.from("company_expenses").delete().eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }
  async function savePayment(e: any) { e.preventDefault(); if (!paymentForm.client || !paymentForm.amount_ttc || !paymentForm.payment_date) return alert("Date, client et montant TTC obligatoires"); const payload = { project_id: paymentForm.project_id || null, revenue_id: paymentForm.revenue_id || null, client: paymentForm.client, invoice_number: paymentForm.invoice_number, amount_ttc: Math.round(Number(paymentForm.amount_ttc || 0) * 100) / 100, payment_method: paymentForm.payment_method, payment_date: paymentForm.payment_date || null, notes: paymentForm.notes }; const query = editingPaymentId ? supabase.from("client_payments").update(payload).eq("id", editingPaymentId) : supabase.from("client_payments").insert(payload); const { error } = await query; if (error) return alert(error.message); setEditingPaymentId(null); setShowPaymentForm(false); setPaymentForm({ project_id: "", revenue_id: "", client: "", invoice_number: "", amount_ttc: "", payment_method: "Virement bancaire", payment_date: formatDate(new Date()), notes: "" }); await refreshAll(); }
  function editPayment(item: any) { setEditingPaymentId(item.id); setShowPaymentForm(true); setTab("paiements"); setPaymentForm({ project_id: item.project_id || "", revenue_id: item.revenue_id || "", client: item.client || "", invoice_number: item.invoice_number || "", amount_ttc: String(item.amount_ttc || ""), payment_method: item.payment_method || "Virement bancaire", payment_date: item.payment_date || "", notes: item.notes || "" }); }
  async function deletePayment(item: any) { if (!confirm("Supprimer ce règlement client ?")) return; const { error } = await supabase.from("client_payments").delete().eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }
  async function markPaymentPaid(item: any) { const paidNote = String(item.notes || "").includes("Payé") ? item.notes : `${item.notes ? item.notes + "\n" : ""}Payé le ${formatDisplayDate(new Date())}`; const { error } = await supabase.from("client_payments").update({ notes: paidNote }).eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }
  async function markPaymentReminder(item: any) { const reminderNote = isClientPaymentReminder(item) ? item.notes : `${item.notes ? item.notes + "\n" : ""}À relancer le ${formatDisplayDate(new Date())}`; const { error } = await supabase.from("client_payments").update({ notes: reminderNote }).eq("id", item.id); if (error) return alert(error.message); await refreshAll(); }

  function preparePaymentForRevenue(r: any, full = false) {
    const project = projects.find((p: any) => p.id === r.project_id);
    setEditingPaymentId(null);
    setShowPaymentForm(true);
    setTab("paiements");
    setPaymentForm({ project_id: r.project_id || "", revenue_id: r.id || "", client: project?.client || "", invoice_number: r.invoice_number || r.label || "", amount_ttc: String(full ? remainingForRevenue(r) : ""), payment_method: "Virement bancaire", payment_date: formatDate(new Date()), notes: full ? "Facture soldée" : "Paiement partiel" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function markRevenuePaid(r: any) {
    const rest = remainingForRevenue(r);
    if (rest <= 0) return alert("Cette facture est déjà soldée.");
    const project = projects.find((p: any) => p.id === r.project_id);
    const { error } = await supabase.from("client_payments").insert({ project_id: r.project_id || null, revenue_id: r.id || null, client: project?.client || "", invoice_number: r.invoice_number || r.label || "", amount_ttc: rest, payment_method: "Virement bancaire", payment_date: formatDate(new Date()), notes: "Facture marquée payée" });
    if (error) return alert(error.message);
    await refreshAll();
  }
  function generateAccountingPdfFromGestion() {
    const rows = searchedAccountingProjects.map((p: any) => ({ project: p, stats: projectStats(p.id, true) })).filter((x: any) => x.stats.revenueTotal > 0 || x.stats.supplierTotal > 0 || x.stats.laborTotal > 0);
    const totalRevenue = rows.reduce((s: number, x: any) => s + x.stats.revenueTotal, 0);
    const totalRevenueTVA = rows.reduce((s: number, x: any) => s + x.stats.revenueTVA, 0);
    const totalPurchases = rows.reduce((s: number, x: any) => s + x.stats.supplierTotal, 0);
    const totalPurchasesTVA = rows.reduce((s: number, x: any) => s + x.stats.netDeductibleTVA, 0);
    const totalLabor = rows.reduce((s: number, x: any) => s + x.stats.laborTotal, 0);
    const totalCharges = expensesHT;
    const totalChargesTVA = expensesTVA;
    const totalTvaDeductible = totalPurchasesTVA + totalChargesTVA;
    const totalTvaBalance = totalRevenueTVA - totalTvaDeductible;
    const totalMargin = totalRevenue - totalPurchases - totalLabor;
    const marginRate = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;
    const tvaLabel = totalTvaBalance >= 0 ? "TVA due" : "TVA récupérable";
    const tvaClass = totalTvaBalance >= 0 ? "red" : "green";
    const html = `
      <html>
        <head>
          <title>Rapport comptable ASB - ${periodLabel}</title>
          <style>
            @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#e5e7eb;color:#0f172a;margin:0}.page{max-width:1040px;margin:auto;background:white;padding:28px}.header{display:flex;justify-content:space-between;gap:18px;border-bottom:4px solid #0f172a;padding-bottom:16px}.logo{height:64px}.title{margin:0;font-size:30px;letter-spacing:-.04em}.muted{color:#64748b}.badge{display:inline-block;border-radius:999px;padding:8px 14px;background:#0f172a;color:white;font-weight:900}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.card{border:1px solid #e2e8f0;border-radius:20px;background:#f8fafc;padding:14px}.card b{font-size:11px;text-transform:uppercase;color:#475569}.value{font-size:23px;font-weight:900;margin-top:6px}.green{color:#047857}.red{color:#b91c1c}.blue{color:#1d4ed8}.purple{color:#7e22ce}.section{margin-top:24px;break-inside:avoid}h2{font-size:18px;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0f172a;color:white;text-align:left;padding:9px}td{padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top}.num{text-align:right;white-space:nowrap}.summary{margin-top:20px;border-radius:24px;padding:18px;background:#f8fafc;border-left:10px solid #0f172a}.note{margin-top:22px;font-size:11px;color:#64748b}@media print{body{background:white}.page{padding:0}}
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <img class="logo" src="/logo-asb.png" />
                <h1 class="title">Rapport comptable — pilotage</h1>
                <p class="muted">Période : <b>${periodLabel}</b></p>
                <p class="muted">Inclut les chantiers actifs et archivés dans le CA.</p>
              </div>
              <div style="text-align:right"><div class="badge">ASB Intranet</div><p class="muted">Généré depuis Gestion</p></div>
            </div>
            <div class="grid">
              <div class="card"><b>CA HT</b><div class="value green">${money(totalRevenue)}</div><div class="muted">Factures clients</div></div>
              <div class="card"><b>TVA collectée</b><div class="value blue">${money(totalRevenueTVA)}</div><div class="muted">Sur facturation</div></div>
              <div class="card"><b>Dépenses HT</b><div class="value red">${money(totalPurchases + totalCharges)}</div><div class="muted">Achats + charges fixes</div></div>
              <div class="card"><b>${tvaLabel}</b><div class="value ${tvaClass}">${money(Math.abs(totalTvaBalance))}</div><div class="muted">Collectée - déductible</div></div>
            </div>
            <div class="grid">
              <div class="card"><b>Achats HT</b><div class="value red">${money(totalPurchases)}</div></div>
              <div class="card"><b>Main d'œuvre</b><div class="value purple">${money(totalLabor)}</div></div>
              <div class="card"><b>Charges fixes HT</b><div class="value purple">${money(totalCharges)}</div></div>
              <div class="card"><b>Marge chantier</b><div class="value ${totalMargin >= 0 ? "green" : "red"}">${money(totalMargin)} · ${marginRate}%</div></div>
            </div>
            <div class="summary">
              <b>Synthèse TVA</b>
              <p>TVA collectée : <b>${money(totalRevenueTVA)}</b> · TVA déductible achats : <b>${money(totalPurchasesTVA)}</b> · TVA déductible charges : <b>${money(totalChargesTVA)}</b> · Solde : <b class="${tvaClass}">${tvaLabel} ${money(Math.abs(totalTvaBalance))}</b></p>
            </div>
            <div class="section">
              <h2>Répartition du CA HT par chantier</h2>
              <table><thead><tr><th>Chantier</th><th>Client</th><th>Statut</th><th class="num">CA HT</th><th class="num">TVA collectée</th><th class="num">Achats HT</th><th class="num">MO</th><th class="num">Marge</th><th class="num">Rentabilité</th></tr></thead><tbody>
                ${rows.map((x: any) => `<tr><td><b>${x.project.name}</b></td><td>${x.project.client || ""}</td><td>${x.project.status === "archive" ? "Archivé" : "Actif"}</td><td class="num">${money(x.stats.revenueTotal)}</td><td class="num">${money(x.stats.revenueTVA)}</td><td class="num">${money(x.stats.supplierTotal)}</td><td class="num">${money(x.stats.laborTotal)}</td><td class="num">${money(x.stats.margin)}</td><td class="num">${x.stats.marginRate}%</td></tr>`).join("") || `<tr><td colspan="9">Aucune donnée sur cette période.</td></tr>`}
              </tbody></table>
            </div>
            <p class="note">Document interne ASB — rapport comptable de pilotage. Les chantiers archivés sont inclus dans le CA et la TVA de la période.</p>
          </div>
        </body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Popup bloquée. Autorise les popups pour générer le rapport comptable.");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  function generateProjectPdfFromGestion(project: any) {
    // IMPORTANT V79 : le rapport PDF doit utiliser exactement le même périmètre que la vue complète chantier.
    // La vue complète affiche toute la vie du chantier, sans filtre de période.
    const s = projectStats(project.id, false);
    const projectRevenues = revenues.filter((r: any) => r.project_id === project.id);
    const projectInvoices = invoices.filter((i: any) => i.project_id === project.id);
    const projectReturns = returns.filter((r: any) => r.project_id === project.id);
    const projectPlanning = planning.filter((p: any) => p.project_id === project.id);
    const statusColor = s.margin >= 0 ? "#10b981" : "#ef4444";
    const statusLabel = s.margin >= 0 ? "Rentable" : "À surveiller";
    const employeeLabel = (id: string) => {
      const e = employees.find((x: any) => x.id === id);
      return e ? `${e.firstname || ""} ${e.lastname || ""}`.trim() || "Salarié" : (planning.find((p: any) => p.employee_id === id)?.employee_name_snapshot || "Salarié non défini");
    };
    const pct = (value: number, total: number) => total > 0 ? Math.max(0, Math.round((value / total) * 100)) : 0;
    const revenueTTC = projectRevenues.reduce((sum: number, r: any) => sum + amountTTC(r), 0);
    const purchasesTTC = projectInvoices.reduce((sum: number, i: any) => sum + amountTTC(i), 0);
    const returnsTTC = projectReturns.reduce((sum: number, r: any) => sum + amountTTC(r), 0);
    const tvaTotal = Math.max(1, s.revenueTVA + s.netDeductibleTVA);
    const costTotalForPie = Math.max(1, s.supplierTotal + s.laborTotal + Math.max(0, s.margin));
    const pSupplier = pct(s.supplierTotal, costTotalForPie);
    const pLabor = pct(s.laborTotal, costTotalForPie);
    const pMargin = Math.max(0, 100 - pSupplier - pLabor);
    const pCollectee = pct(s.revenueTVA, tvaTotal);
    const pDeductible = Math.max(0, 100 - pCollectee);
    const totalCosts = s.supplierTotal + s.laborTotal;
    const soldeClass = s.tvaBalance >= 0 ? "tva-due" : "tva-credit";
    const soldeLabel = s.tvaBalance >= 0 ? "TVA due" : "TVA récupérable";
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
            .charts{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:22px}.chartbox{border:1px solid #e2e8f0;border-radius:24px;padding:18px;background:#f8fafc}.pie{width:190px;height:190px;border-radius:50%;margin:10px auto;border:10px solid white;box-shadow:0 10px 24px rgba(15,23,42,.12)}.legend{display:grid;gap:7px;font-size:12px}.legend span{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px}.c1{background:#0ea5e9}.c2{background:#f59e0b}.c3{background:#10b981}.c4{background:#ef4444}.note{margin-top:22px;font-size:11px;color:#64748b}.pagebreak{break-before:page}.tva-due{color:#b91c1c}.tva-credit{color:#047857}
            @media print{body{background:white}.page{padding:0}.charts{break-inside:avoid}}
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <img class="logo" src="/logo-asb.png" />
                <h1 class="title">Rapport gestion / rentabilité V79</h1>
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
              <div class="card"><b>${soldeLabel}</b><div class="value ${soldeClass}">${money(Math.abs(s.tvaBalance))}</div><div class="small">Collectée - déductible</div></div>
              <div class="card"><b>Total coûts HT</b><div class="value">${money(totalCosts)}</div><div class="small">Achats nets + main d'œuvre</div></div>
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
                <div class="legend"><div><span class="c1"></span>TVA collectée : ${money(s.revenueTVA)} (${pCollectee}%)</div><div><span class="c3"></span>TVA déductible nette : ${money(s.netDeductibleTVA)} (${pDeductible}%)</div><div><b>Solde TVA :</b> <span class="${soldeClass}">${soldeLabel} ${money(Math.abs(s.tvaBalance))}</span></div></div>
              </div>
            </div>
            <div class="section pagebreak">
              <h2>Facturation client — détail TVA collectée</h2>
              <table><thead><tr><th>Libellé</th><th>Date</th><th class="num">HT</th><th class="num">Taux</th><th class="num">TVA collectée</th><th class="num">TTC</th><th>Notes</th></tr></thead><tbody>
                ${projectRevenues.map((r: any) => `<tr><td><b>${r.label || "Facturation client"}</b></td><td>${r.billing_date || ""}</td><td class="num">${money(amountHT(r))}</td><td class="num">${Number(r.tva_rate ?? 0).toFixed(2).replace('.', ',')}%</td><td class="num">${money(amountTVA(r))}</td><td class="num">${money(amountTTC(r))}</td><td>${r.notes || ""}</td></tr>`).join("") || `<tr><td colspan="7">Aucune facturation client enregistrée.</td></tr>`}
              </tbody></table>
            </div>
            <div class="section">
              <h2>Factures fournisseurs — détail TVA déductible</h2>
              <table><thead><tr><th>Fournisseur</th><th>Date</th><th class="num">HT</th><th class="num">Taux</th><th class="num">TVA déductible</th><th class="num">TTC</th><th>Notes</th></tr></thead><tbody>
                ${projectInvoices.map((i: any) => `<tr><td><b>${i.supplier || "Fournisseur"}</b></td><td>${i.invoice_date || ""}</td><td class="num">${money(amountHT(i))}</td><td class="num">${Number(i.tva_rate ?? 0).toFixed(2).replace('.', ',')}%</td><td class="num">${money(amountTVA(i))}</td><td class="num">${money(amountTTC(i))}</td><td>${i.notes || ""}</td></tr>`).join("") || `<tr><td colspan="7">Aucune facture fournisseur enregistrée.</td></tr>`}
              </tbody></table>
            </div>
            <div class="section">
              <h2>Retours marchandise — TVA déductible corrigée</h2>
              <table><thead><tr><th>Fournisseur</th><th>Date</th><th class="num">HT déduit</th><th class="num">Taux</th><th class="num">TVA corrigée</th><th class="num">TTC déduit</th><th>Notes</th></tr></thead><tbody>
                ${projectReturns.map((r: any) => `<tr><td><b>${r.supplier || "Retour"}</b></td><td>${r.return_date || ""}</td><td class="num">-${money(amountHT(r))}</td><td class="num">${Number(r.tva_rate ?? 0).toFixed(2).replace('.', ',')}%</td><td class="num">-${money(amountTVA(r))}</td><td class="num">-${money(amountTTC(r))}</td><td>${r.notes || ""}</td></tr>`).join("") || `<tr><td colspan="7">Aucun retour marchandise.</td></tr>`}
              </tbody></table>
            </div>
            <div class="section">
              <h2>Temps salariés / planning</h2>
              <table><thead><tr><th>Salarié</th><th>Début</th><th>Fin</th><th class="num">Jours</th><th class="num">Coût jour</th><th class="num">Coût estimé</th></tr></thead><tbody>
                ${projectPlanning.map((pl: any) => { const days = daysBetween(pl.start_date, pl.end_date); const cost = employeeCost(pl.employee_id, pl); return `<tr><td><b>${employeeLabel(pl.employee_id)}</b></td><td>${pl.start_date || ""}</td><td>${pl.end_date || ""}</td><td class="num">${days}</td><td class="num">${money(cost)}</td><td class="num">${money(days * cost)}</td></tr>`; }).join("") || `<tr><td colspan="6">Aucun temps salarié lié au chantier.</td></tr>`}
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

  function SimplePie({ values }: any) {
    const cleanValues = values.filter((v: any) => Math.max(0, Number(v.value || 0)) > 0);
    const total = cleanValues.reduce((s: number, v: any) => s + Math.max(0, Number(v.value || 0)), 0) || 1;
    let acc = 0;
    const colors = ["#0f172a", "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
    const stops = (cleanValues.length ? cleanValues : [{ label: "Aucune donnée", value: 1 }]).map((v: any, i: number) => { const from = acc; acc += (Math.max(0, Number(v.value || 0)) / total) * 100; return `${colors[i % colors.length]} ${from}% ${acc}%`; }).join(", ");
    return <div className="flex flex-wrap items-center gap-6">
      <div className="relative grid h-44 w-44 place-items-center rounded-full shadow-xl ring-1 ring-slate-200" style={{ background: `conic-gradient(${stops})` }}>
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner ring-1 ring-slate-100"><div><p className="text-[10px] font-black uppercase text-slate-400">Total</p><p className="text-sm font-black text-slate-900">{money(total)}</p></div></div>
      </div>
      <div className="min-w-56 flex-1 space-y-2">{(cleanValues.length ? cleanValues : [{ label: "Aucune donnée", value: 0 }]).map((v: any, i: number) => { const value = Math.max(0, Number(v.value || 0)); const percent = total ? Math.round((value / total) * 100) : 0; return <div key={v.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"><div className="flex items-center justify-between gap-3 text-sm font-black"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }} />{v.label}</span><span>{percent}%</span></div><div className="mt-1 text-xs font-bold text-slate-500">{money(v.value)}</div></div>; })}</div>
    </div>;
  }

  const tabButton = (id: string, label: string) => <Button className="min-h-11 px-5 shadow-sm" variant={tab === id ? "primary" : "secondary"} onClick={() => setTab(id)}>{label}</Button>;

  const visiblePurchaseInvoices = periodActiveInvoices;
  const actionCard = (id: string, icon: string, title: string, sub: string, tone: string) => (
    <button onClick={() => setTab(id)} className="group flex min-h-[92px] items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-center gap-4"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl text-white shadow-sm ${tone}`}>{icon}</span><span><b className="block text-lg font-black text-slate-900">{title}</b><span className="text-sm font-semibold text-slate-500">{sub}</span></span></div>
      <span className="text-3xl font-black text-slate-400 group-hover:text-slate-900">›</span>
    </button>
  );


  function openProjectFullDetail(project: any) {
    setSelectedDetailProject(project);
    setTab("chantier-full-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (tab === "chantier-full-detail" && selectedDetailProject) {
    const p = selectedDetailProject;
    const s = projectStats(p.id, false);
    const projectPhotos = photos.filter((x: any) => x.project_id === p.id);
    const projectDocs = docs.filter((x: any) => x.project_id === p.id);
    const projectNotes = notes.filter((x: any) => x.project_id === p.id);
    const projectMaterials = materials.filter((x: any) => x.project_id === p.id);
    const projectVigilance = vigilance.filter((x: any) => x.project_id === p.id);
    const projectInvoices = invoices.filter((x: any) => x.project_id === p.id);
    const projectRevenues = revenues.filter((x: any) => x.project_id === p.id);
    const projectReturns = returns.filter((x: any) => x.project_id === p.id);
    const projectPlanning = planning.filter((x: any) => x.project_id === p.id);
    return <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button><h1 className="mt-3 text-3xl font-black text-slate-900">Vue complète chantier — {p.name}</h1><p className="text-sm text-slate-500">Gestion financière complète du chantier, sans filtre de période, identique au rapport PDF.</p></div>
        <Button variant="secondary" onClick={() => generateProjectPdfFromGestion(p)}>Rapport PDF</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-6"><Card className="border-l-4 border-emerald-500"><p className="text-xs font-black uppercase text-slate-500">CA HT</p><p className="mt-2 text-xl font-black text-emerald-700">{money(s.revenueTotal)}</p></Card><Card className="border-l-4 border-red-500"><p className="text-xs font-black uppercase text-slate-500">Achats HT</p><p className="mt-2 text-xl font-black text-red-600">{money(s.supplierTotal)}</p></Card><Card className="border-l-4 border-blue-500"><p className="text-xs font-black uppercase text-slate-500">MO</p><p className="mt-2 text-xl font-black text-blue-700">{money(s.laborTotal)}</p></Card><Card className="border-l-4 border-slate-500"><p className="text-xs font-black uppercase text-slate-500">Marge</p><p className={s.margin >= 0 ? "mt-2 text-xl font-black text-emerald-700" : "mt-2 text-xl font-black text-red-600"}>{money(s.margin)}</p></Card><Card className="border-l-4 border-purple-500"><p className="text-xs font-black uppercase text-slate-500">TVA</p><p className="mt-2 text-xl font-black text-purple-700">{money(Math.abs(s.tvaBalance))}</p><p className="text-xs text-slate-500">{s.tvaBalance >= 0 ? "TVA due" : "TVA récupérable"}</p></Card><Card className="border-l-4 border-emerald-500"><p className="text-xs font-black uppercase text-slate-500">Rentabilité</p><p className={s.marginRate >= 0 ? "mt-2 text-xl font-black text-emerald-700" : "mt-2 text-xl font-black text-red-600"}>{s.marginRate}%</p></Card></div>
      <div className="grid gap-5 xl:grid-cols-3"><Card><h3 className="mb-3 text-lg font-black">Informations chantier</h3><div className="space-y-2 text-sm"><p><b>Client :</b> {p.client || "Non renseigné"}</p><p><b>Adresse :</b> {p.address || "Non renseignée"}</p><p><b>Statut :</b> {p.status === "archive" ? "Archivé" : "Actif"}</p><p><b>Début :</b> {formatDisplayDate(p.start_date)}</p><p><b>Fin prévue :</b> {formatDisplayDate(p.end_date)}</p><p><b>Description :</b><br />{p.description || "Aucune description."}</p></div></Card><Card><h3 className="mb-3 text-lg font-black">Répartition chantier HT</h3><SimplePie values={[{ label: "CA HT", value: s.revenueTotal }, { label: "Achats HT", value: s.supplierTotal }, { label: "Main d’œuvre", value: s.laborTotal }]} /></Card><Card><h3 className="mb-3 text-lg font-black">Documents chantier</h3><div className="space-y-2">{projectDocs.slice(0, 8).map((d: any) => <a key={d.id} href={d.file_url} target="_blank" className="flex justify-between rounded-2xl border bg-slate-50 p-3 text-sm font-bold"><span>{d.name || "Document"}</span><span>Voir</span></a>)}{projectDocs.length === 0 && <p className="text-sm text-slate-500">Aucun document.</p>}</div></Card></div>
      <Card><h3 className="mb-4 text-lg font-black">Photos du chantier</h3><div className="grid gap-3 md:grid-cols-4">{projectPhotos.slice(0, 12).map((ph: any) => <a key={ph.id} href={ph.file_url} target="_blank" className="block overflow-hidden rounded-2xl border bg-white"><img src={ph.file_url} className="h-36 w-full object-cover" /><div className="p-2 text-xs font-bold">{ph.title || "Photo"}</div></a>)}{projectPhotos.length === 0 && <p className="text-sm text-slate-500">Aucune photo.</p>}</div></Card>
      <div className="grid gap-5 xl:grid-cols-2"><Card><h3 className="mb-4 text-lg font-black">Factures clients</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Libellé</th><th className="p-3">HT</th><th className="p-3">TVA</th><th className="p-3">TTC</th></tr></thead><tbody>{projectRevenues.map((r: any) => <tr key={r.id} className="border-t"><td className="p-3">{formatDisplayDate(r.billing_date)}</td><td className="p-3 font-bold">{r.label || "Facturation client"}</td><td className="p-3">{money(amountHT(r))}</td><td className="p-3">{money(amountTVA(r))}</td><td className="p-3 font-black">{money(amountTTC(r))}</td></tr>)}{projectRevenues.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Aucune facture client.</td></tr>}</tbody></table></div></Card><Card><h3 className="mb-4 text-lg font-black">Achats, retours et main d’œuvre</h3><div className="space-y-4"><div><b>Factures d’achats</b>{projectInvoices.map((i: any) => <div key={i.id} className="mt-2 rounded-xl bg-red-50 p-3 text-sm">{formatDisplayDate(i.invoice_date)} · {i.supplier || "Fournisseur"} · <b>{money(amountHT(i))} HT</b></div>)}{projectInvoices.length === 0 && <p className="text-sm text-slate-500">Aucun achat.</p>}</div><div><b>Retours</b>{projectReturns.map((r: any) => <div key={r.id} className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm">{formatDisplayDate(r.return_date)} · {r.supplier || "Retour"} · <b>{money(amountHT(r))} HT</b></div>)}{projectReturns.length === 0 && <p className="text-sm text-slate-500">Aucun retour.</p>}</div><div><b>Main d’œuvre / planning</b>{projectPlanning.map((pl: any) => <div key={pl.id} className="mt-2 rounded-xl bg-blue-50 p-3 text-sm"><b>{employeeNameById(pl.employee_id)}</b> · {formatDisplayRange(pl.start_date, pl.end_date)} · {daysBetween(pl.start_date, pl.end_date)} jour(s) · <b>{money(daysBetween(pl.start_date, pl.end_date) * employeeCost(pl.employee_id))}</b></div>)}{projectPlanning.length === 0 && <p className="text-sm text-slate-500">Aucune main d’œuvre liée.</p>}</div></div></Card></div>
      <div className="grid gap-5 xl:grid-cols-3"><Card><h3 className="mb-3 text-lg font-black">Notes</h3>{projectNotes.map((n: any) => <div key={n.id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm"><b>{n.title || "Note"}</b><p>{n.content || n.note || ""}</p></div>)}{projectNotes.length === 0 && <p className="text-sm text-slate-500">Aucune note.</p>}</Card><Card><h3 className="mb-3 text-lg font-black">Matériel à prévoir</h3>{projectMaterials.map((m: any) => <div key={m.id} className="mb-2 rounded-xl bg-amber-50 p-3 text-sm"><b>{m.title || "Matériel"}</b><p>{m.content || m.description || ""}</p></div>)}{projectMaterials.length === 0 && <p className="text-sm text-slate-500">Aucun matériel.</p>}</Card><Card><h3 className="mb-3 text-lg font-black">Points de vigilance</h3>{projectVigilance.map((v: any) => <div key={v.id} className="mb-2 rounded-xl bg-red-50 p-3 text-sm"><b>{v.title || "Vigilance"}</b><p>{v.content || v.description || ""}</p></div>)}{projectVigilance.length === 0 && <p className="text-sm text-slate-500">Aucun point de vigilance.</p>}</Card></div>
    </div>;
  }

  if (tab === "supplier-invoices") {
    const statusTone = (st: string) => st === "Réglée" ? "green" : st === "Partiellement réglée" ? "amber" : "blue";
    return <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black text-slate-900">Factures fournisseurs</h1><p className="text-sm text-slate-500">Module indépendant : ajout, modification, suppression et suivi des encours fournisseurs.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={generateSupplierInvoicesPdf}>Exporter PDF</Button><Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button></div>
      </div>
      <div className="grid gap-4 md:grid-cols-5"><Card><p className="text-xs font-black uppercase text-slate-500">Factures</p><p className="mt-2 text-3xl font-black">{periodSupplierInvoices.length}</p></Card><Card><p className="text-xs font-black uppercase text-slate-500">Total HT</p><p className="mt-2 text-2xl font-black">{money(supplierTotalHT)}</p></Card><Card><p className="text-xs font-black uppercase text-slate-500">Total TTC</p><p className="mt-2 text-2xl font-black">{money(supplierTotalTTC)}</p></Card><Card className="border-l-4 border-red-500"><p className="text-xs font-black uppercase text-slate-500">Encours fournisseurs</p><p className="mt-2 text-2xl font-black text-red-600">{money(supplierOutstandingTTC)}</p></Card><Card className="border-l-4 border-emerald-500"><p className="text-xs font-black uppercase text-slate-500">Réglé</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(supplierPaidTTC)}</p></Card></div>
      <Card><h2 className="mb-4 text-xl font-black">{editingSupplierInvoiceId ? "Modifier la facture fournisseur" : "Ajouter une facture fournisseur"}</h2><form onSubmit={saveSupplierInvoice} className="grid gap-3 md:grid-cols-4"><Field label="Fournisseur *"><Input required value={supplierInvoiceForm.supplier} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, supplier: e.target.value })} /></Field><Field label="N° facture"><Input value={supplierInvoiceForm.invoice_number} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, invoice_number: e.target.value })} /></Field><Field label="Chantier lié"><Select value={supplierInvoiceForm.project_id} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, project_id: e.target.value })}><option value="">Aucun</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{projectLabel(p.id)}</option>)}</Select></Field><Field label="Catégorie"><Input value={supplierInvoiceForm.category} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, category: e.target.value })} /></Field><Field label="Date facture *"><Input required type="date" value={supplierInvoiceForm.invoice_date} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, invoice_date: e.target.value })} /></Field><Field label="Échéance"><Input type="date" value={supplierInvoiceForm.due_date} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, due_date: e.target.value })} /></Field><Field label="Montant HT *"><Input required type="number" step="0.01" value={supplierInvoiceForm.amount} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, amount: e.target.value })} /></Field><Field label="TVA"><Select value={supplierInvoiceForm.tva_rate} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field><Field label="Déjà réglé TTC"><Input type="number" step="0.01" value={supplierInvoiceForm.paid_ttc} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, paid_ttc: e.target.value })} /></Field><Field label="Statut"><Select value={supplierInvoiceForm.status} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, status: e.target.value })}><option>En attente</option><option>Partiellement réglée</option><option>Réglée</option></Select></Field><Field label="Notes"><Input value={supplierInvoiceForm.notes} onChange={(e: any) => setSupplierInvoiceForm({ ...supplierInvoiceForm, notes: e.target.value })} /></Field><div className="flex items-end gap-2"><Button>{editingSupplierInvoiceId ? "Modifier" : "+ Ajouter"}</Button><Button type="button" variant="secondary" onClick={resetSupplierInvoiceForm}>Nouveau</Button></div></form></Card>
      <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">N° facture</th><th className="p-4">Fournisseur</th><th className="p-4">Chantier</th><th className="p-4">Date</th><th className="p-4">Échéance</th><th className="p-4">TTC</th><th className="p-4">Réglé</th><th className="p-4">Encours</th><th className="p-4">Statut</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{periodSupplierInvoices.map((inv: any) => { const encours = Math.max(0, amountTTC(inv) - Number(inv.paid_ttc || 0)); return <tr key={inv.id} className="border-t"><td className="p-4 font-black">{inv.invoice_number || "—"}</td><td className="p-4">{inv.supplier}</td><td className="p-4">{inv.project_id ? projectLabel(inv.project_id) : "—"}</td><td className="p-4">{formatDisplayDate(inv.invoice_date)}</td><td className="p-4">{formatDisplayDate(inv.due_date)}</td><td className="p-4 font-black">{money(amountTTC(inv))}</td><td className="p-4">{money(Number(inv.paid_ttc || 0))}</td><td className="p-4 font-black text-red-600">{money(encours)}</td><td className="p-4"><Badge tone={statusTone(inv.status)}>{inv.status || "En attente"}</Badge></td><td className="p-4"><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => duplicateSupplierInvoice(inv)}>Dupliquer</Button><Button variant="amber" onClick={() => editSupplierInvoice(inv)}>Modifier</Button><Button variant="danger" onClick={() => deleteSupplierInvoice(inv)}>Suppr.</Button></div></td></tr>; })}{periodSupplierInvoices.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate-500">Aucune facture fournisseur sur la période.</td></tr>}</tbody></table></div></Card>
    </div>;
  }

  if (tab === "paiements") {
    const visiblePayments = clientPayments;
    const totalPayments = visiblePayments.reduce((s: number, p: any) => s + Number(p.amount_ttc || 0), 0);
    return <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">Règlements clients hors intranet</h1><p className="text-sm text-slate-500">Gestion simple type Excel : date, client, n° facture, montant TTC, moyen de paiement. Non lié aux chantiers.</p></div><Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button></div>
      
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Ajouter / modifier un règlement</h2><p className="text-sm text-slate-500">La date est obligatoire.</p></div><Button onClick={() => { setEditingPaymentId(null); setShowPaymentForm(!showPaymentForm); setPaymentForm({ project_id: "", revenue_id: "", client: "", invoice_number: "", amount_ttc: "", payment_method: "Virement bancaire", payment_date: formatDate(new Date()), notes: "" }); }}>{showPaymentForm ? "Fermer" : "+ Règlement"}</Button></div>
        {showPaymentForm && <form onSubmit={savePayment} className="mt-4 grid gap-3 md:grid-cols-5"><Field label="Date *"><Input required type="date" value={paymentForm.payment_date} onChange={(e: any) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></Field><Field label="Client *"><Input required value={paymentForm.client} onChange={(e: any) => setPaymentForm({ ...paymentForm, client: e.target.value })} placeholder="Nom client" /></Field><Field label="N° facture"><Input value={paymentForm.invoice_number} onChange={(e: any) => setPaymentForm({ ...paymentForm, invoice_number: e.target.value })} /></Field><Field label="Montant TTC *"><Input required type="number" step="0.01" value={paymentForm.amount_ttc} onChange={(e: any) => setPaymentForm({ ...paymentForm, amount_ttc: e.target.value })} /></Field><Field label="Moyen"><Select value={paymentForm.payment_method} onChange={(e: any) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}><option>Virement bancaire</option><option>Chèque</option><option>Carte bancaire</option><option>Espèces</option><option>Prélèvement</option><option>Autre</option></Select></Field><div className="md:col-span-5"><Field label="Notes"><Textarea value={paymentForm.notes} onChange={(e: any) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></Field></div><div className="md:col-span-5 flex gap-2"><Button type="submit">{editingPaymentId ? "Modifier" : "Enregistrer"}</Button><Button type="button" variant="secondary" onClick={() => { setEditingPaymentId(null); setShowPaymentForm(false); }}>Annuler</Button></div></form>}
      </Card>
      <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Liste des règlements clients</h2><Badge tone="blue">{visiblePayments.length}</Badge></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Client</th><th className="p-3">N° facture</th><th className="p-3 text-right">Montant TTC</th><th className="p-3">Moyen</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{visiblePayments.map((p: any) => <tr key={p.id} className={isClientPaymentPaid(p) ? "border-b bg-emerald-50 text-emerald-950" : isClientPaymentReminder(p) ? "border-b bg-amber-50 text-amber-950" : "border-b"}><td className="p-3 font-bold">{formatDisplayDate(p.payment_date)}</td><td className="p-3">{p.client}</td><td className="p-3">{p.invoice_number || "—"}</td><td className="p-3 text-right font-black">{money(Number(p.amount_ttc || 0))}</td><td className="p-3">{p.payment_method || "—"}</td><td className="p-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => editPayment(p)}>Modifier</Button><Button variant="amber" onClick={() => markPaymentReminder(p)}>À relancer</Button><Button variant="green" onClick={() => markPaymentPaid(p)}>{isClientPaymentPaid(p) ? "Payé ✓" : "Payé"}</Button><Button variant="danger" onClick={() => deletePayment(p)}>Supprimer</Button></div></td></tr>)}{visiblePayments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucun règlement enregistré.</td></tr>}</tbody></table></div></Card>
    </div>;
  }


  if (tab === "calcul-rentabilite") {
    const quoteInputAmount = Number(quoteForm.revenue_ht || 0);
    const quoteRate = Number(quoteForm.tva_rate || 0);
    const quoteRevenueHT = quoteForm.input_mode === "TTC" ? Math.round((quoteInputAmount / (1 + quoteRate / 100)) * 100) / 100 : quoteInputAmount;
    const quoteTVA = Math.round((quoteRevenueHT * quoteRate / 100) * 100) / 100;
    const quoteTTC = quoteRevenueHT + quoteTVA;
    function quoteExpenseHT(x: any) { const rate = Number(x.tva_rate ?? 20); const amount = Number(x.amount || 0); return x.amount_mode === "TTC" ? Math.round((amount / (1 + rate / 100)) * 100) / 100 : amount; }
    function quoteExpenseTVA(x: any) { const ht = quoteExpenseHT(x); return Math.round((ht * Number(x.tva_rate ?? 20) / 100) * 100) / 100; }
    const quoteExpensesTotal = quoteExpenses.reduce((s: number, x: any) => s + quoteExpenseHT(x), 0);
    const quoteExpensesTVA = quoteExpenses.reduce((s: number, x: any) => s + quoteExpenseTVA(x), 0);
    const quoteExpensesTTC = quoteExpensesTotal + quoteExpensesTVA;
    const quoteLaborTotal = quoteLabor.reduce((s: number, x: any) => s + (Number(x.days || 0) * Number(x.daily_cost || 0)), 0);
    const quoteFixedCosts = Number(quoteForm.fixed_costs || 0);
    const quoteTotalCosts = quoteExpensesTotal + quoteLaborTotal + quoteFixedCosts;
    const quoteTvaBalance = quoteTVA - quoteExpensesTVA;
    const quoteMargin = quoteRevenueHT - quoteTotalCosts;
    const quoteMarginRate = quoteRevenueHT > 0 ? Math.round((quoteMargin / quoteRevenueHT) * 100) : 0;
    const quoteMarkupRate = quoteTotalCosts > 0 ? Math.round((quoteMargin / quoteTotalCosts) * 100) : 0;
    const expenseChoices = Array.from(new Set(["Matériaux", "Sous-traitance", "Location / engins", "Fournitures", "Décharge", "Transport", "Autre", ...companyExpenses.map((e: any) => e.name), ...invoices.map((i: any) => i.supplier || i.label)].filter(Boolean)));
    const activeProjects = projects.filter((p: any) => p.status !== "archive");
    const selectedQuoteProject = projects.find((p: any) => p.id === quoteForm.project_id);

    function updateQuoteExpense(id: number, patch: any) {
      setQuoteExpenses(quoteExpenses.map((x: any) => x.id === id ? { ...x, ...patch } : x));
    }
    function addQuoteExpense() {
      setQuoteExpenses([...quoteExpenses, { id: Date.now(), category: "Autre", label: "Nouvelle dépense", amount: "", tva_rate: "20", amount_mode: "HT" }]);
    }
    function removeQuoteExpense(id: number) {
      setQuoteExpenses(quoteExpenses.filter((x: any) => x.id !== id));
    }
    function updateQuoteLabor(id: number, patch: any) {
      setQuoteLabor(quoteLabor.map((x: any) => x.id === id ? { ...x, ...patch } : x));
    }
    function addQuoteLabor() {
      setQuoteLabor([...quoteLabor, { id: Date.now(), employee_id: "", label: "Personnel", days: "1", daily_cost: "" }]);
    }
    function removeQuoteLabor(id: number) {
      setQuoteLabor(quoteLabor.filter((x: any) => x.id !== id));
    }
    function applyEmployeeToLabor(rowId: number, employeeId: string) {
      const emp = employees.find((e: any) => e.id === employeeId);
      updateQuoteLabor(rowId, { employee_id: employeeId, employee_name_snapshot: emp ? employeeName(emp) : "Personnel", employee_daily_cost_snapshot: Number(emp?.daily_cost || 0), label: emp ? employeeName(emp) : "Personnel", daily_cost: String(emp?.daily_cost || "") });
    }
    function resetQuoteCalculation() {
      setEditingQuoteCalcId(null);
      setQuoteForm(emptyQuoteForm);
      setQuoteExpenses([{ id: 1, category: "Matériaux", label: "Matériaux", amount: "", tva_rate: "20", amount_mode: "HT" }, { id: 2, category: "Sous-traitance", label: "Sous-traitance", amount: "", tva_rate: "20", amount_mode: "HT" }, { id: 3, category: "Location / engins", label: "Location / engins", amount: "", tva_rate: "20", amount_mode: "HT" }]);
      setQuoteLabor([{ id: 1, employee_id: "", label: "Personnel", days: "1", daily_cost: "" }]);
    }
    async function saveQuoteCalculation() {
      const id = editingQuoteCalcId || String(Date.now());
      const frozenLabor = quoteLabor.map((l: any) => ({ ...l, employee_name_snapshot: l.employee_name_snapshot || l.label || employeeNameById(l.employee_id), employee_daily_cost_snapshot: Number(l.employee_daily_cost_snapshot ?? l.daily_cost ?? 0), daily_cost: String(l.daily_cost || l.employee_daily_cost_snapshot || 0) }));
      const payload = { id, saved_at: new Date().toISOString(), updated_at: new Date().toISOString(), form: quoteForm, expenses: quoteExpenses, labor: frozenLabor, totals: { revenue_ht: quoteRevenueHT, revenue_tva: quoteTVA, revenue_ttc: quoteTTC, expenses_ht: quoteExpensesTotal, expenses_tva: quoteExpensesTVA, expenses_ttc: quoteExpensesTTC, labor_ht: quoteLaborTotal, fixed_costs: quoteFixedCosts, total_costs: quoteTotalCosts, tva_balance: quoteTvaBalance, margin: quoteMargin, margin_rate: quoteMarginRate, markup_rate: quoteMarkupRate } };
      const { error } = await supabase.from("quote_calculations").upsert(payload, { onConflict: "id" });
      if (error) {
        alert("Sauvegarde centralisée impossible. Lance le script Supabase V85, puis réessaie. Aucun enregistrement local séparé n’est créé pour éviter les écarts téléphone/tablette/ordinateur.\n\n" + error.message);
        return;
      }
      setSavedQuoteCalculations(editingQuoteCalcId ? savedQuoteCalculations.map((x: any) => x.id === id ? payload : x) : [payload, ...savedQuoteCalculations]);
      setEditingQuoteCalcId(id);
      await refreshAll();
      alert("Calcul de rentabilité sauvegardé et synchronisé Supabase.");
    }
    function editQuoteCalculation(item: any) {
      setEditingQuoteCalcId(item.id);
      setQuoteForm({ ...emptyQuoteForm, ...(item.form || {}) });
      setQuoteExpenses(item.expenses || []);
      setQuoteLabor(item.labor || []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    async function deleteQuoteCalculation(id: string) {
      if (!confirm("Supprimer ce calcul de rentabilité ?")) return;
      const { error } = await supabase.from("quote_calculations").delete().eq("id", id);
      if (error) return alert("Suppression centralisée impossible : " + error.message);
      setSavedQuoteCalculations(savedQuoteCalculations.filter((x: any) => x.id !== id));
      if (editingQuoteCalcId === id) resetQuoteCalculation();
      await refreshAll();
    }
    async function createProjectFromQuote() {
      if (quoteForm.project_id) return alert("Ce calcul est déjà rattaché à un chantier existant.");
      const name = quoteForm.project_name || "Nouveau chantier";
      const { error } = await supabase.from("projects").insert({ name, client: quoteForm.client || "", description: quoteForm.notes || "Créé depuis le calcul rentabilité", status: "preparation", color: "#f59e0b", progress: 0 });
      if (error) return alert(error.message);
      await refreshAll();
      alert("Chantier créé depuis le calcul de rentabilité.");
    }

    function generateQuotePdf() {
      const expenseRows = quoteExpenses.map((x: any) => `<tr><td>${x.label || x.category || "Dépense"}</td><td class="num">${money(Number(x.amount || 0))}</td><td>${x.amount_mode || "HT"}</td><td>${x.tva_rate || 0}%</td></tr>`).join("");
      const laborRows = quoteLabor.map((x: any) => `<tr><td>${x.label || employeeNameById(x.employee_id)}</td><td class="num">${x.days || 0}</td><td class="num">${money(Number(x.daily_cost || x.employee_daily_cost_snapshot || 0))}</td><td class="num">${money(Number(x.days || 0) * Number(x.daily_cost || x.employee_daily_cost_snapshot || 0))}</td></tr>`).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Calcul rentabilité ASB</title><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:32px}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f172a;padding-bottom:16px}.logo{height:58px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.kpi{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#f8fafc}.kpi b{font-size:18px}h2{margin-top:26px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}th{background:#0f172a;color:white;text-align:left;padding:10px}td{border-bottom:1px solid #e2e8f0;padding:9px}.num{text-align:right;font-weight:bold}.result{border-radius:18px;padding:18px;background:${quoteMargin >= 0 ? '#ecfdf5' : '#fef2f2'};margin-top:22px}.note{margin-top:24px;color:#64748b;font-size:11px}</style></head><body><div class="head"><div><h1>Calcul de rentabilité chantier</h1><p>${quoteForm.project_name || "Devis"} — ${quoteForm.client || "Client non renseigné"}</p><p>Édition : ${formatDisplayDate(formatDate(new Date()))}</p></div><img class="logo" src="/logo-asb.png" /></div><div class="kpis"><div class="kpi">CA HT<br><b>${money(quoteRevenueHT)}</b></div><div class="kpi">Coûts HT<br><b>${money(quoteTotalCosts)}</b></div><div class="kpi">Marge<br><b>${money(quoteMargin)}</b></div><div class="kpi">Rentabilité<br><b>${quoteMarginRate}%</b></div></div><h2>Dépenses prévues</h2><table><thead><tr><th>Désignation</th><th>Montant</th><th>Mode</th><th>TVA</th></tr></thead><tbody>${expenseRows || '<tr><td colspan="4">Aucune dépense.</td></tr>'}</tbody></table><h2>Main d’œuvre prévue</h2><table><thead><tr><th>Désignation</th><th>Jours</th><th>Coût jour</th><th>Total</th></tr></thead><tbody>${laborRows || '<tr><td colspan="4">Aucune main d’œuvre.</td></tr>'}</tbody></table><div class="result"><h2>Résultat</h2><p><b>CA TTC :</b> ${money(quoteTTC)} — <b>TVA nette :</b> ${quoteTvaBalance >= 0 ? 'à reverser ' : 'crédit '}${money(Math.abs(quoteTvaBalance))}</p><p><b>Marge estimée :</b> ${money(quoteMargin)} soit <b>${quoteMarginRate}%</b></p><p><b>Notes :</b> ${quoteForm.notes || "—"}</p></div><p class="note">Document interne ASB — simulation de marge avant devis.</p><script>window.print()</script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }

    return <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Calcul marge chantier / devis</h1>
          <p className="text-sm text-slate-500">Simulation avant devis : CA prévu, dépenses, personnel affecté, charges, marge et rentabilité.</p>
        </div>
        <Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-emerald-500"><p className="text-xs font-black uppercase text-slate-500">Devis HT</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(quoteRevenueHT)}</p><p className="text-xs text-slate-500">TVA : {money(quoteTVA)} · TTC : {money(quoteTTC)}</p></Card>
        <Card className="border-l-4 border-red-500"><p className="text-xs font-black uppercase text-slate-500">Dépenses HT</p><p className="mt-2 text-2xl font-black text-red-600">{money(quoteExpensesTotal)}</p><p className="text-xs text-slate-500">TVA récup. : {money(quoteExpensesTVA)}</p></Card>
        <Card className="border-l-4 border-blue-500"><p className="text-xs font-black uppercase text-slate-500">Main d’œuvre</p><p className="mt-2 text-2xl font-black text-blue-700">{money(quoteLaborTotal)}</p><p className="text-xs text-slate-500">Personnel affecté au devis</p></Card>
        <Card className={quoteMargin >= 0 ? "border-l-4 border-emerald-500" : "border-l-4 border-red-500"}><p className="text-xs font-black uppercase text-slate-500">Marge prévue</p><p className={quoteMargin >= 0 ? "mt-2 text-2xl font-black text-emerald-700" : "mt-2 text-2xl font-black text-red-600"}>{money(quoteMargin)}</p><p className="text-xs text-slate-500">Résultat estimatif HT</p></Card>
        <Card className="border-l-4 border-purple-500"><p className="text-xs font-black uppercase text-slate-500">TVA nette</p><p className={quoteTvaBalance >= 0 ? "mt-2 text-2xl font-black text-purple-700" : "mt-2 text-2xl font-black text-emerald-700"}>{money(Math.abs(quoteTvaBalance))}</p><p className="text-xs text-slate-500">{quoteTvaBalance >= 0 ? "À reverser" : "Crédit TVA"} · Marge {quoteMarginRate}%</p></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <h2 className="mb-4 text-xl font-black">1. Base devis</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Rattacher à un chantier existant"><Select value={quoteForm.project_id} onChange={(e: any) => { const p = projects.find((x: any) => x.id === e.target.value); setQuoteForm({ ...quoteForm, project_id: e.target.value, project_name: p?.name || quoteForm.project_name, client: p?.client || quoteForm.client }); }}><option value="">Aucun / nouveau chantier</option>{activeProjects.map((p: any) => <option key={p.id} value={p.id}>{projectLabel(p.id)}</option>)}</Select></Field>
            <Field label="Nom chantier / devis"><Input value={quoteForm.project_name} onChange={(e: any) => setQuoteForm({ ...quoteForm, project_name: e.target.value })} placeholder="Ex : ITE Villa Dupont" /></Field>
            <Field label="Client"><Input value={quoteForm.client} onChange={(e: any) => setQuoteForm({ ...quoteForm, client: e.target.value })} placeholder="Nom client" /></Field>
            <Field label={quoteForm.input_mode === "TTC" ? "Montant devis TTC" : "Montant devis HT"}><Input type="number" step="0.01" value={quoteForm.revenue_ht} onChange={(e: any) => setQuoteForm({ ...quoteForm, revenue_ht: e.target.value })} placeholder="0.00" /></Field>
            <Field label="Saisie devis"><Select value={quoteForm.input_mode || "HT"} onChange={(e: any) => setQuoteForm({ ...quoteForm, input_mode: e.target.value })}><option value="HT">Je saisis en HT</option><option value="TTC">Je saisis en TTC</option></Select></Field>
            <Field label="TVA devis"><Select value={quoteForm.tva_rate} onChange={(e: any) => setQuoteForm({ ...quoteForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
            <Field label="Charges fixes imputées HT"><Input type="number" step="0.01" value={quoteForm.fixed_costs} onChange={(e: any) => setQuoteForm({ ...quoteForm, fixed_costs: e.target.value })} placeholder="0.00" /></Field>
            <Field label="Notes"><Input value={quoteForm.notes} onChange={(e: any) => setQuoteForm({ ...quoteForm, notes: e.target.value })} placeholder="Hypothèses du devis" /></Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="green" onClick={saveQuoteCalculation}>{editingQuoteCalcId ? "Modifier le calcul" : "Sauvegarder le calcul"}</Button><Button type="button" variant="secondary" onClick={resetQuoteCalculation}>Nouveau calcul</Button><Button type="button" variant="amber" onClick={createProjectFromQuote}>Créer en chantier</Button><Button type="button" variant="secondary" onClick={generateQuotePdf}>Générer PDF</Button></div>
        </Card>

        <Card className={quoteMargin >= 0 ? "bg-emerald-50" : "bg-red-50"}>
          <h2 className="text-xl font-black">Résultat de simulation</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>CA HT prévu</span><b>{money(quoteRevenueHT)}</b></div>
            <div className="flex justify-between"><span>TVA collectée client</span><b>{money(quoteTVA)}</b></div>
            <div className="flex justify-between"><span>CA TTC client</span><b>{money(quoteTTC)}</b></div>
            <div className="flex justify-between"><span>Total coûts HT</span><b>{money(quoteTotalCosts)}</b></div>
            <div className="flex justify-between"><span>Dépenses HT</span><b>{money(quoteExpensesTotal)}</b></div>
            <div className="flex justify-between"><span>TVA récupérable dépenses</span><b>{money(quoteExpensesTVA)}</b></div>
            <div className="flex justify-between"><span>TVA nette</span><b>{quoteTvaBalance >= 0 ? "à reverser " : "crédit "}{money(Math.abs(quoteTvaBalance))}</b></div>
            <div className="flex justify-between"><span>Main d’œuvre</span><b>{money(quoteLaborTotal)}</b></div>
            <div className="flex justify-between"><span>Charges fixes</span><b>{money(quoteFixedCosts)}</b></div>
            <div className="border-t pt-3"><p className="text-xs font-black uppercase text-slate-500">Marge estimée</p><p className={quoteMargin >= 0 ? "text-4xl font-black text-emerald-700" : "text-4xl font-black text-red-600"}>{money(quoteMargin)}</p><p className={quoteMargin >= 0 ? "text-lg font-black text-emerald-700" : "text-lg font-black text-red-600"}>{quoteMarginRate}% de rentabilité</p></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">2. Dépenses prévues</h2><Button variant="secondary" onClick={addQuoteExpense}>+ Ajouter dépense</Button></div>
          <div className="space-y-3">
            {quoteExpenses.map((x: any) => <div key={x.id} className="grid gap-3 rounded-2xl border bg-white p-3 md:grid-cols-[1fr_1fr_120px_100px_95px_110px]">
              <Field label="Liste dépense"><Select value={x.category || x.label} onChange={(e: any) => updateQuoteExpense(x.id, { category: e.target.value, label: e.target.value })}><option value="">Choisir</option>{expenseChoices.map((name: any) => <option key={name} value={name}>{name}</option>)}</Select></Field>
              <Field label="Libellé détail"><Input value={x.label} onChange={(e: any) => updateQuoteExpense(x.id, { label: e.target.value })} placeholder="Détail, fournisseur, lot..." /></Field>
              <Field label={x.amount_mode === "TTC" ? "Montant TTC" : "Montant HT"}><Input type="number" step="0.01" value={x.amount} onChange={(e: any) => updateQuoteExpense(x.id, { amount: e.target.value })} /></Field>
              <Field label="Saisie"><Select value={x.amount_mode || "HT"} onChange={(e: any) => updateQuoteExpense(x.id, { amount_mode: e.target.value })}><option value="HT">HT</option><option value="TTC">TTC</option></Select></Field>
              <Field label="TVA"><Select value={x.tva_rate ?? "20"} onChange={(e: any) => updateQuoteExpense(x.id, { tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field>
              <div className="flex items-end"><Button type="button" variant="danger" className="w-full" onClick={() => removeQuoteExpense(x.id)}>Supprimer</Button></div>
            </div>)}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">3. Personnel affecté</h2><Button variant="secondary" onClick={addQuoteLabor}>+ Ajouter personnel</Button></div>
          <div className="space-y-3">
            {quoteLabor.map((x: any) => <div key={x.id} className="grid gap-3 rounded-2xl border bg-white p-3 md:grid-cols-[1fr_100px_130px_120px]">
              <Field label="Salarié / poste"><Select value={x.employee_id} onChange={(e: any) => applyEmployeeToLabor(x.id, e.target.value)}><option value="">Saisie libre</option>{activeEmployees.map((emp: any) => <option key={emp.id} value={emp.id}>{employeeName(emp)}{emp.daily_cost ? ` — ${money(Number(emp.daily_cost))}/j` : ""}</option>)}</Select><Input className="mt-2" value={x.label} onChange={(e: any) => updateQuoteLabor(x.id, { label: e.target.value })} placeholder="Poste" /></Field>
              <Field label="Jours"><Input type="number" step="0.5" value={x.days} onChange={(e: any) => updateQuoteLabor(x.id, { days: e.target.value })} /></Field>
              <Field label="Coût / jour"><Input type="number" step="0.01" value={x.daily_cost} onChange={(e: any) => updateQuoteLabor(x.id, { daily_cost: e.target.value })} /></Field>
              <div className="flex items-end"><Button type="button" variant="danger" className="w-full" onClick={() => removeQuoteLabor(x.id)}>Supprimer</Button></div>
            </div>)}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Calculs sauvegardés</h2><p className="text-sm text-slate-500">Sauvegarde Supabase centralisée uniquement : visible sur téléphone, tablette et ordinateur après rafraîchissement. Plus de sauvegarde locale appareil par appareil.</p></div><Badge tone="blue">{savedQuoteCalculations.length}</Badge></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Chantier / devis</th><th className="p-3">Client</th><th className="p-3">CA HT</th><th className="p-3">TVA nette</th><th className="p-3">Coûts HT</th><th className="p-3">Marge</th><th className="p-3">Rentabilité</th><th className="p-3">Actions</th></tr></thead><tbody>{savedQuoteCalculations.map((item: any) => <tr key={item.id} className="border-t"><td className="p-3">{item.saved_at ? new Date(item.saved_at).toLocaleDateString("fr-FR") : "—"}</td><td className="p-3 font-bold">{item.form?.project_name || projectLabel(item.form?.project_id)}</td><td className="p-3">{item.form?.client || "—"}</td><td className="p-3">{money(item.totals?.revenue_ht)}</td><td className="p-3">{money(Math.abs(Number(item.totals?.tva_balance || 0)))}</td><td className="p-3">{money(item.totals?.total_costs)}</td><td className={Number(item.totals?.margin || 0) >= 0 ? "p-3 font-black text-emerald-700" : "p-3 font-black text-red-600"}>{money(item.totals?.margin)}</td><td className="p-3 font-black">{item.totals?.margin_rate || 0}%</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => editQuoteCalculation(item)}>Modifier</Button><Button type="button" variant="danger" onClick={() => deleteQuoteCalculation(item.id)}>Supprimer</Button></div></td></tr>)}{savedQuoteCalculations.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500">Aucun calcul sauvegardé.</td></tr>}</tbody></table></div>
      </Card>
    </div>;
  }

  if (tab === "ouvrage-pilotage") return selectedPilotageProject ? <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Button variant="secondary" onClick={() => { setWorkProjectFilter(""); setShowProjectWorkItems(false); resetWorkItemForm(); }}>← Retour aux chantiers de pilotage</Button>
        <h1 className="mt-3 text-3xl font-black text-slate-900">{selectedPilotageProject.name}</h1>
        <p className="text-sm text-slate-500">{selectedPilotageProject.client || "Client non renseigné"}{selectedPilotageProject.reference ? ` · ${selectedPilotageProject.reference}` : ""}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setShowProjectWorkItems(!showProjectWorkItems)}>{showProjectWorkItems ? "Masquer les ouvrages" : "Voir / modifier les ouvrages"}</Button>
        <Button variant="danger" onClick={deleteAllWorkItemsForSelectedProject}>Tout supprimer</Button>
        <Button variant="secondary" onClick={exportWorkItemsCsv}>Exporter CSV</Button>
        <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">
          Importer Excel OBAT
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importObatExcel} />
        </label>
      </div>
    </div>

    <Card>
      <div className="grid gap-4 md:grid-cols-5">
        <div><p className="text-xs font-black uppercase text-slate-500">Ouvrages</p><p className="mt-1 text-2xl font-black text-slate-900">{workTotals.count}</p></div>
        <div><p className="text-xs font-black uppercase text-slate-500">Vendu HT</p><p className="mt-1 text-2xl font-black text-slate-900">{money(workTotals.sold)}</p></div>
        <div><p className="text-xs font-black uppercase text-slate-500">Coût total</p><p className="mt-1 text-2xl font-black text-slate-900">{money(workTotals.cost)}</p><p className="text-xs text-slate-500">Salariés + marchandises</p></div>
        <div><p className="text-xs font-black uppercase text-slate-500">Marge</p><p className={workTotals.margin >= 0 ? "mt-1 text-2xl font-black text-emerald-700" : "mt-1 text-2xl font-black text-red-600"}>{money(workTotals.margin)}</p></div>
        <div><p className="text-xs font-black uppercase text-slate-500">Rentabilité</p><p className={workTotals.profitability >= 0 ? "mt-1 text-2xl font-black text-emerald-700" : "mt-1 text-2xl font-black text-red-600"}>{workTotals.profitability} %</p></div>
      </div>
    </Card>

    <Card className="border-l-4 border-sky-500">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900">Nouvelle journée de réalisation</h3>
          <p className="text-sm text-slate-500">Saisie rapide : choisis la date, ajoute les salariés présents un par un, puis coche les ouvrages réalisés ce jour-là.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={selectAllVisibleWorkDayItems}>Tout sélectionner</Button>
          <Button type="button" variant="secondary" onClick={clearWorkDayItems}>Vider</Button>
        </div>
      </div>
      <form onSubmit={saveWorkDayAssignment} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Date de réalisation"><Input type="date" value={workDayForm.date} onChange={(e: any) => setWorkDayForm({ ...workDayForm, date: e.target.value })} /></Field>
          <Field label="Ajouter un salarié"><Select value="" onChange={(e: any) => addEmployeeToWorkDay(e.target.value)}><option value="">Choisir un salarié à ajouter</option>{activeEmployees.filter((emp: any) => !(Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : []).includes(emp.id)).map((emp: any) => <option key={emp.id} value={emp.id}>{employeeName(emp)}{emp.daily_cost ? ` — ${money(Number(emp.daily_cost))}/j` : ""}</option>)}</Select></Field>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm"><b>Résumé journée</b><br />{(Array.isArray(workDayForm.selected_item_ids) ? workDayForm.selected_item_ids : []).length} ouvrage(s) sélectionné(s)<br />{(Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : []).length} salarié(s) présent(s)</div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase text-slate-500">Salariés présents</p>
          <div className="flex min-h-[44px] flex-wrap gap-2 rounded-2xl border bg-slate-50 p-3">
            {(Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : []).map((id: string) => <button key={id} type="button" onClick={() => removeEmployeeFromWorkDay(id)} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 hover:bg-red-100 hover:text-red-700">{employeeLabelFromIds([id])} ×</button>)}
            {(!Array.isArray(workDayForm.employee_ids) || workDayForm.employee_ids.length === 0) && <span className="text-xs font-semibold text-slate-400">Ajoute les salariés présents avec la liste déroulante.</span>}
          </div>
        </div>
        <div className="rounded-2xl border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div><h4 className="font-black text-slate-900">Ouvrages réalisés ce jour-là</h4><p className="text-xs text-slate-500">Les lignes importées depuis OBAT restent dans le chantier. Ici tu coches seulement ce qui a été réalisé sur la journée.</p></div>
            <Field label="Recherche"><Input value={workSearch} onChange={(e: any) => setWorkSearch(e.target.value)} placeholder="Rechercher un ouvrage..." /></Field>
          </div>
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50"><tr className="text-xs uppercase text-slate-500"><th className="p-3">OK</th><th className="p-3">N°</th><th className="p-3">Désignation</th><th className="p-3">Qté</th><th className="p-3">Prix HT</th><th className="p-3">Déjà imputé</th></tr></thead>
              <tbody>{selectedProjectWorkItems.map((x: any) => { const checked = (Array.isArray(workDayForm.selected_item_ids) ? workDayForm.selected_item_ids : []).includes(x.id); const n = workItemNumbers(x); return <tr key={x.id} onClick={() => toggleWorkDayItem(x.id)} className={checked ? "cursor-pointer border-t bg-sky-50" : "cursor-pointer border-t hover:bg-slate-50"}><td className="p-3"><input type="checkbox" checked={checked} onChange={() => toggleWorkDayItem(x.id)} onClick={(e: any) => e.stopPropagation()} /></td><td className="p-3 font-bold">{x.numero || "-"}</td><td className="p-3"><b>{x.designation}</b><br /><span className="text-xs text-slate-500">{x.category || "Sans catégorie"}</span></td><td className="p-3">{Number(x.quantity || 0)} {x.unit || ""}</td><td className="p-3 font-bold">{money(n.sold)}</td><td className="p-3">{x.realization_date ? formatDisplayDate(x.realization_date) : <span className="text-slate-400">Non</span>}</td></tr>; })}{selectedProjectWorkItems.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Aucun ouvrage dans ce chantier. Importe d'abord un Excel OBAT ou ajoute une ligne dans “Voir / modifier les ouvrages”.</td></tr>}</tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          {(() => { const ids = Array.isArray(workDayForm.selected_item_ids) ? workDayForm.selected_item_ids : []; const selected = selectedProjectWorkItems.filter((x: any) => ids.includes(x.id)); const sold = selected.reduce((s: number, x: any) => s + Number(x.sold_ht || 0), 0); const merch = selected.reduce((s: number, x: any) => s + Number(x.merchandise_ht || 0), 0); const sub = selected.reduce((s: number, x: any) => s + Number(x.subcontract_ht || 0), 0); const other = selected.reduce((s: number, x: any) => s + Number(x.other_costs_ht || 0), 0); const labor = (Array.isArray(workDayForm.employee_ids) ? workDayForm.employee_ids : []).reduce((s: number, id: string) => s + employeeDayCost(id), 0); const total = merch + sub + other + labor; const margin = sold - total; const rate = sold > 0 ? Math.round((margin / sold) * 1000) / 10 : 0; return <div className="grid gap-3 md:grid-cols-6"><div><b>Vendu HT</b><br />{money(sold)}</div><div><b>Salariés</b><br />{money(labor)}</div><div><b>Marchandises</b><br />{money(merch)}</div><div><b>Coût total</b><br />{money(total)}</div><div><b>Marge</b><br /><span className={margin >= 0 ? "font-black text-emerald-700" : "font-black text-red-600"}>{money(margin)}</span></div><div><b>Rentabilité</b><br /><span className={rate >= 0 ? "font-black text-emerald-700" : "font-black text-red-600"}>{rate} %</span></div></div>; })()}
        </div>
        <div className="flex flex-wrap gap-3"><Button variant="green">Enregistrer la journée</Button><Button type="button" variant="secondary" onClick={() => resetWorkDayForm()}>Réinitialiser</Button></div>
      </form>
    </Card>

    {editingWorkItemId && <Card className="border-l-4 border-amber-500">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">Modifier un ouvrage</h3><p className="text-sm text-slate-500">Modification détaillée d'une ligne importée.</p></div><Button type="button" variant="secondary" onClick={resetWorkItemForm}>Annuler modification</Button></div>
      <form onSubmit={saveWorkItem} className="grid gap-4 md:grid-cols-6">
        <Field label="Date"><Input type="date" value={workItemForm.realization_date} onChange={(e: any) => setWorkItemForm({ ...workItemForm, realization_date: e.target.value })} /></Field>
        <Field label="N°"><Input value={workItemForm.numero} onChange={(e: any) => setWorkItemForm({ ...workItemForm, numero: e.target.value })} /></Field>
        <Field label="Désignation"><Input required value={workItemForm.designation} onChange={(e: any) => setWorkItemForm({ ...workItemForm, designation: e.target.value })} /></Field>
        <Field label="Qté"><Input type="number" step="0.01" value={workItemForm.quantity} onChange={(e: any) => setWorkItemForm({ ...workItemForm, quantity: e.target.value })} /></Field>
        <Field label="Unité"><Input value={workItemForm.unit} onChange={(e: any) => setWorkItemForm({ ...workItemForm, unit: e.target.value })} /></Field>
        <Field label="Montant HT"><Input type="number" step="0.01" value={workItemForm.sold_ht} onChange={(e: any) => setWorkItemForm({ ...workItemForm, sold_ht: e.target.value })} /></Field>
        <Field label="Marchandises HT"><Input type="number" step="0.01" value={workItemForm.merchandise_ht} onChange={(e: any) => setWorkItemForm({ ...workItemForm, merchandise_ht: e.target.value })} /></Field>
        <Field label="Sous-traitance HT"><Input type="number" step="0.01" value={workItemForm.subcontract_ht} onChange={(e: any) => setWorkItemForm({ ...workItemForm, subcontract_ht: e.target.value })} /></Field>
        <Field label="Autres frais HT"><Input type="number" step="0.01" value={workItemForm.other_costs_ht} onChange={(e: any) => setWorkItemForm({ ...workItemForm, other_costs_ht: e.target.value })} /></Field>
        <Field label="Avancement %"><Input type="number" min="0" max="100" step="1" value={workItemForm.progress} onChange={(e: any) => setWorkItemForm({ ...workItemForm, progress: e.target.value })} /></Field>
        <Field label="Notes"><Input value={workItemForm.notes} onChange={(e: any) => setWorkItemForm({ ...workItemForm, notes: e.target.value })} /></Field>
        <div className="flex gap-3 md:col-span-6"><Button variant="green">Enregistrer modification</Button><Button type="button" variant="secondary" onClick={resetWorkItemForm}>Annuler</Button></div>
      </form>
    </Card>}

    <Card className="border-l-4 border-emerald-500">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">Rentabilité par date</h3><p className="text-sm text-slate-500">Les salariés sélectionnés sont regroupés par date et comptés une seule fois par journée.</p></div><Badge tone="green">{workDateGroups.length}</Badge></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Salariés sur place</th><th className="p-3">Ouvrages réalisés</th><th className="p-3">Vendu HT</th><th className="p-3">Coût salariés</th><th className="p-3">Marchandises</th><th className="p-3">Coût total</th><th className="p-3">Marge</th><th className="p-3">Rentabilité</th></tr></thead><tbody>{workDateGroups.map((g: any) => <tr key={g.date} className="border-t"><td className="p-3 font-black">{g.date === "Non daté" ? "Non daté" : formatDisplayDate(g.date)}</td><td className="p-3">{g.employeeNames}</td><td className="p-3">{g.count}</td><td className="p-3 font-bold">{money(g.sold)}</td><td className="p-3">{money(g.laborCost)}</td><td className="p-3">{money(g.merchandise)}</td><td className="p-3">{money(g.totalCost)}</td><td className={g.margin >= 0 ? "p-3 font-black text-emerald-700" : "p-3 font-black text-red-600"}>{money(g.margin)}</td><td className={g.profitability >= 0 ? "p-3 font-black text-emerald-700" : "p-3 font-black text-red-600"}>{g.profitability} %</td></tr>)}{workDateGroups.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500">Aucune journée à analyser.</td></tr>}</tbody></table></div>
    </Card>

    {!showProjectWorkItems && <Card className="border-dashed"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">Ouvrages importés masqués</h3><p className="text-sm text-slate-500">Le tableau des lignes Excel n'est plus affiché automatiquement pour garder la page lisible.</p></div><Button variant="secondary" onClick={() => setShowProjectWorkItems(true)}>Voir / modifier les ouvrages</Button></div></Card>}

    {showProjectWorkItems && <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">Ouvrages du chantier</h3><p className="text-sm text-slate-500">Les lignes importées OBAT sont masquées par défaut. Clique sur “Voir / modifier les ouvrages” uniquement quand tu veux les consulter ou les modifier.</p></div><Field label="Recherche"><Input value={workSearch} onChange={(e: any) => setWorkSearch(e.target.value)} placeholder="Rechercher un ouvrage..." /></Field></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">N°</th><th className="p-3">Désignation</th><th className="p-3">Qté</th><th className="p-3">Salariés</th><th className="p-3">Prix HT</th><th className="p-3">Marchandises</th><th className="p-3">Coût hors salariés</th><th className="p-3">Marge hors salariés</th><th className="p-3">Rentabilité</th><th className="p-3">Avancement</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{selectedProjectWorkItems.map((x: any) => { const n = workItemNumbers(x); return <tr key={x.id} className={editingWorkItemId === x.id ? "border-t bg-sky-50" : "border-t"}><td className="p-3 font-bold">{x.realization_date ? formatDisplayDate(x.realization_date) : "Non daté"}</td><td className="p-3 font-bold">{x.numero || "-"}</td><td className="p-3"><b>{x.designation}</b><br /><span className="text-xs text-slate-500">{x.category || "Sans catégorie"}</span></td><td className="p-3">{Number(x.quantity || 0)} {x.unit || ""}</td><td className="p-3">{employeeLabelFromIds(employeeIdsFromWorkItem(x), x.employee_names || "")}</td><td className="p-3 font-bold">{money(n.sold)}</td><td className="p-3">{money(n.merchandise)}</td><td className="p-3">{money(n.totalCost)}</td><td className={n.margin >= 0 ? "p-3 font-black text-emerald-700" : "p-3 font-black text-red-600"}>{money(n.margin)}</td><td className={n.profitability >= 0 ? "p-3 font-black text-emerald-700" : "p-3 font-black text-red-600"}>{n.profitability} %</td><td className="p-3"><div className="min-w-[110px]"><b>{Number(x.progress || 0)} %</b><div className="mt-1 h-2 rounded-full bg-slate-200"><div className={Number(x.progress || 0) >= 100 ? "h-2 rounded-full bg-emerald-500" : Number(x.progress || 0) > 0 ? "h-2 rounded-full bg-amber-500" : "h-2 rounded-full bg-slate-300"} style={{ width: `${Math.max(0, Math.min(100, Number(x.progress || 0)))}%` }} /></div></div></td><td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => duplicateWorkItem(x)}>Dupliquer</Button><Button variant="amber" onClick={() => editWorkItem(x)}>Modifier</Button><Button variant="danger" onClick={() => deleteWorkItem(x)}>Supprimer</Button></div></td></tr>; })}{selectedProjectWorkItems.length === 0 && <tr><td colSpan={12} className="p-6 text-center text-slate-500">Aucun ouvrage dans ce chantier. Importe un Excel OBAT ou ajoute une ligne manuellement.</td></tr>}</tbody>
          <tfoot><tr className="border-t bg-slate-50 font-black"><td className="p-3" colSpan={5}>TOTAL</td><td className="p-3">{money(workTotals.sold)}</td><td className="p-3">{money(workTotals.merchandise)}</td><td className="p-3">{money(workTotals.cost)}</td><td className={workTotals.margin >= 0 ? "p-3 text-emerald-700" : "p-3 text-red-600"}>{money(workTotals.margin)}</td><td className={workTotals.profitability >= 0 ? "p-3 text-emerald-700" : "p-3 text-red-600"}>{workTotals.profitability} %</td><td className="p-3" colSpan={2}></td></tr></tfoot>
        </table>
      </div>
    </Card>}
  </div> : <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Pilotage des ouvrages</h1>
        <p className="text-sm text-slate-500">Crée un chantier de pilotage, ouvre-le, puis importe ou modifie ses ouvrages. Les lignes OBAT ne s'affichent plus sur cette page principale.</p>
      </div>
    </div>

    <Card className="border-l-4 border-sky-500">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-xl font-black text-slate-900">Créer / modifier un chantier de pilotage</h3><p className="text-sm text-slate-500">Chaque chantier possède ses propres ouvrages, journées, salariés et rentabilité.</p></div>
        {editingPilotageProjectId && <Button type="button" variant="secondary" onClick={resetPilotageProjectForm}>Annuler</Button>}
      </div>
      <form onSubmit={savePilotageProject} className="grid gap-3 md:grid-cols-2">
        <Field label="Nom chantier"><Input required value={pilotageProjectForm.name} onChange={(e: any) => setPilotageProjectForm({ ...pilotageProjectForm, name: e.target.value })} placeholder="Ex : Villa Karouby" /></Field>
        <Field label="Client"><Input value={pilotageProjectForm.client} onChange={(e: any) => setPilotageProjectForm({ ...pilotageProjectForm, client: e.target.value })} placeholder="Nom client" /></Field>
        <Field label="Référence"><Input value={pilotageProjectForm.reference} onChange={(e: any) => setPilotageProjectForm({ ...pilotageProjectForm, reference: e.target.value })} placeholder="D2026422" /></Field>
        <Field label="Statut"><Select value={pilotageProjectForm.status} onChange={(e: any) => setPilotageProjectForm({ ...pilotageProjectForm, status: e.target.value })}><option value="en_cours">En cours</option><option value="pause">En pause</option><option value="termine">Terminé</option><option value="archive">Archivé</option></Select></Field>
        <Field label="Adresse"><Input value={pilotageProjectForm.address} onChange={(e: any) => setPilotageProjectForm({ ...pilotageProjectForm, address: e.target.value })} /></Field>
        <Field label="Notes"><Input value={pilotageProjectForm.notes} onChange={(e: any) => setPilotageProjectForm({ ...pilotageProjectForm, notes: e.target.value })} /></Field>
        <div className="md:col-span-2 flex flex-wrap gap-2"><Button variant="green">{editingPilotageProjectId ? "Modifier le chantier" : "+ Créer chantier"}</Button><Button type="button" variant="secondary" onClick={resetPilotageProjectForm}>Réinitialiser</Button></div>
      </form>
    </Card>

    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">Chantiers de pilotage</h3><p className="text-sm text-slate-500">Clique sur Ouvrir pour accéder aux ouvrages importés, les modifier et suivre la rentabilité par date.</p></div><Badge tone="blue">{pilotageProjectList.length}</Badge></div>
      <div className="grid gap-3">
        {pilotageProjectList.map((p: any) => { const t = pilotageProjectTotals(p.id); return <div key={p.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><b className="text-lg text-slate-900">{workProjectLabel(p)}</b><br /><span className="text-xs font-semibold text-slate-500">{p.reference || "Sans référence"} · {p.status || "en_cours"}</span></div>
            <div className="grid grid-cols-2 gap-2 text-right text-sm md:grid-cols-4"><div><span className="text-xs text-slate-500">Ouvrages</span><br /><b>{t.count}</b></div><div><span className="text-xs text-slate-500">Vendu</span><br /><b>{money(t.sold)}</b></div><div><span className="text-xs text-slate-500">Marge</span><br /><b className={t.margin >= 0 ? "text-emerald-700" : "text-red-600"}>{money(t.margin)}</b></div><div><span className="text-xs text-slate-500">Rentab.</span><br /><b>{t.profitability}%</b></div></div>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="green" onClick={() => { setWorkProjectFilter(p.id); setShowProjectWorkItems(false); setWorkItemForm({ ...emptyWorkItemForm, project_id: p.id, realization_date: formatDate(new Date()), employee_ids: [] }); }}>Ouvrir</Button><Button type="button" variant="amber" onClick={() => editPilotageProject(p)}>Modifier</Button><Button type="button" variant="danger" onClick={() => deletePilotageProject(p)}>Supprimer</Button></div>
          </div>
        </div>; })}
        {pilotageProjectList.length === 0 && <div className="rounded-2xl border border-dashed p-5 text-sm text-slate-500">Aucun chantier de pilotage. Crée ton premier chantier, puis ouvre-le pour importer l'Excel OBAT.</div>}
      </div>
    </Card>
  </div>;

  if (tab === "factures") return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">Créer facturation client</h1><p className="text-sm text-slate-500">Facturation uniquement sur chantiers actifs. Date obligatoire.</p></div><Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button></div>
    <Card><form onSubmit={saveRevenue} className="grid gap-4 md:grid-cols-6"><Field label="Chantier"><Select required value={revenueForm.project_id} onChange={(e: any) => setRevenueForm({ ...revenueForm, project_id: e.target.value })}><option value="">Choisir</option>{activeProjects.map((p: any) => <option key={p.id} value={p.id}>{projectLabel(p.id)}</option>)}</Select></Field><Field label="Libellé"><Input value={revenueForm.label} onChange={(e: any) => setRevenueForm({ ...revenueForm, label: e.target.value })} /></Field><Field label="Montant HT"><Input required type="number" step="0.01" value={revenueForm.amount} onChange={(e: any) => setRevenueForm({ ...revenueForm, amount: e.target.value })} /></Field><Field label="TVA"><Select value={revenueForm.tva_rate} onChange={(e: any) => setRevenueForm({ ...revenueForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field><Field label="Date obligatoire"><Input required type="date" value={revenueForm.billing_date} onChange={(e: any) => setRevenueForm({ ...revenueForm, billing_date: e.target.value })} /></Field><Field label="Notes"><Input value={revenueForm.notes} onChange={(e: any) => setRevenueForm({ ...revenueForm, notes: e.target.value })} /></Field><div className="md:col-span-6 flex gap-3"><Button variant="green">Enregistrer la facturation</Button><Button type="button" variant="secondary" onClick={() => { setEditingRevenueId(null); setRevenueForm({ project_id: "", label: "", amount: "", tva_rate: "10", billing_date: formatDate(new Date()), notes: "" }); }}>Réinitialiser</Button></div></form></Card>
    <Card><h3 className="mb-4 text-xl font-black">Factures clients créées</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Chantier</th><th className="p-3">Libellé</th><th className="p-3">HT</th><th className="p-3">TVA</th><th className="p-3">TTC</th><th className="p-3">Actions</th></tr></thead><tbody>{periodActiveRevenues.map((r: any) => <tr key={r.id} className="border-t"><td className="p-3">{formatDisplayDate(r.billing_date)}</td><td className="p-3 font-bold">{projectLabel(r.project_id)}</td><td className="p-3">{r.label || "Facturation client"}</td><td className="p-3">{money(amountHT(r))}</td><td className="p-3">{money(amountTVA(r))}</td><td className="p-3 font-black">{money(amountTTC(r))}</td><td className="p-3"><div className="flex gap-2"><Button variant="secondary" onClick={() => editRevenue(r)}>Modifier</Button><Button variant="danger" onClick={() => deleteRevenue(r)}>Supprimer</Button></div></td></tr>)}{periodActiveRevenues.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Aucune facturation client sur cette période.</td></tr>}</tbody></table></div></Card>
  </div>;

  if (tab === "charges") return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">Charges entreprises</h1><p className="text-sm text-slate-500">Charges fixes visibles en pilotage global uniquement, non imputées aux chantiers.</p></div><Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button></div>
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-black">Ajouter / modifier une charge</h3><Button variant="green" onClick={() => setShowExpenseForm(!showExpenseForm)}>{showExpenseForm ? "Masquer" : "+ Charge"}</Button></div>{showExpenseForm && <form onSubmit={saveExpense} className="mt-4 grid gap-3 md:grid-cols-6"><Field label="Nom"><Input required value={expenseForm.name} onChange={(e: any) => setExpenseForm({ ...expenseForm, name: e.target.value })} /></Field><Field label="Catégorie"><Select value={expenseForm.category} onChange={(e: any) => setExpenseForm({ ...expenseForm, category: e.target.value })}><option>Charges fixes</option><option>Charges variables</option><option>Véhicules</option><option>Assurances</option><option>Salaires</option><option>Matériel</option><option>Logiciels</option><option>Autres</option></Select></Field><Field label="Montant HT"><Input required type="number" step="0.01" value={expenseForm.amount} onChange={(e: any) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></Field><Field label="TVA"><Select value={expenseForm.tva_rate} onChange={(e: any) => setExpenseForm({ ...expenseForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field><Field label="Fréquence"><Select value={expenseForm.frequency} onChange={(e: any) => setExpenseForm({ ...expenseForm, frequency: e.target.value })}><option>mensuelle</option><option>hebdomadaire</option><option>ponctuelle</option><option>annuelle</option></Select></Field><Field label="Date obligatoire"><Input required type="date" value={expenseForm.expense_date} onChange={(e: any) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} /></Field><div className="md:col-span-6"><Button variant="green">Enregistrer</Button></div></form>}</Card>
    <Card><h3 className="mb-4 text-xl font-black">Liste des charges</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Nom</th><th className="p-3">Catégorie</th><th className="p-3">Fréquence</th><th className="p-3">HT</th><th className="p-3">TVA</th><th className="p-3">TTC</th><th className="p-3">Actions</th></tr></thead><tbody>{companyExpenses.map((e: any) => <tr key={e.id} className="border-t"><td className="p-3">{e.expense_date || "-"}</td><td className="p-3 font-bold">{e.name}</td><td className="p-3">{e.category}</td><td className="p-3">{e.frequency}</td><td className="p-3">{money(amountHT(e))}</td><td className="p-3">{money(amountTVA(e))}</td><td className="p-3 font-black">{money(amountTTC(e))}</td><td className="p-3"><div className="flex gap-2"><Button variant="secondary" onClick={() => editExpense(e)}>Modifier</Button><Button variant="danger" onClick={() => deleteExpense(e)}>Supprimer</Button></div></td></tr>)}{companyExpenses.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">Aucune charge.</td></tr>}</tbody></table></div></Card>
  </div>;

  if (tab === "achats") return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">Récapitulatif des factures d’achats</h1><p className="text-sm text-slate-500">Vue détaillée filtrée par période comptable avec modification directe des factures.</p></div><Button variant="secondary" onClick={() => setTab("pilotage")}>← Retour Gestion</Button></div>
    <Card><div className="grid gap-4 md:grid-cols-4"><div><b>Nombre de factures</b><p className="text-2xl font-black">{purchaseSummary.count}</p></div><div><b>Total HT</b><p className="text-2xl font-black">{money(purchaseSummary.ht)}</p></div><div><b>Total TVA</b><p className="text-2xl font-black">{money(purchaseSummary.tva)}</p></div><div><b>Total TTC</b><p className="text-2xl font-black">{money(purchaseSummary.ttc)}</p></div></div></Card>
    {editingPurchaseInvoiceId && <Card className="border-l-4 border-cyan-500"><h3 className="mb-4 text-xl font-black">Modifier la facture d’achat</h3><form onSubmit={savePurchaseInvoice} className="grid gap-4 md:grid-cols-6"><Field label="Chantier"><Select required value={purchaseInvoiceForm.project_id} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, project_id: e.target.value })}><option value="">Choisir</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{projectLabel(p.id)}</option>)}</Select></Field><Field label="Fournisseur"><Input required value={purchaseInvoiceForm.supplier} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, supplier: e.target.value })} /></Field><Field label="N° facture"><Input value={purchaseInvoiceForm.invoice_number} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, invoice_number: e.target.value })} /></Field><Field label="Catégorie"><Select value={purchaseInvoiceForm.category} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, category: e.target.value })}><option value="matériaux">Matériaux</option><option value="sous-traitance">Sous-traitance</option><option value="location matériel">Location matériel</option><option value="carburant">Carburant</option><option value="transport">Transport</option><option value="évacuation">Évacuation</option><option value="autre">Autre</option></Select></Field><Field label="Montant HT"><Input required type="number" step="0.01" value={purchaseInvoiceForm.amount} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, amount: e.target.value })} /></Field><Field label="TVA"><Select value={purchaseInvoiceForm.tva_rate} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, tva_rate: e.target.value })}><option value="0">0%</option><option value="5.5">5,5%</option><option value="10">10%</option><option value="20">20%</option></Select></Field><Field label="Date facture"><Input required type="date" value={purchaseInvoiceForm.invoice_date} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, invoice_date: e.target.value })} /></Field><Field label="Notes"><Input value={purchaseInvoiceForm.notes} onChange={(e: any) => setPurchaseInvoiceForm({ ...purchaseInvoiceForm, notes: e.target.value })} /></Field><div className="rounded-2xl bg-slate-50 p-3 text-sm md:col-span-6"><b>Aperçu</b> · HT {money(Number(purchaseInvoiceForm.amount || 0))} · TVA {money(Number(purchaseInvoiceForm.amount || 0) * Number(purchaseInvoiceForm.tva_rate || 0) / 100)} · TTC {money(Number(purchaseInvoiceForm.amount || 0) * (1 + Number(purchaseInvoiceForm.tva_rate || 0) / 100))}</div><div className="flex gap-3 md:col-span-6"><Button variant="green">Enregistrer modification</Button><Button type="button" variant="secondary" onClick={resetPurchaseInvoiceForm}>Annuler</Button></div></form></Card>}
    <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Fournisseur</th><th className="p-3">N° facture</th><th className="p-3">Chantier</th><th className="p-3">Montant HT</th><th className="p-3">TVA</th><th className="p-3">Montant TTC</th><th className="p-3">Actions</th></tr></thead><tbody>{visiblePurchaseInvoices.map((i: any) => <tr key={i.id} className={editingPurchaseInvoiceId === i.id ? "border-t bg-cyan-50" : "border-t"}><td className="p-3">{formatDisplayDate(i.invoice_date)}</td><td className="p-3 font-bold">{i.supplier || "Fournisseur"}</td><td className="p-3">{i.invoice_number || i.label || "-"}</td><td className="p-3">{projectLabel(i.project_id)}</td><td className="p-3">{money(amountHT(i))}</td><td className="p-3">{money(amountTVA(i))}</td><td className="p-3 font-black">{money(amountTTC(i))}</td><td className="p-3"><Button variant="secondary" onClick={() => editPurchaseInvoice(i)}>Modifier</Button></td></tr>)}{visiblePurchaseInvoices.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">Aucune facture d’achat sur cette période.</td></tr>}</tbody></table></div></Card>
  </div>;

  return <div className="space-y-5">
    <h1 className="text-3xl font-black text-slate-900">Gestion</h1>
    <Card className="border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid items-end gap-3 xl:grid-cols-[minmax(440px,0.9fr)_minmax(300px,0.7fr)_minmax(280px,0.7fr)]">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-700">📅 Période comptable & pilotage</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="!mt-0 h-11 max-w-[155px] bg-white py-2 font-bold" type="date" value={periodStart} onChange={(e: any) => { setPeriodMode("custom"); setPeriodStart(e.target.value); }} />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 font-black text-slate-600">→</span>
            <Input className="!mt-0 h-11 max-w-[155px] bg-white py-2 font-bold" type="date" value={periodEnd} onChange={(e: any) => { setPeriodMode("custom"); setPeriodEnd(e.target.value); }} />
            <Button className="h-11 px-6 shadow-sm" onClick={() => applyPeriod(periodMode)}>Appliquer</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPeriod("today")} className={periodMode === "today" ? "rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white" : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"}>Aujourd’hui</button>
            <button type="button" onClick={() => applyPeriod("week")} className={periodMode === "week" ? "rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white" : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"}>Semaine</button>
            <button type="button" onClick={() => applyPeriod("month")} className={periodMode === "month" ? "rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white" : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"}>Mois</button>
            <button type="button" onClick={() => applyPeriod("quarter")} className={periodMode === "quarter" ? "rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white" : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"}>Trimestre</button>
            <button type="button" onClick={() => applyPeriod("year")} className={periodMode === "year" ? "rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white" : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"}>Année</button>
          </div>
        </div>
        <Field label="Recherche chantier"><Input className="!mt-1 h-11 bg-white py-2" placeholder="Nom chantier, client, adresse..." value={projectSearch} onChange={(e: any) => setProjectSearch(e.target.value)} /></Field>
        <Field label="Liste déroulante"><Select className="!mt-1 h-11 bg-white py-2" value={selectedProjectFilter} onChange={(e: any) => setSelectedProjectFilter(e.target.value)}><option value="">Tous les chantiers actifs</option>{activeProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name} · {p.client || "Client"}</option>)}</Select></Field>
      </div>
    </Card>
    <div className="grid gap-4 md:grid-cols-5"><Card className="border-l-4 border-emerald-500"><p className="text-xs font-black uppercase text-slate-500">CA HT</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(allStats.revenue)}</p><p className="text-xs text-slate-500">Factures clients</p></Card><Card className="border-l-4 border-blue-500"><p className="text-xs font-black uppercase text-slate-500">TVA collectée</p><p className="mt-2 text-2xl font-black text-blue-700">{money(allStats.revenueTVA)}</p><p className="text-xs text-slate-500">Sur factures clients</p></Card><Card className="border-l-4 border-red-500"><p className="text-xs font-black uppercase text-slate-500">Dépenses HT</p><p className="mt-2 text-2xl font-black text-red-600">{money(allStats.purchases + expensesHT)}</p><p className="text-xs text-slate-500">Achats + charges</p></Card><Card className="border-l-4 border-blue-500"><p className="text-xs font-black uppercase text-slate-500">Factures clientes en attente de règlement</p><p className="mt-2 text-2xl font-black text-blue-700">{money(clientOutstandingTotal)}</p><p className="text-xs text-slate-500">Total à encaisser</p></Card><Card className={tvaBalanceGlobal >= 0 ? "border-l-4 border-red-500" : "border-l-4 border-emerald-500"}><p className="text-xs font-black uppercase text-slate-500">{tvaBalanceGlobal >= 0 ? "Solde TVA due" : "TVA récupérable"}</p><p className={tvaBalanceGlobal >= 0 ? "mt-2 text-2xl font-black text-red-600" : "mt-2 text-2xl font-black text-emerald-700"}>{money(Math.abs(tvaBalanceGlobal))}</p><p className="text-xs text-slate-500">Collectée - déductible</p></Card></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{actionCard("factures", "📄", "Créer facturation client", "Sur chantiers actifs", "bg-emerald-600")}{actionCard("calcul-rentabilite", "📊", "Calcul rentabilité", "Simulation marge devis", "bg-amber-600")}{actionCard("paiements", "💶", "Règlements clients", "Factures clientes en attente de règlement", "bg-blue-600")}{actionCard("charges", "🏢", "Charges entreprises", "Gérer les charges fixes", "bg-purple-600")}{actionCard("supplier-invoices", "🧾", "Factures fournisseurs", "Encours fournisseurs indépendant", "bg-red-600")}{actionCard("ouvrage-pilotage", "🧱", "Pilotage des ouvrages", "Dates, salariés, achats, rentabilité", "bg-sky-600")}{actionCard("achats", "🧾", "Récapitulatif des factures d’achats", "Voir le détail des achats", "bg-cyan-600")}</div>
    <div className="grid gap-5 xl:grid-cols-3"><Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black uppercase text-slate-800">Répartition du CA HT</h3><Button variant="secondary" onClick={generateAccountingPdfFromGestion}>Rapport comptable PDF</Button></div><SimplePie values={searchedAccountingProjects.slice(0, 6).map((p: any) => ({ label: `${p.name}${p.status === "archive" ? " · archivé" : ""}`, value: projectStats(p.id, true).revenueTotal }))} /></Card><Card><h3 className="mb-4 text-lg font-black uppercase text-slate-800">Répartition des dépenses HT</h3><SimplePie values={[{ label: "Achats", value: allStats.purchases }, { label: "Main d’œuvre", value: allStats.labor }, { label: "Charges fixes", value: expensesHT }]} /></Card><Card className={globalResultHT >= 0 ? "border-l-4 border-emerald-500" : "border-l-4 border-red-500"}><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black uppercase text-slate-800">Résultat global HT</h3><p className="text-xs text-slate-500">CA, achats, MO et charges fixes</p></div><div className={globalResultHT >= 0 ? "rounded-2xl bg-emerald-50 px-4 py-2 text-right" : "rounded-2xl bg-red-50 px-4 py-2 text-right"}><p className="text-xs font-black uppercase text-slate-500">Résultat</p><p className={globalResultHT >= 0 ? "text-2xl font-black text-emerald-700" : "text-2xl font-black text-red-600"}>{money(globalResultHT)}</p><p className={globalResultHT >= 0 ? "text-lg font-black text-emerald-700" : "text-lg font-black text-red-600"}>{globalMarginRate}% de marge</p></div></div><SimplePie values={[{ label: "CA HT", value: allStats.revenue }, { label: "Achats HT", value: allStats.purchases }, { label: "MO", value: allStats.labor }, { label: "Charges fixes", value: expensesHT }]} /></Card></div>
    <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-black uppercase text-slate-900">Chantiers actifs — rentabilité</h3><Badge tone="blue">{searchedActiveProjects.length} chantier(s)</Badge></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{searchedActiveProjects.map((p: any) => { const s = projectStats(p.id, false); return <Card key={p.id} className="overflow-hidden p-0"><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="text-xl font-black text-slate-900">{p.name}</h4><p className="text-sm text-slate-500">{p.client || "Client non renseigné"}</p></div><Badge tone="green">En cours</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl bg-emerald-50 p-2"><b>CA HT</b><br /><span className="font-black text-emerald-700">{money(s.revenueTotal)}</span></div><div className="rounded-2xl bg-red-50 p-2"><b>Achats HT</b><br /><span className="font-black text-red-700">{money(s.supplierTotal)}</span></div><div className="rounded-2xl bg-blue-50 p-2"><b>MO</b><br /><span className="font-black text-blue-700">{money(s.laborTotal)}</span></div><div className="rounded-2xl bg-slate-50 p-2"><b>Marge</b><br /><span className={s.margin >= 0 ? "font-black text-emerald-700" : "font-black text-red-600"}>{money(s.margin)}</span></div><div className="rounded-2xl bg-purple-50 p-2"><b>TVA</b><br /><span className="font-black text-purple-700">{money(Math.abs(s.tvaBalance))}</span></div><div className={s.marginRate >= 0 ? "rounded-2xl bg-emerald-50 p-2" : "rounded-2xl bg-red-50 p-2"}><b>Rentabilité</b><br /><span className={s.marginRate >= 0 ? "font-black text-emerald-700" : "font-black text-red-600"}>{s.marginRate}%</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><Button variant="secondary" onClick={() => openProjectFullDetail(p)}>Voir</Button><Button variant="secondary" onClick={() => generateProjectPdfFromGestion(p)}>Rapport PDF</Button><Button variant="amber" onClick={() => archiveProject(p, true)}>Archiver</Button></div></div></Card>; })}{searchedActiveProjects.length === 0 && <Card><p className="text-center text-slate-500">Aucun chantier actif trouvé.</p></Card>}</div></div>
    <Card className="bg-slate-50"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Chantiers archivés</h3><p className="text-sm text-slate-500">Les chantiers archivés ne sont plus visibles dans Chantiers actifs ni dans Gestion. Leurs factures, retours et documents restent consultables ici.</p></div><Button variant="secondary" onClick={() => setTab("archives")}>Accéder aux archives chantiers</Button></div>{tab === "archives" && <div className="mt-4 grid gap-4">{archivedProjects.map((p: any) => { const s = projectStats(p.id, false); return <div key={p.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge tone="slate">Archivé</Badge><h4 className="mt-2 text-xl font-black">{p.name}</h4><p className="text-sm text-slate-500">{p.client || "Client non renseigné"}</p></div><Button variant="green" onClick={() => archiveProject(p, false)}>Réactiver</Button></div><div className="mt-3 grid gap-3 md:grid-cols-4"><div><b>CA HT</b><br />{money(s.revenueTotal)}</div><div><b>Achats HT</b><br />{money(s.supplierTotal)}</div><div><b>Marge</b><br />{money(s.margin)}</div><div><b>TVA</b><br />{money(Math.abs(s.tvaBalance))}</div></div></div>; })}{archivedProjects.length === 0 && <p className="text-sm text-slate-500">Aucun chantier archivé.</p>}</div>}</Card>
  </div>;

}


function AccessSettings({ session }: any) {
  const [managementCurrent, setManagementCurrent] = useState("");
  const [managementNew, setManagementNew] = useState("");
  const [managementConfirm, setManagementConfirm] = useState("");
  const [employeesCurrent, setEmployeesCurrent] = useState("");
  const [employeesNew, setEmployeesNew] = useState("");
  const [employeesConfirm, setEmployeesConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function resetPins() {
    setManagementCurrent(""); setManagementNew(""); setManagementConfirm("");
    setEmployeesCurrent(""); setEmployeesNew(""); setEmployeesConfirm("");
  }

  function savePin(key: string, label: string, currentCode: string, newCode: string, confirmCode: string) {
    const stored = localStorage.getItem(key) || "1234";
    if (currentCode !== stored) return alert(`Code actuel ${label} incorrect.`);
    if (!newCode || newCode.length < 4) return alert("Le nouveau code doit contenir au moins 4 caractères.");
    if (newCode !== confirmCode) return alert("La confirmation ne correspond pas au nouveau code.");
    localStorage.setItem(key, newCode);
    resetPins();
    alert(`Code d'accès ${label} modifié.`);
  }

  async function changePassword(e: any) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return alert("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    if (newPassword !== confirmPassword) return alert("La confirmation ne correspond pas au nouveau mot de passe.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) return alert(error.message);
    setNewPassword("");
    setConfirmPassword("");
    alert("Mot de passe de connexion modifié.");
  }

  return <div className="space-y-5">
    <Section title="Paramètres d'accès" subtitle="Modifier les codes d'accès internes et le mot de passe de connexion." />

    <Card className="border-l-4 border-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">Mot de passe de connexion</h3>
          <p className="text-sm text-slate-500">Compte connecté : {session?.user?.email || "Utilisateur"}</p>
        </div>
        <Badge tone="blue">Sécurité</Badge>
      </div>
      <form onSubmit={changePassword} className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Nouveau mot de passe"><Input type="password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} placeholder="Minimum 6 caractères" /></Field>
        <Field label="Confirmer"><Input type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} /></Field>
        <div className="flex items-end"><Button disabled={saving} className="w-full">{saving ? "Modification..." : "Modifier le mot de passe"}</Button></div>
      </form>
    </Card>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <h3 className="text-xl font-black">Code d'accès Gestion</h3>
        <p className="mt-1 text-sm text-slate-500">Ce code protège l'accès au module Gestion.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Code actuel"><Input type="password" value={managementCurrent} onChange={(e: any) => setManagementCurrent(e.target.value)} placeholder="Code actuel" /></Field>
          <Field label="Nouveau code"><Input type="password" value={managementNew} onChange={(e: any) => setManagementNew(e.target.value)} placeholder="Nouveau code" /></Field>
          <Field label="Confirmer le nouveau code"><Input type="password" value={managementConfirm} onChange={(e: any) => setManagementConfirm(e.target.value)} /></Field>
          <Button onClick={() => savePin("asb_pin_management", "Gestion", managementCurrent, managementNew, managementConfirm)}>Enregistrer le code Gestion</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-black">Code d'accès Salariés</h3>
        <p className="mt-1 text-sm text-slate-500">Ce code protège l'accès au module Salariés.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Code actuel"><Input type="password" value={employeesCurrent} onChange={(e: any) => setEmployeesCurrent(e.target.value)} placeholder="Code actuel" /></Field>
          <Field label="Nouveau code"><Input type="password" value={employeesNew} onChange={(e: any) => setEmployeesNew(e.target.value)} placeholder="Nouveau code" /></Field>
          <Field label="Confirmer le nouveau code"><Input type="password" value={employeesConfirm} onChange={(e: any) => setEmployeesConfirm(e.target.value)} /></Field>
          <Button onClick={() => savePin("asb_pin_employees", "Salariés", employeesCurrent, employeesNew, employeesConfirm)}>Enregistrer le code Salariés</Button>
        </div>
      </Card>
    </div>

    <Card className="bg-amber-50">
      <h3 className="font-black text-amber-900">Information importante</h3>
      <p className="mt-1 text-sm text-amber-900">Les codes internes Gestion/Salariés sont enregistrés sur le navigateur utilisé. Le mot de passe de connexion, lui, est modifié dans Supabase Auth.</p>
    </Card>
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
