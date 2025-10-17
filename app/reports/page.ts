// app/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  code: string
  name: string
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

interface ProjectReport {
  project: Project
  totalBudgetHours: number
  totalAssignedHours: number
  remainingHours: number
  completionPercentage: number
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([loadProjects(), loadAssignments()])
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

  // Calcular relatórios quando projetos e assignments forem carregados
  useEffect(() => {
    if (projects.length > 0 && assignments.length > 0) {
      calculateProjectReports()
    }
  }, [projects, assignments])

  const calculateProjectReports = () => {
    const reports: ProjectReport[] = projects.map(project => {
      // Calcular horas alocadas para este projeto
      const projectAssignments = assignments.filter(a => a.project_id === project.id)
      const totalAssignedHours = projectAssignments.reduce((sum, assignment) => sum + assignment.hours, 0)
      
      const totalBudgetHours = project.budget_hours || 0
      const remainingHours = Math.max(0, totalBudgetHours - totalAssignedHours)
      
      const completionPercentage = totalBudgetHours > 0 
        ? (totalAssignedHours / totalBudgetHours) * 100 
        : 0

      return {
        project,
        totalBudgetHours,
        totalAssignedHours,
        remainingHours,
        completionPercentage
      }
    })

    setProjectReports(reports)
  }

  // Calcular totais gerais
  const totalBudget = projectReports.reduce((sum, report) => sum + report.totalBudgetHours, 0)
  const totalAssigned = projectReports.reduce((sum, report) => sum + report.totalAssignedHours, 0)
  const totalRemaining = projectReports.reduce((sum, report) => sum + report.remainingHours, 0)

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
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Saldo a Programar</h3>
          <p className="text-3xl font-bold text-orange-600">{totalRemaining}h</p>
        </div>
      </div>

      {/* Tabela de Projetos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projeto
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Horas Orçadas
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Horas Alocadas
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo a Programar
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Concluído
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projectReports.map((report) => (
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
                  <span className={`text-sm font-medium ${
                    report.remainingHours > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {report.remainingHours}h
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-24">
                      <div 
                        className={`h-2.5 rounded-full ${
                          report.completionPercentage >= 100 ? 'bg-green-600' :
                          report.completionPercentage >= 75 ? 'bg-blue-600' :
                          report.completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(report.completionPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {report.completionPercentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    report.completionPercentage >= 100 ? 'bg-green-100 text-green-800' :
                    report.remainingHours === 0 && report.totalBudgetHours > 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {report.completionPercentage >= 100 ? 'Concluído' :
                     report.remainingHours === 0 && report.totalBudgetHours > 0 ? 'Sem Saldo' : 'Em Andamento'}
                  </span>
                </td>
              </tr>
            ))}
            
            {projectReports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
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
              <td className="px-6 py-4 text-center text-sm font-semibold text-orange-600">
                {totalRemaining}h
              </td>
              <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                {totalBudget > 0 ? ((totalAssigned / totalBudget) * 100).toFixed(1) : 0}%
              </td>
              <td className="px-6 py-4 text-center"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Legenda:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-blue-700">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
            <span>100% concluído</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
            <span>75-99% concluído</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>50-74% concluído</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>0-49% concluído</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
            <span>Saldo positivo a programar</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
            <span>Sem saldo (todas horas alocadas)</span>
          </div>
        </div>
      </div>
    </div>
  )
}