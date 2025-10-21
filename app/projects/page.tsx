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
  status: string; // banco pode ter restos; mapeamos para UI
  project_type?: ProjectType | null;
  deadline?: string | null;   // ISO YYYY-MM-DD
  manager_id?: string | null;
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

// --- helpers ---
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
function mapDbStatusToUi(s: string | null | undefined): ProjectStatus {
  if (!s) return 'Aberto';
  const x = s.toLowerCase();
  if (x === 'fechado' || x === 'closed') return 'Fechado';
  return 'Aberto';
}
const fmtHoras = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n);
const fmtMoeda = (n?: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(n);

// --- componente ---
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<Project | null>(null);

  // form em 3 linhas/3 colunas
  const [form, setForm] = useState({
    code: '',
    name: '',
    clientName: '',
    budgetHours: '',
    budgetValue: '',
    status: 'Aberto' as ProjectStatus,
    projectType: '' as '' | ProjectType,
    deadlineBr: '',
    managerId: '',
  });

  // carregar dados
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('code', { ascending: true });
      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (err) {
      console.error(err);
    }
  }, []);
  const loadPeople = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('people').select('id, full_name').order('full_name', { ascending: true });
      if (error) throw error;
      setPeople((data ?? []) as Person[]);
    } catch (err) {
      console.error(err);
    }
  }, []);
  useEffect(() => {
    void loadProjects();
    void loadPeople();
  }, [loadProjects, loadPeople]);

  const peopleDict = useMemo(() => Object.fromEntries(people.map(p => [p.id, p.full_name])), [people]);

  // form helpers
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      status: mapDbStatusToUi(p.status),
      projectType: (p.project_type ?? '') as '' | ProjectType,
      deadlineBr: isoToBR(p.deadline),
      managerId: p.manager_id ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // salvar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      alert('Preencha Código e Nome do projeto.');
      return;
    }
    const budget_hours = form.budgetHours.trim() === '' ? null : Number(form.budgetHours.replace(',', '.'));
    const budget_value = form.budgetValue.trim() === '' ? null : Number(form.budgetValue.replace(',', '.'));
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      client_name: form.clientName.trim() || null,
      budget_hours,
      budget_value,
      status: form.status,
      project_type: form.projectType || null,
      deadline: brToISO(form.deadlineBr),
      manager_id: form.managerId || null,
    };

    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
      }
      await loadProjects();
      resetForm();
      setShowForm(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar projeto.');
    } finally {
      setLoading(false);
    }
  };

  // --- Ordenação (como na página Equipe) ---
  type SortKey =
    | 'code'
    | 'name'
    | 'client_name'
    | 'budget_hours'
    | 'budget_value'
    | 'status'
    | 'project_type'
    | 'deadline'
    | 'manager_name';

  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const arr = projects.map(p => ({
      ...p,
      statusUi: mapDbStatusToUi(p.status),
      manager_name: p.manager_id ? peopleDict[p.manager_id] ?? '' : '',
    }));
    const getVal = (r: any) => {
      if (sortKey === 'manager_name') return r.manager_name ?? '';
      return (r as any)[sortKey];
    };
    arr.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      // números
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      // datas (ISO)
      if (sortKey === 'deadline') {
        const da = a.deadline ?? '';
        const db = b.deadline ?? '';
        return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      }
      // strings (case-insensitive)
      const sa = (va ?? '').toString().toLowerCase();
      const sb = (vb ?? '').toString().toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return arr;
  }, [projects, peopleDict, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    setSortKey(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };
  const SortButton = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(keyName)}
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
      title="Ordenar"
    >
      {label}
      <span className="text-gray-400">{sortKey === keyName ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
    </button>
  );

  const StatusBadge = ({ value }: { value: ProjectStatus }) => (
    <span
      className={
        'px-2 py-0.5 text-xs rounded-full ' +
        (value === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
      }
    >
      {value}
    </span>
  );

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projetos PremiumBravo</h1>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:opacity-90"
          onClick={() => {
            if (editing) resetForm();
            setShowForm(s => !s);
          }}
        >
          {showForm ? 'Fechar' : '+ Novo Projeto'}
        </button>
      </div>

      {/* card do formulário */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar Projeto' : 'Cadastrar Novo Projeto'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prazo final (dd/mm/aaaa)</label>
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
                  {people.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
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
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* tabela */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3"><SortButton label="CÓDIGO" keyName="code" /></th>
              <th className="text-left p-3"><SortButton label="PROJETO" keyName="name" /></th>
              <th className="text-left p-3"><SortButton label="CLIENTE" keyName="client_name" /></th>
              <th className="text-right p-3"><SortButton label="HORAS" keyName="budget_hours" /></th>
              <th className="text-right p-3"><SortButton label="VALOR" keyName="budget_value" /></th>
              <th className="text-left p-3"><SortButton label="STATUS" keyName="status" /></th>
              <th className="text-left p-3"><SortButton label="TIPO" keyName="project_type" /></th>
              <th className="text-left p-3"><SortButton label="PRAZO" keyName="deadline" /></th>
              <th className="text-left p-3"><SortButton label="GESTOR" keyName="manager_name" /></th>
              <th className="text-left p-3">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={10}>
                  Nenhum projeto cadastrado ainda
                </td>
              </tr>
            )}
            {sorted.map(p => {
              const statusUi = mapDbStatusToUi(p.status);
              const gestor = p.manager_id ? peopleDict[p.manager_id] ?? p.manager_id : '—';
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.code}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.client_name ?? '—'}</td>
                  <td className="p-3 text-right">{fmtHoras(p.budget_hours)}</td>
                  <td className="p-3 text-right">{fmtMoeda(p.budget_value)}</td>
                  <td className="p-3"><StatusBadge value={statusUi} /></td>
                  <td className="p-3">{p.project_type ?? '—'}</td>
                  <td className="p-3">{isoToBR(p.deadline) || '—'}</td>
                  <td className="p-3">{gestor}</td>
                  <td className="p-3">
                    <button className="text-blue-600 underline" onClick={() => startEdit(p)}>
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
