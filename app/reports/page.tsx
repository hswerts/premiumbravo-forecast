// app/reports/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  code: string
  name: string
  client_name?: string
  budget_hours?: number
  budget_value?: number
  status: string
}

interface Assignment {
  id: string
  person_id: string
  project_id: string
  date: string
  hours: number
}

interface Timesheet {
  id: string
  person_id: string
  project_id: string
  date: string
  planned_hours: number
  actual_hours: number | null
  status: 'pending' | 'confirmed'
}

interface ProjectReport {
  project: Project
  totalBudgetHours: number
  totalAssignedHours: number
  totalUsedHours: number
  remainingToAllocate: number
  remainingToUse: number
  allocatedPercentage: number
  usedPercentage: number
}

type SortField = 'code' | 'name' | 'totalBudgetHours' | 'totalAssignedHours' | 'totalUsedHours' | 'remainingToAllocate' | 'remainingToUse' | 'allocatedPercentage' | 'usedPercentage' | 'status'
type SortDirection = 'asc' | 'desc'

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('code', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    }
  }, [])

  const loadAssignments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Erro ao carregar assignments:', error)
    }
  }, [])

  const loadTimesheets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('status', 'confirmed')

      if (error) throw error
      setTimesheets(data || [])
    } catch (error) {
      console.error('Erro ao carregar timesheets:', error)
    }
  }, [])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadProjects(), loadAssignments(), loadTimesheets()])
    setLoading(false)
  }, [loadProjects, loadAssignments, loadTimesheets])

  // Calcular relatórios quando projetos, assignments e timesheets forem carregados
  const calculateProjectReports = useCallback(() => {
    const reports: ProjectReport[] = projects.map(project => {
      // Calcular horas alocadas para este projeto
      const projectAssignments = assignments.filter(a => a.project_id === project.id)
      const totalAssignedHours = projectAssignments.reduce((sum, assignment) => sum + assignment.hours, 0)
      
      // Calcular horas usadas (confirmadas) para este projeto
      const projectTimesheets = timesheets.filter(t => t.project_id === project.id)
      const totalUsedHours = projectTimesheets.reduce((sum, timesheet) => sum + (timesheet.actual_hours || 0), 0)
      
      const totalBudgetHours = project.budget_hours || 0
      const remainingToAllocate = Math.max(0, totalBudgetHours - totalAssignedHours)
      const remainingToUse = Math.max(0, totalBudgetHours - totalUsedHours)
      
      const allocatedPercentage = totalBudgetHours > 0 
        ? (totalAssignedHours / totalBudgetHours) * 100 
        : 0

      const usedPercentage = totalBudgetHours > 0 
        ? (totalUsedHours / totalBudgetHours) * 100 
        : 0

      return {
        project,
        totalBudgetHours,
        totalAssignedHours,
        totalUsedHours,
        remainingToAllocate,
        remainingToUse,
        allocatedPercentage,
        usedPercentage
      }
    })

    setProjectReports(reports)
  }, [projects, assignments, timesheets])

  // Carregar dados iniciais
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Calcular relatórios quando projetos, assignments e timesheets forem carregados
  useEffect(() => {
    if (projects.length > 0 && assignments.length > 0 && timesheets.length >= 0) {
      calculateProjectReports()
    }
  }, [calculateProjectReports, projects, assignments, timesheets])

  // Função para ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Aplicar ordenação
  const sortedReports = [...projectReports].sort((a, b) => {
    let aValue: string | number, bValue: string | number
    
    switch (sortField) {
      case 'code':
        aValue = a.project.code
        bValue = b.project.code
        break
      case 'name':
        aValue = a.project.name
        bValue = b.project.name
        break
      case 'totalBudgetHours':
        aValue = a.totalBudgetHours
        bValue = b.totalBudgetHours
        break
      case 'totalAssignedHours':
        aValue = a.totalAssignedHours
        bValue = b.totalAssignedHours
        break
      case 'totalUsedHours':
        aValue = a.totalUsedHours
        bValue = b.totalUsedHours
        break
      case 'remainingToAllocate':
        aValue = a.remainingToAllocate
        bValue = b.remainingToAllocate
        break
      case 'remainingToUse':
        aValue = a.remainingToUse
        bValue = b.remainingToUse
        break
      case 'allocatedPercentage':
        aValue = a.allocatedPercentage
        bValue = b.allocatedPercentage
        break
      case 'usedPercentage':
        aValue = a.usedPercentage
        bValue = b.usedPercentage
        break
      case 'status':
        aValue = a.project.status
        bValue = b.project.status
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Calcular totais gerais
  const totalBudget = projectReports.reduce((sum, report) => sum + report.totalBudgetHours, 0)
  const totalAssigned = projectReports.reduce((sum, report) => sum + report.totalAssignedHours, 0)
  const totalUsed = projectReports.reduce((sum, report) => sum + report.totalUsedHours, 0)
  const totalRemainingToAllocate = projectReports.reduce((sum, report) => sum + report.remainingToAllocate, 0)
  const totalRemainingToUse = projectReports.reduce((sum, report) => sum + report.remainingToUse, 0)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando relatórios...</div>
        </div>
      </div>
    )
  }

  // ... (restante do JSX permanece igual)
  return (
    <div className="container mx-auto p-6">
      {/* O restante do seu JSX aqui - mantive igual pois não foi modificado */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios de Projetos</h1>
        <button
          onClick={loadAllData}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Atualizar Dados
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total de Horas Orçadas</h3>
          <p className="text-3xl font-bold text-blue-600">{totalBudget}h</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Horas Alocadas</h3>
          <p className="text-3xl font-bold text-green-600">{totalAssigned}h</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalBudget > 0 ? ((totalAssigned / totalBudget) * 100).toFixed(1) : 0}% do total
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Horas Usadas</h3>
          <p className="text-3xl font-bold text-purple-600">{totalUsed}h</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(1) : 0}% do total
          </p>
        </div>
      </div>

      {/* Tabela de Projetos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('code')}
              >
                <div className="flex items-center">
                  Projeto
                  {sortField === 'code' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              {/* ... outros cabeçalhos de coluna ... */}
            </tr>
          </thead>
          {/* ... restante da tabela ... */}
        </table>
      </div>
    </div>
  )
}