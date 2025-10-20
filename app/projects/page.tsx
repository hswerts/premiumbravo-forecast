// app/projects/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ProjectType =
  | 'Auditoria Interna'
  | 'Inventários'
  | 'CVM 88'
  | 'Projetos Especiais'
  | 'Outros'

interface Project {
  id: string
  code: string
  name: string
  client_name?: string | null
  budget_hours?: number | null
  budget_value?: number | null
  status: string
  // novos
  project_type?: ProjectType | null
  deadline?: string | null // yyyy-mm-dd
  manager_id?: string | null
  created_at?: string
  updated_at?: string
}

interface Person {
  id: string
  full_name: string
}

const TYPE_OPTIONS: ProjectType[] = [
  'Auditoria Interna',
  'Inventários',
  'CVM 88',
  'Projetos Especiais',
  'Outros',
]

// util — garante yyyy-mm-dd
function toDateInputValue(d?: string | null) {
  if (!d) return ''
  // se já vier yyyy-mm-dd, retorna
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  // tenta extrair de um ISO completo
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // null => criar; Project => editar
  const [editing, setEditing] = useState<Project | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    clientName: '',
    budgetHours: '',
    budgetValue: '',
    status: 'Ativo', // ajuste se tiver lista de status
    projectType: '' as '' | ProjectType,
    deadline: '',
    managerId: '',
  })

  useEffect(() => {
    loadProjects()
    loadPeople()
  }, [])

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      alert('Erro ao carregar projetos')
      return
    }
    setProjects((data || []) as Project[])
  }

  const loadPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('id, full_name')
      .order('full_name', { ascending: true })

    if (error) {
      console.error(error)
      alert('Erro ao carregar equipe (people)')
      return
    }
    setPeople((data || []) as Person[])
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({
      code: '',
      name: '',
      clientName: '',
      budgetHours: '',
      budgetValue: '',
      status: 'Ativo',
      projectType: '',
      deadline: '',
      managerId: '',
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEdit = (p: Project) => {
    setEditing(p)
    setShowForm(true)
    setFormData({
      code: p.code ?? '',
      name: p.name ?? '',
      clientName: p.client_name ?? '',
      budgetHours: p.budget_hours != null ? String(p.budget_hours) : '',
      budgetValue: p.budget_value != null ? String(p.budget_value) : '',
      status: p.status ?? 'Ativo',
      projectType: (p.project_type ?? '') as '' | ProjectType,
      deadline: toDateInputValue(p.deadline),
      managerId: p.manager_id ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Preencha ao menos Código e Nome do projeto.')
      return
    }

    setLoading(true)
    try {
      // conversões
      const budget_hours =
        formData.budgetHours.trim() === ''
          ? null
          : Number(formData.budgetHours.replace(',', '.'))
      const budget_value =
        formData.budgetValue.trim() === ''
          ? null
          : Number(formData.budgetValue.replace(',', '.'))

      if (
        budget_hours != null &&
        (Number.isNaN(budget_hours) || budget_hours < 0)
      ) {
        alert('Horas orçadas inválidas.')
        return
      }
      if (
        budget_value != null &&
        (Number.isNaN(budget_value) || budget_value < 0)
      ) {
        alert('Valor orçado inválido.')
        return
      }

      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        client_name: formData.clientName.trim() || null,
        budget_hours,
        budget_value,
        status: formData.status,
        project_type: formData.projectType || null,
        deadline: formData.deadline || null, // yyyy-mm-dd
        manager_id: formData.managerId || null,
      }

      if (editing) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editing.id)

        if (error) throw error
        alert('Projeto atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('projects').insert(payload)
        if (error) throw error
        alert('Projeto criado com sucesso!')
      }

      await loadProjects()
      resetForm()
      setShowForm(false)
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar o projeto. Verifique as permissões/RLS.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projetos</h1>
        <button
          className="px-4 py-2 rounded-lg bg-black text-white"
          onClick={() => {
            resetForm()
            setShowForm(s => !s)
          }}
        >
          {showForm ? 'Fechar formulário' : 'Novo projeto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Código</label>
              <input
                type="text"
                name="code"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ex.: PB-2025-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                name="name"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex.: Auditoria HS Financeira 2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cliente
              </label>
              <input
                type="text"
                name="clientName"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Ex.: HS Financeira"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <input
                type="text"
                name="status"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.status}
                onChange={handleChange}
                placeholder="Ex.: Ativo, Pausado, Encerrado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Horas orçadas
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="budgetHours"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.budgetHours}
                onChange={handleChange}
                placeholder="Ex.: 120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Valor orçado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="budgetValue"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.budgetValue}
                onChange={handleChange}
                placeholder="Ex.: 45000"
              />
            </div>

            {/* novos campos */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo do Projeto
              </label>
              <select
                name="projectType"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.projectType}
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
              <label className="block text-sm font-medium mb-1">
                Prazo final
              </label>
              <input
                type="date"
                name="deadline"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Gestor (people)
              </label>
              <select
                name="managerId"
                className="w-full border rounded-lg px-3 py-2"
                value={formData.managerId}
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
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
            >
              {editing ? 'Salvar alterações' : 'Criar projeto'}
            </button>
            {editing && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg border"
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      )}

      {/* Lista simples de projetos */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border">Código</th>
              <th className="text-left p-2 border">Nome</th>
              <th className="text-left p-2 border">Cliente</th>
              <th className="text-left p-2 border">Tipo</th>
              <th className="text-left p-2 border">Prazo</th>
              <th className="text-left p-2 border">Gestor</th>
              <th className="text-left p-2 border">Ações</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2 border">{p.code}</td>
                <td className="p-2 border">{p.name}</td>
                <td className="p-2 border">{p.client_name ?? '—'}</td>
                <td className="p-2 border">{p.project_type ?? '—'}</td>
                <td className="p-2 border">{toDateInputValue(p.deadline) || '—'}</td>
                <td className="p-2 border">
                  {/* mostra apenas o id; se quiser o nome, faça join via RPC ou
                      traga o gestor na lista com uma lookup local */}
                  {p.manager_id ?? '—'}
                </td>
                <td className="p-2 border">
                  <button
                    className="text-sm underline"
                    onClick={() => handleEdit(p)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td className="p-4 text-center" colSpan={7}>
                  Nenhum projeto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
