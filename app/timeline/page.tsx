// app/timeline/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  code: string
  name: string
  budget_hours?: number
  budget_value?: number
}

interface Person {
  id: string
  timesheet_code: string
  full_name: string
  role: string
  department: string
  hourly_cost: number
}

interface Assignment {
  id: string
  person_id: string
  project_id: string
  date: string
  hours: number
  created_at?: string
}

/* ===== Helpers de data/visual ===== */
const isWeekend = (d: Date) => {
  const dow = d.getDay() // 0 = dom, 6 = sáb
  return dow === 0 || dow === 6
}

const mustWarn = (d: Date, totalHoursForCell: number) => {
  // fim de semana: qualquer hora fica vermelho; dia útil: > 8h
  return isWeekend(d) ? totalHoursForCell > 0 : totalHoursForCell > 8
}

export default function TimelinePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [currentWeek, setCurrentWeek] = useState<Date[]>([])
  const [draggingProject, setDraggingProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Buscar projetos, pessoas e assignments
  useEffect(() => {
    loadAllData()
    generateWeek()
  }, [])

  const loadAllData = async () => {
    await loadProjects()
    await loadPeople()
    await loadAssignments()
  }

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
    }
  }

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

  // Salvar assignments no Supabase - VERSÃO CORRIGIDA
  const saveAssignments = async (updatedAssignments: Assignment[]) => {
    setAssignments(updatedAssignments)
    
    try {
      // Para cada assignment, verifica se precisa criar ou atualizar
      for (const assignment of updatedAssignments) {
        // Verifica se o assignment já existe no Supabase
        const { data: existingAssignment } = await supabase
          .from('assignments')
          .select('id')
          .eq('person_id', assignment.person_id)
          .eq('project_id', assignment.project_id)
          .eq('date', assignment.date)
          .single()

        if (existingAssignment) {
          // Atualiza assignment existente
          const { error } = await supabase
            .from('assignments')
            .update({ hours: assignment.hours })
            .eq('id', existingAssignment.id)

          if (error) throw error
        } else {
          // Cria novo assignment
          const { error } = await supabase
            .from('assignments')
            .insert([{
              person_id: assignment.person_id,
              project_id: assignment.project_id,
              date: assignment.date,
              hours: assignment.hours
            }])

          if (error) throw error
        }
      }

      // Remove assignments que não estão mais na lista
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select('id, person_id, project_id, date')

      if (allAssignments) {
        for (const dbAssignment of allAssignments) {
          const existsInLocal = updatedAssignments.some(a => 
            a.person_id === dbAssignment.person_id &&
            a.project_id === dbAssignment.project_id && 
            a.date === dbAssignment.date
          )

          if (!existsInLocal) {
            const { error } = await supabase
              .from('assignments')
              .delete()
              .eq('id', dbAssignment.id)

            if (error) console.error('Erro ao remover assignment:', error)
          }
        }
      }

      console.log('✅ Assignments sincronizados com o Supabase')
    } catch (error) {
      console.error('Erro ao salvar assignments:', error)
      alert('Erro ao salvar alocações. Tente novamente.')
    }
  }

  // Gerar semana (domingo a sábado)
  // use: generateWeek() para a semana atual
  //      generateWeek(-1) semana anterior, generateWeek(1) próxima, etc.
  const generateWeek = (offset: number = 0) => {
    // base = hoje deslocado por 'offset' semanas
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + offset * 7)

    // encontrar o domingo da semana-base
    const sunday = new Date(base)
    const dow = sunday.getDay() // 0=domingo, 6=sábado
    sunday.setDate(sunday.getDate() - dow)

    // montar os 7 dias (dom → sáb)
    const week: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      return d
    })

    setCurrentWeek(week)
  }

  // Formatar data para exibição
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      weekday: 'short'
    })
  }

  // Calcular horas totais alocadas para uma pessoa em um dia
  const getTotalHoursPerDay = (personId: string, date: string) => {
    const dayAssignments = assignments.filter(a => 
      a.person_id === personId && a.date === date
    )
    return dayAssignments.reduce((total, assignment) => total + assignment.hours, 0)
  }

  // Criar/mover alocação - VERSÃO SIMPLIFICADA
  const handleAssignment = async (projectId: string, personId: string, date: string, hours: number = 8) => {
    // Verifica se já existe uma alocação para esta pessoa+projeto+data
    const existingAssignmentIndex = assignments.findIndex(a => 
      a.person_id === personId && 
      a.project_id === projectId && 
      a.date === date
    )

    let updatedAssignments: Assignment[]

    if (existingAssignmentIndex !== -1) {
      // Atualizar alocação existente
      updatedAssignments = [...assignments]
      updatedAssignments[existingAssignmentIndex].hours += hours
    } else {
      // Criar nova alocação
      const newAssignment: Assignment = {
        id: Math.random().toString(36), // ID temporário
        project_id: projectId,
        person_id: personId,
        date,
        hours
      }
      updatedAssignments = [...assignments, newAssignment]
    }

    // Atualiza o estado local imediatamente para resposta rápida
    setAssignments(updatedAssignments)
    
    // Sincroniza com o Supabase em background
    saveAssignments(updatedAssignments)
  }

  // Remover alocação
  const removeAssignment = async (assignmentId: string) => {
    const updatedAssignments = assignments.filter(a => a.id !== assignmentId)
    
    // Atualiza o estado local imediatamente
    setAssignments(updatedAssignments)
    
    // Sincroniza com o Supabase
    await saveAssignments(updatedAssignments)
  }

  // Iniciar arrasto do projeto
  const handleDragStart = (projectId: string) => {
    setDraggingProject(projectId)
  }

  // Soltar projeto em uma pessoa/dia
  const handleDrop = (personId: string, date: string) => {
    if (draggingProject) {
      handleAssignment(draggingProject, personId, date)
      setDraggingProject(null)
    }
  }

  // Navegar entre semanas (mantive sua lógica original)
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = currentWeek.map(day => {
      const newDate = new Date(day)
      newDate.setDate(day.getDate() + (direction === 'next' ? 7 : -7))
      return newDate
    })
    setCurrentWeek(newWeek)
  }

  // Editar horas de uma alocação
  const updateAssignmentHours = async (assignmentId: string, hours: number) => {
    if (hours <= 0) {
      await removeAssignment(assignmentId)
      return
    }

    const updatedAssignments = assignments.map(a => 
      a.id === assignmentId ? { ...a, hours } : a
    )
    
    // Atualiza o estado local imediatamente
    setAssignments(updatedAssignments)
    
    // Sincroniza com o Supabase
    await saveAssignments(updatedAssignments)
  }

  // Função para formatar o nome do projeto (código + primeiros caracteres)
  const getProjectDisplayName = (project: Project | undefined) => {
    if (!project) return "Projeto Não Encontrado"
    
    const maxLength = 28 // cabe em 1 linha com as larguras definidas
    let projectName = project.name
    
    if (projectName.length > maxLength) {
      projectName = projectName.substring(0, maxLength) + "..."
    }
    
    return `${project.code}: ${projectName}`
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Timeline de Alocações</h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            ← Semana Anterior
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Próxima Semana →
          </button>
        </div>
      </div>

      {/* Projetos Disponíveis (Arrastáveis) */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Projetos Disponíveis (Arraste para alocar):</h3>
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-green-100 border border-green-300 rounded px-3 py-2 text-sm cursor-move hover:bg-green-200 transition-colors"
              draggable
              onDragStart={() => handleDragStart(project.id)}
            >
              <strong>{project.code}</strong>: {project.name}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-md overflow-auto">
        <table className="w-full table-fixed">
          {/* Larguras fixas: 1ª coluna (pessoa) + colunas/dia iguais */}
          <colgroup>
            <col style={{ width: '11rem' }} /> {/* Pessoa */}
            {currentWeek.map((_, i) => (
              <col key={i} style={{ width: '13rem' }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 border-b">
                Pessoa / Data
              </th>
              {currentWeek.map((date, index) => (
                <th 
                  key={index}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-gray-50 border-b"
                >
                  {formatDate(date)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="border-b">
                <td className="px-4 py-3">
                  {/* Só o nome da pessoa */}
                  <div className="font-medium text-gray-900">
                    {person.full_name}
                  </div>
                </td>
                
                {currentWeek.map((date, dayIndex) => {
                  const dateString = date.toISOString().split('T')[0]
                  const totalHours = getTotalHoursPerDay(person.id, dateString)
                  const warning = mustWarn(date, totalHours)
                  
                  return (
                    <td 
                      key={dayIndex}
                      className="px-4 py-3 border-l border-gray-200 overflow-hidden"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'copy'
                      }}
                      onDrop={() => handleDrop(person.id, dateString)}
                    >
                      <div className={`p-2 rounded border-2 border-dashed min-h-16 ${
                        warning ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-300'
                      }`}>
                        {assignments
                          .filter(a => a.person_id === person.id && a.date === dateString)
                          .map((assignment) => {
                            const project = projects.find(p => p.id === assignment.project_id)
                            // Uma linha: nome do projeto + input de horas ao lado (com truncamento)
                            return (
                              <div
                                key={assignment.id}
                                className="bg-green-100 border border-green-300 rounded px-2 py-1 mb-1 text-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium text-xs truncate min-w-0 flex-1">
                                    {getProjectDisplayName(project)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={19}
                                      step={1}
                                      value={assignment.hours}
                                      onChange={(e) => updateAssignmentHours(assignment.id, parseFloat(e.target.value) || 0)}
                                      inputMode="decimal"
                                      className="w-8 text-xs text-right border rounded px-0.5 py-0.5 focus:outline-none"
                                      aria-label="Horas"
                                      title="Horas"
                                    />

                                      <button
                                       onClick={() => removeAssignment(assignment.id)}
                                       className="text-red-500 hover:text-red-700 text-xs"
                                        aria-label="Remover alocação"
                                      >
                                        ×
                                      </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        }

                        {/* Sem “Total: Xh” — removido para ganhar espaço */}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda e Instruções */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Como usar:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Arraste os projetos</strong> para os dias da semana de cada pessoa</li>
          <li>• <strong>Ajuste as horas</strong> diretamente no input de cada alocação</li>
          <li>• <strong>Clique no ×</strong> para remover uma alocação</li>
          <li>• <strong>Vermelho</strong> indica: dias úteis &gt; 8h, ou qualquer hora no fim de semana</li>
          <li>• <strong>Dados salvos automaticamente</strong> no banco de dados</li>
        </ul>
      </div>
    </div>
  )
}
