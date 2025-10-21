// app/projects/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type ProjectType =
  | 'Auditoria Interna'
  | 'Inventários'
  | 'CVM 88'
  | 'Projetos Especiais'
  | 'Outros';

type ProjectStatus = 'Aberto' | 'Fechado';

interface Project {
  id: string;
  code: string;
  name: string;
  client_name?: string | null;
  budget_hours?: number | null;
  budget_value?: number | null;
  status: ProjectStatus;
  project_type?: ProjectType | null;
  deadline?: string | null;   // ISO 'YYYY-MM-DD' no banco
  manager_id?: string | null; // FK -> people.id
}

interface Person {
  id: string;
  full_name: string;
}

const TYPE_OPTIONS: ProjectType[] = [
  'Auditoria Interna',
  'Inventários',
  'CVM 88',
  'Projetos Especiais',
  'Outros',
];

// helpers de data
function isoToBR(iso?: string | null) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function brToISO(br?: string) {
  if (!br) return null;
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(true);
  const [editing, setEditing] = useState<Project | null>(null);

  const [form, setForm] = useState({
    // linha 1
    code: '',
    name: '',
    clientName: '',
    // linha 2
    budgetHours: '',
    budgetValue: '',
    status: 'Aberto' as ProjectStatus,
    // linha 3
    projectType: '' as '' | ProjectType,
    deadlineBr: '', // dd/mm/aaaa na UI
    managerId: '',
  });

  // ------ LOADERS ------
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Erro ao carregar projects: ${err.message}`);
      console.error(err);
    }
  }, []);

  const loadPeople = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setPeople((data ?? []) as Person[]);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadPeople();
  }, [loadProjects, loadPeople]);

  const peopleDict = useMemo(
    () => Object.fromEntries(people.map(p => [p.id, p.full_name])),
    [people]
  );

  // ------ HELPERS ------
  const resetForm = () => {
    setEditing(null);
    setForm({
      code: '',
      name: '',
      clientName: '',
      budgetHours: '',
      budgetValue: '',
      status: 'Aberto',
      projectType: '',
      deadlineBr: '',
      managerId: '',
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const startEdit = (p: Project) => {
    setEditing(p);
    setShowForm(true);
    setForm({
      code: p.code ?? '',
      name: p.name ?? '',
      clientName: p.client_name ?? '',
      budgetHours: p.budget_hours != null ? String(p.budget_hours) : '',
      budgetValue: p.budget_value != null ? String(p.budget_value) : '',
      status: (p.status ?? 'Aberto') as ProjectStatus,
      projectType: (p.project_type ?? '') as '' | ProjectType,
      deadlineBr: isoToBR(p.deadline),
      managerId: p.manager_id ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ------ SUBMIT ------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      alert('Preencha Código e Nome do projeto.');
      return;
    }

    const budget_hours =
      form.budgetHours.trim() === ''
        ? null
        : Number(form.budgetHours.replace(',', '.'));
    const budget_value =
      form.budgetValue.trim() === ''
        ? null
        : Number(form.budgetValue.replace(',', '.'));
    if (budget_hours != null && (Number.isNaN(budget_hours) || budget_hours < 0)) {
      alert('Horas previstas inválidas.'); return;
    }
    if (budget_value != null && (Number.isNaN(budget_value) || budget_value < 0)) {
      alert('Valor previsto inválido.'); return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      client_name: form.clientName.trim() || null,
      budget_hours,
      budget_value,
      status: form.status, // 'Aberto' | 'Fechado'
      project_type: form.projectType || null,
      deadline: brToISO(form.deadlineBr),   // converte para ISO
      manager_id: form.managerId || null,
    };

    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editing.id);
        if (error) throw error;
        alert('Projeto atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
        alert('Projeto criado com sucesso!');
      }
      await loadProjects();
      resetForm();
      setShowForm(true);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Erro ao salvar projeto: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // badge de status na lista
  const StatusBadge = ({ value }: { value: ProjectStatus }) => (
    <span
      className={
        'px-2 py-1 text-xs rounded-full ' +
        (value === 'Aberto'
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800')
      }
    >
      {value}
    </span>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Projetos PremiumBravo <small className="ml-2 text-xs text-gray-500">v3</small>
        </h1>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          onClick={() => {
            if (editing) resetForm();
            setShowForm(s => !s);
          }}
        >
          {showForm ? 'Fechar' : '+ Novo Projeto'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? 'Editar Projeto' : 'Cadastrar Novo Projeto'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* grade 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* linha 1 */}
              <div>
                <label className="block text-sm font-medium mb-1">Código *</label>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: 1234"
                  value={form.code}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  name="name"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: Auditoria Contábil 2024"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <input
                  type="text"
                  name="clientName"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Nome do cliente"
                  value={form.clientName}
                  onChange={handleChange}
                />
              </div>

              {/* linha 2 */}
              <div>
                <label className="block text-sm font-medium mb-1">Horas Previstas</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  name="budgetHours"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: 160"
                  value={form.budgetHours}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="budgetValue"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: 25000"
                  value={form.budgetValue}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Aberto">Aberto</option>
                  <option value="Fechado">Fechado</option>
                </select>
              </div>

              {/* linha 3 */}
              <div>
                <label className="block text-sm font-medium mb-1">Tipo do Projeto</label>
                <select
                  name="projectType"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.projectType}
                  onChange={handleChange}
                >
                  <option value="">Selecione…</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Prazo final (dd/mm/aaaa)
                </label>
                <input
                  type="text"
                  name="deadlineBr"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="dd/mm/aaaa"
                  value={form.deadlineBr}
                  onChange={handleChange}
                  pattern="^\d{2}/\d{2}/\d{4}$"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gestor (people)</label>
                <select
                  name="managerId"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.managerId}
                  onChange={handleChange}
                >
                  <option value="">Selecione…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60"
              >
                {editing ? 'Salvar Projeto' : 'Salvar Projeto'}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-500 text-white"
                onClick={() => { resetForm(); setShowForm(false); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">CÓDIGO</th>
              <th className="text-left p-3">PROJETO</th>
              <th className="text-left p-3">CLIENTE</th>
              <th className="text-right p-3">HORAS</th>
              <th className="text-right p-3">VALOR</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-left p-3">TIPO</th>
              <th className="text-left p-3">PRAZO</th>
              <th className="text-left p-3">GESTOR</th>
              <th className="text-left p-3">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={10}>
                  Nenhum projeto cadastrado ainda
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.code}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.client_name ?? '—'}</td>
                <td className="p-3 text-right">{p.budget_hours ?? '—'}</td>
                <td className="p-3 text-right">{p.budget_value ?? '—'}</td>
                <td className="p-3"><StatusBadge value={p.status} /></td>
                <td className="p-3">{p.project_type ?? '—'}</td>
                <td className="p-3">{isoToBR(p.deadline) || '—'}</td>
                <td className="p-3">{p.manager_id ? (peopleDict[p.manager_id] ?? p.manager_id) : '—'}</td>
                <td className="p-3">
                  <button className="text-blue-600 underline" onClick={() => startEdit(p)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
