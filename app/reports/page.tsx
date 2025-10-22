// app/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([loadProjects(), loadAssignments(), loadTimesheets()])
    setLoading(false)
  }

  const loadProjects = async () => {
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
  }

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Erro ao carregar assignments:', error)
    }
  }

  const loadTimesheets = async () => {
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
  }

  // Calcular relatórios quando projetos, assignments e timesheets forem carregados
  useEffect(() => {
    if (projects.length > 0 && assignments.length > 0 && timesheets.length >= 0) {
      calculateProjectReports()
    }
  }, [projects, assignments, timesheets])

  const calculateProjectReports = () => {
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
  }

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
    let aValue: any, bValue: any
    
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

  return (
    <div className="container mx-auto p-6">
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
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalBudgetHours')}
              >
                <div className="flex items-center justify-center">
                  Horas Orçadas
                  {sortField === 'totalBudgetHours' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalAssignedHours')}
              >
                <div className="flex items-center justify-center">
                  Horas Alocadas
                  {sortField === 'totalAssignedHours' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalUsedHours')}
              >
                <div className="flex items-center justify-center">
                  Horas Usadas
                  {sortField === 'totalUsedHours' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('remainingToAllocate')}
              >
                <div className="flex items-center justify-center">
                  Horas a Alocar
                  {sortField === 'remainingToAllocate' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('remainingToUse')}
              >
                <div className="flex items-center justify-center">
                  Horas a Usar
                  {sortField === 'remainingToUse' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('allocatedPercentage')}
              >
                <div className="flex items-center justify-center">
                  % Alocado
                  {sortField === 'allocatedPercentage' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('usedPercentage')}
              >
                <div className="flex items-center justify-center">
                  % Usado
                  {sortField === 'usedPercentage' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-center">
                  Status
                  {sortField === 'status' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedReports.map((report) => (
              <tr key={report.project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.project.code} - {report.project.name}
                      </div>
                      {report.project.client_name && (
                        <div className="text-sm text-gray-500">
                          {report.project.client_name}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-medium text-gray-900">
                    {report.totalBudgetHours}h
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-medium text-green-600">
                    {report.totalAssignedHours}h
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-medium text-purple-600">
                    {report.totalUsedHours}h
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${
                    report.remainingToAllocate > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {report.remainingToAllocate}h
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${
                    report.remainingToUse > 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {report.remainingToUse}h
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-24">
                      <div 
                        className={`h-2.5 rounded-full ${
                          report.allocatedPercentage >= 100 ? 'bg-green-600' :
                          report.allocatedPercentage >= 75 ? 'bg-blue-600' :
                          report.allocatedPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(report.allocatedPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {report.allocatedPercentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-24">
                      <div 
                        className={`h-2.5 rounded-full ${
                          report.usedPercentage >= 100 ? 'bg-red-600' :
                          report.usedPercentage >= 75 ? 'bg-orange-500' :
                          report.usedPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(report.usedPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {report.usedPercentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    report.usedPercentage >= 100 ? 'bg-red-100 text-red-800' :
                    report.allocatedPercentage >= 100 ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {report.usedPercentage >= 100 ? 'Esgotado' :
                     report.allocatedPercentage >= 100 ? 'Totalmente Alocado' : 'Em Andamento'}
                  </span>
                </td>
              </tr>
            ))}
            
            {sortedReports.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum projeto encontrado
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Footer com totais */}
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">TOTAIS</td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                {totalBudget}h
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                {totalAssigned}h
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-purple-600">
                {totalUsed}h
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-orange-600">
                {totalRemainingToAllocate}h
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                {totalRemainingToUse}h
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                {totalBudget > 0 ? ((totalAssigned / totalBudget) * 100).toFixed(1) : 0}%
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                {totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(1) : 0}%
              </td>
              <td className="px-6 py-4 text-center"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Legenda:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-1">% Alocado (Quanto maior, melhor):</h4>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                <span>100% alocado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                <span>75-99% alocado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>50-74% alocado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>0-49% alocado</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-1">% Usado (Quanto menor, melhor):</h4>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>0-49% usado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>50-74% usado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span>75-99% usado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                <span>100%+ usado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}