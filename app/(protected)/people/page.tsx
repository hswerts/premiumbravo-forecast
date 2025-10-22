// app/people/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Person {
  id: string
  timesheet_code: string
  full_name: string
  role: string
  department: string
  hourly_cost: number
  active: boolean
  created_at?: string
}

type SortKey =
  | 'timesheet_code'
  | 'full_name'
  | 'role'
  | 'department'
  | 'hourly_cost'
  | 'active'
  | 'created_at'

type SortDirection = 'asc' | 'desc'

const STORAGE_KEY = 'peopleSort-v1'

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // ordenação
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const [formData, setFormData] = useState({
    timesheetCode: '',
    fullName: '',
    role: '',
    department: '',
    hourlyCost: ''
  })

  // ---- carregar ordenação salva ----
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { key?: string; dir?: SortDirection }

      const validKeys: SortKey[] = [
        'timesheet_code','full_name','role','department','hourly_cost','active','created_at'
      ]
      if (parsed.key && (validKeys as string[]).includes(parsed.key)) {
        setSortKey(parsed.key as SortKey)
      }
      if (parsed.dir === 'asc' || parsed.dir === 'desc') {
        setSortDir(parsed.dir)
      }
    } catch {
      /* ignora erros de parse */
    }
  }, [])

  // ---- salvar ordenação ----
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: sortKey, dir: sortDir }))
  }, [sortKey, sortDir])

  useEffect(() => {
    loadPeople()
  }, [])

  const loadPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPeople(data || [])
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error)
      alert('Erro ao carregar pessoas')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const newPerson = {
        timesheet_code: formData.timesheetCode,
        full_name: formData.fullName,
        role: formData.role,
        department: formData.department,
        hourly_cost: formData.hourlyCost ? parseFloat(formData.hourlyCost) : 0,
      }

      const { data, error } = await supabase
        .from('people')
        .insert([newPerson])
        .select()

      if (error) throw error

      setPeople([data[0], ...people])

      setFormData({
        timesheetCode: '',
        fullName: '',
        role: '',
        department: '',
        hourlyCost: ''
      })
      setShowForm(false)
    } catch (error) {
      console.error('Erro ao criar pessoa:', error)
      alert('Erro ao criar pessoa')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // ordenação em memória
  const sortedPeople = useMemo(() => {
    const copy = [...people]

    const getVal = (p: Person, key: SortKey) => {
      switch (key) {
        case 'timesheet_code':
          return Number(p.timesheet_code) || 0
        case 'full_name':
          return p.full_name || ''
        case 'role':
          return p.role || ''
        case 'department':
          return p.department || ''
        case 'hourly_cost':
          return typeof p.hourly_cost === 'number' ? p.hourly_cost : -Infinity
        case 'active':
          return p.active ? 1 : 0
        case 'created_at':
          return p.created_at ? new Date(p.created_at).getTime() : -Infinity
      }
    }

    copy.sort((a, b) => {
      const va = getVal(a, sortKey)
      const vb = getVal(b, sortKey)

      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' })
      }

      return sortDir === 'asc' ? cmp : -cmp
    })

    return copy
  }, [people, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const headerBtn =
    'flex items-center gap-1 select-none cursor-pointer text-left text-xs font-medium uppercase'
  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'

  const departments = ['Auditoria', 'Consultoria', 'Administrativo', 'TI', 'Financeiro']
  const roles = ['Auditor Júnior', 'Auditor Pleno', 'Auditor Sênior', 'Gerente', 'Coordenador', 'Estagiário', 'Analista']

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Equipe PremiumBravo</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          + Nova Pessoa
        </button>
      </div>

      {/* Formulário de Cadastro */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Cadastrar Nova Pessoa</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Timesheet (4 números) *
                </label>
                <input
                  type="text"
                  name="timesheetCode"
                  value={formData.timesheetCode}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: João Silva"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cargo</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um departamento</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo Efetivo da Hora (R$) *
              </label>
              <input
                type="number"
                name="hourlyCost"
                value={formData.hourlyCost}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 85.50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Custo total da hora trabalhada (salário + encargos + benefícios)
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Pessoa'}
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

      {/* Lista de Pessoas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('timesheet_code')} title="Ordenar por código">
                  <span className="uppercase">Código</span>
                  <span>{arrow('timesheet_code')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('full_name')} title="Ordenar por nome">
                  <span className="uppercase">Nome</span>
                  <span>{arrow('full_name')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('role')} title="Ordenar por cargo">
                  <span className="uppercase">Cargo</span>
                  <span>{arrow('role')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('department')} title="Ordenar por departamento">
                  <span className="uppercase">Departamento</span>
                  <span>{arrow('department')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('hourly_cost')} title="Ordenar por custo hora">
                  <span className="uppercase">Custo Hora (R$)</span>
                  <span>{arrow('hourly_cost')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-500">
                <button className={headerBtn} onClick={() => toggleSort('active')} title="Ordenar por status">
                  <span className="uppercase">Status</span>
                  <span>{arrow('active')}</span>
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {sortedPeople.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-4 py-1.5 font-mono text-gray-900">{person.timesheet_code}</td>
                <td className="px-4 py-1.5 font-medium text-gray-900">{person.full_name}</td>
                <td className="px-4 py-1.5 text-gray-500">{person.role}</td>
                <td className="px-4 py-1.5 text-gray-500">{person.department}</td>
                <td className="px-4 py-1.5 text-gray-500">
                  R$ {typeof person.hourly_cost === 'number'
                      ? person.hourly_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      : '0,00'}
                </td>
                <td className="px-4 py-1.5">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    person.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {person.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
            {sortedPeople.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
                  Nenhuma pessoa cadastrada ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
