// app/projects/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  code: string
  name: string
  client_name?: string
  budget_hours?: number
  budget_value?: number
  status: string
  created_at?: string
}

type SortKey =
  | 'code'
  | 'name'
  | 'client_name'
  | 'budget_hours'
  | 'budget_value'
  | 'status'
  | 'created_at'

type SortDirection = 'asc' | 'desc'

const STORAGE_KEY = 'projectsSort-v1'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // estado de ordenação
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    clientName: '',
    budgetHours: '',
    budgetValue: ''
  })

  // --- carregar ordenação salva ---
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { key?: string; dir?: SortDirection }

      const validKeys: SortKey[] = [
        'code', 'name', 'client_name', 'budget_hours', 'budget_value', 'status', 'created_at'
      ]
      if (parsed.key && (validKeys as string[]).includes(parsed.key)) {
        setSortKey(parsed.key as SortKey)
      }
      if (parsed.dir === 'asc' || parsed.dir === 'desc') {
        setSortDir(parsed.dir)
      }
    } catch {
      /* ignora erros */
    }
  }, [])

  // --- salvar ordenação ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: sortKey, dir: sortDir }))
  }, [sortKey, sortDir])

  // --- carregar projetos ---
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
      alert('Erro ao carregar projetos')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const newProject = {
        code: formData.code,
        name: formData.name,
        client_name: formData.clientName || null,
        budget_hours: formData.budgetHours ? parseFloat(formData.budgetHours) : null,
        budget_value: formData.budgetValue ? parseFloat(formData.budgetValue) : null
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()

      if (error) throw error

      setProjects([data[0], ...projects])

      setFormData({
        code: '',
        name: '',
        clientName: '',
        budgetHours: '',
        budgetValue: ''
      })
      setShowForm(false)
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
      alert('Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // --- ordenação em memória ---
  const sortedProjects = useMemo(() => {
    const copy = [...projects]

    const getVal = (p: Project, key: SortKey) => {
      switch (key) {
        case 'code': return Number(p.code) || 0
        case 'name': return p.name || ''
        case 'client_name': return p.client_name || ''
        case 'budget_hours': return typeof p.budget_hours === 'number' ? p.budget_hours : -Infinity
        case 'budget_value': return typeof p.budget_value === 'number' ? p.budget_value : -Infinity
        case 'status': return p.status || ''
        case 'created_at': return p.created_at ? new Date(p.created_at).getTime() : -Infinity
      }
    }

    copy.sort((a, b) => {
      const va = getVal(a, sortKey)
      const vb = getVal(b, sortKey)

      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else cmp = String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' })

      return sortDir === 'asc' ? cmp : -cmp
    })

    return copy
  }, [projects, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const headerBtn =
    'flex items-center gap-1 select-none cursor-pointer text-left text-xs font-medium uppercase'
  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'

  // --- UI ---
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Projetos PremiumBravo</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          + Novo Projeto
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Cadastrar Novo Projeto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código (4 números) *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  pattern="\d{4}"
                  maxLength={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Auditoria Contábil 2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horas Previstas</label>
                <input
                  type="number"
                  name="budgetHours"
                  value={formData.budgetHours}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 160"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  name="budgetValue"
                  value={formData.budgetValue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 25000"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Projeto'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Projetos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('code')} title="Ordenar por código">
                  <span className="uppercase">Código</span>
                  <span>{arrow('code')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('name')} title="Ordenar por projeto">
                  <span className="uppercase">Projeto</span>
                  <span>{arrow('name')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('client_name')} title="Ordenar por cliente">
                  <span className="uppercase">Cliente</span>
                  <span>{arrow('client_name')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('budget_hours')} title="Ordenar por horas">
                  <span className="uppercase">Horas</span>
                  <span>{arrow('budget_hours')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('budget_value')} title="Ordenar por valor">
                  <span className="uppercase">Valor</span>
                  <span>{arrow('budget_value')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('status')} title="Ordenar por status">
                  <span className="uppercase">Status</span>
                  <span>{arrow('status')}</span>
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {sortedProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-4 py-1.5 font-mono text-gray-900">{project.code}</td>
                <td className="px-4 py-1.5 font-medium text-gray-900">{project.name}</td>
                <td className="px-4 py-1.5 text-gray-500">{project.client_name || '-'}</td>
                <td className="px-4 py-1.5 text-gray-500">
                  {typeof project.budget_hours === 'number' ? `${project.budget_hours}h` : '-'}
                </td>
                <td className="px-4 py-1.5 text-gray-500">
                  {typeof project.budget_value === 'number'
                    ? `R$ ${project.budget_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="px-4 py-1.5">
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {project.status}
                  </span>
                </td>
              </tr>
            ))}
            {sortedProjects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
                  Nenhum projeto cadastrado ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
