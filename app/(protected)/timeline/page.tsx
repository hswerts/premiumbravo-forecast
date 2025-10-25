// app/timeline/page.tsx - VERSÃO MINIMALISTA
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  code: string
  name: string
  budget_hours?: number
  budget_value?: number
  project_type?: string
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
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

const mustWarn = (d: Date, totalHoursForCell: number) => {
  return isWeekend(d) ? totalHoursForCell > 0 : totalHoursForCell > 8
}

// Função para obter estilos baseados no tipo de projeto - VERSÃO MINIMALISTA
const getProjectTypeStyles = (projectType: string | null | undefined) => {
  if (!projectType) return 'bg-gray-50 text-gray-700 border-gray-200'
  
  switch (projectType) {
    case 'Auditoria Interna':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'Inventários':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'CVM 88':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'Projetos Especiais':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'Outros':
      return 'bg-green-50 text-green-700 border-green-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

// Estilos para badges pequenos e compactos
const getProjectBadgeStyles = (projectType: string | null | undefined) => {
  if (!projectType) return 'text-gray-700'
  
  switch (projectType) {
    case 'Auditoria Interna':
      return 'text-blue-600'
    case 'Inventários':
      return 'text-red-600'
    case 'CVM 88':
      return 'text-orange-600'
    case 'Projetos Especiais':
      return 'text-yellow-700'
    case 'Outros':
      return 'text-green-600'
    default:
      return 'text-gray-700'
  }
}

export default function TimelinePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [currentWeek, setCurrentWeek] = useState<Date[]>([])
  const [draggingProject, setDraggingProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // === Menu contextual ===
  type CtxMenu = {
    show: boolean
    x: number
    y: number
    personId?: string
    dateISO?: string
  }

  const [ctxMenu, setCtxMenu] = useState<CtxMenu>({ show: false, x: 0, y: 0 })
  const closeCtxMenu = () => setCtxMenu(m => ({ ...m, show: false }))

  const openCtxMenu = (e: React.MouseEvent, personId: string, dateISO: string) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      personId,
      dateISO,
    })
  }

  useEffect(() => {
    const onClick = () => closeCtxMenu()
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCtxMenu() }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onEsc)
    }
  }, [])

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

  const saveAssignments = async (updatedAssignments: Assignment[]) => {
    setAssignments(updatedAssignments)
    
    try {
      for (const assignment of updatedAssignments) {
        const { data: existingAssignment } = await supabase
          .from('assignments')
          .select('id')
          .eq('person_id', assignment.person_id)
          .eq('project_id', assignment.project_id)
          .eq('date', assignment.date)
          .single()

        if (existingAssignment) {
          const { error } = await supabase
            .from('assignments')
            .update({ hours: assignment.hours })
            .eq('id', existingAssignment.id)

          if (error) throw error
        } else {
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

  const generateWeek = (offset: number = 0) => {
    const base = new Date()
    const d = new Date(base)
    d.setDate(d.getDate() + 7 * offset)

    const start = new Date(d)
    const day = start.getDay()
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + diff)

    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(start)
      nextDay.setDate(start.getDate() + i)
      week.push(nextDay)
    }
    setCurrentWeek(week)
  }

  const getTotalHoursPerDay = (personId: string, dateString: string) => {
    return assignments
      .filter(a => a.person_id === personId && a.date === dateString)
      .reduce((sum, a) => sum + a.hours, 0)
  }

  const handleDragStart = (projectId: string) => {
    setDraggingProject(projectId)
  }

  const handleDrop = (personId: string, dateString: string) => {
    if (!draggingProject) return

    const newAssignment: Assignment = {
      id: `${personId}-${draggingProject}-${dateString}`,
      person_id: personId,
      project_id: draggingProject,
      date: dateString,
      hours: 8
    }

    const updated = [...assignments, newAssignment]
    saveAssignments(updated)
    setDraggingProject(null)
  }

  const updateAssignmentHours = (assignmentId: string, hours: number) => {
    const updated = assignments.map((a) =>
      a.id === assignmentId ? { ...a, hours } : a
    )
    saveAssignments(updated)
  }

  const removeAssignment = (assignmentId: string) => {
    const updated = assignments.filter((a) => a.id !== assignmentId)
    saveAssignments(updated)
  }

  const allocateWeekForPerson = (personId: string, opts: { hours: number; weekdaysOnly: boolean }) => {
    if (!draggingProject) return

    const newAssignments: Assignment[] = currentWeek
      .filter(date => {
        if (opts.weekdaysOnly) {
          const dow = date.getDay()
          return dow >= 1 && dow <= 5
        }
        return true
      })
      .map(date => {
        const dateString = date.toISOString().split('T')[0]
        return {
          id: `${personId}-${draggingProject}-${dateString}`,
          person_id: personId,
          project_id: draggingProject!,
          date: dateString,
          hours: opts.hours
        }
      })

    const updated = [...assignments, ...newAssignments]
    saveAssignments(updated)
    closeCtxMenu()
  }

  const clearWeekForPersonProject = (personId: string) => {
    if (!draggingProject) return
    const weekDates = currentWeek.map(d => d.toISOString().split('T')[0])
    const updated = assignments.filter(a => {
      if (a.person_id === personId && a.project_id === draggingProject) {
        return !weekDates.includes(a.date)
      }
      return true
    })
    saveAssignments(updated)
    closeCtxMenu()
  }

  const clearWeekForPersonAll = (personId: string) => {
    const weekDates = currentWeek.map(d => d.toISOString().split('T')[0])
    const updated = assignments.filter(a => {
      if (a.person_id === personId) {
        return !weekDates.includes(a.date)
      }
      return true
    })
    saveAssignments(updated)
    closeCtxMenu()
  }

  const formatDate = (date: Date) => {
    const daysOfWeek = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const dayName = daysOfWeek[date.getDay()]
    return `${dayName}, ${day}/${month}`
  }

  const getProjectDisplayName = (project: Project | undefined) => {
    if (!project) return '???'
    const maxLength = 20
    const displayName = `${project.code}: ${project.name}`
    return displayName.length > maxLength 
      ? displayName.substring(0, maxLength) + '...' 
      : displayName
  }

  return (
    <div className="space-y-4 p-4 max-w-[100rem] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Timeline de Alocações</h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => generateWeek(-1)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
          >
            ← Semana Anterior
          </button>
          <button 
            onClick={() => generateWeek(1)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
          >
            Próxima Semana →
          </button>
        </div>
      </div>

      {/* Projetos Disponíveis */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Projetos Disponíveis (Arraste para alocar):</h3>
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`border rounded px-3 py-1.5 text-xs cursor-move hover:opacity-80 transition-all ${getProjectTypeStyles(project.project_type)}`}
              draggable
              onDragStart={() => handleDragStart(project.id)}
            >
              <strong>{project.code}</strong>: {project.name}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline - VERSÃO MINIMALISTA */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '11rem' }} />
            {currentWeek.map((date, i) => {
              const isWeekendDay = date.getDay() === 0 || date.getDay() === 6
              return (
                <col
                  key={i}
                  style={{
                    width: isWeekendDay ? '8rem' : '15rem',
                  }}
                />
              )
            })}
          </colgroup>

          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 bg-gray-50 border-b">
                Pessoa / Data
              </th>

              {currentWeek.map((date, index) => {
                const isWeekendDay = date.getDay() === 0 || date.getDay() === 6

                return (
                  <th
                    key={index}
                    className={`px-3 py-2 text-center text-xs font-medium border-b ${
                      isWeekendDay
                        ? 'bg-gray-50 text-gray-500'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {formatDate(date)}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {people.map((person, personIndex) => (
              <tr key={person.id} className={personIndex > 0 ? 'border-t border-gray-100' : ''}>
                <td className="px-3 py-2.5">
                  <div className="text-sm font-medium text-gray-900">
                    {person.full_name}
                  </div>
                </td>
                
                {currentWeek.map((date, dayIndex) => {
                  const dateString = date.toISOString().split('T')[0]
                  const totalHours = getTotalHoursPerDay(person.id, dateString)
                  const warning = mustWarn(date, totalHours)
                  const isWeekendDay = date.getDay() === 0 || date.getDay() === 6
                  
                  return (
                    <td 
                      key={dayIndex}
                      className={`px-2 py-2.5 ${isWeekendDay ? 'bg-gray-50' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'copy'
                      }}
                      onDrop={() => handleDrop(person.id, dateString)}
                      onContextMenuCapture={(e) => openCtxMenu(e, person.id, dateString)}
                      onContextMenu={(e) => openCtxMenu(e, person.id, dateString)}
                    >
                      <div className={`min-h-[60px] rounded transition-colors ${
                        warning ? 'bg-red-50/50' : ''
                      }`}>
                        <div className="space-y-1">
                          {assignments
                            .filter(a => a.person_id === person.id && a.date === dateString)
                            .map((assignment) => {
                              const project = projects.find(p => p.id === assignment.project_id)
                              return (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between gap-1.5 py-0.5"
                                >
                                  <span 
                                    className={`text-[11px] font-semibold truncate ${getProjectBadgeStyles(project?.project_type)}`}
                                    title={project?.name || ''}
                                  >
                                    {project?.code || '???'}
                                  </span>
                                  
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <input
                                      type="number"
                                      min={0}
                                      max={19}
                                      step={1}
                                      value={assignment.hours}
                                      onChange={(e) => updateAssignmentHours(assignment.id, parseFloat(e.target.value) || 0)}
                                      className="w-7 text-[11px] text-center border border-gray-300 rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      aria-label="Horas"
                                    />

                                    <button
                                      onClick={() => removeAssignment(assignment.id)}
                                      className="text-gray-400 hover:text-red-600 text-xs w-4 h-4 flex items-center justify-center"
                                      aria-label="Remover"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          }
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-1.5">Como usar:</h3>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>• <strong>Arraste os projetos</strong> para os dias da semana de cada pessoa</li>
          <li>• <strong>Ajuste as horas</strong> diretamente no input de cada alocação</li>
          <li>• <strong>Clique no ×</strong> para remover uma alocação</li>
          <li>• <strong>Vermelho</strong> indica: dias úteis &gt; 8h, ou qualquer hora no fim de semana</li>
          <li>• <strong>Dados salvos automaticamente</strong> no banco de dados</li>
          <li>• <strong>Cores dos projetos</strong> indicam o tipo: Azul=Auditoria, Vermelho=Inventários, Laranja=CVM88, Amarelo=Especiais, Verde=Outros</li>
        </ul>
      </div>

      {/* Menu Contextual */}
      {ctxMenu.show && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg w-64"
          style={{ top: ctxMenu.y + 4, left: ctxMenu.x + 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-gray-500 border-b">
            Ações para: <span className="font-medium text-gray-700">
              {people.find(p => p.id === ctxMenu.personId)?.full_name}
            </span>
          </div>

          <button
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
              draggingProject ? 'text-gray-800' : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() =>
              draggingProject &&
              ctxMenu.personId &&
              allocateWeekForPerson(ctxMenu.personId, { hours: 8, weekdaysOnly: true })
            }
          >
            Alocar <b>8h (seg–sex)</b> para o projeto arrastado
          </button>

          <button
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
              draggingProject ? 'text-gray-800' : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() =>
              draggingProject &&
              ctxMenu.personId &&
              allocateWeekForPerson(ctxMenu.personId, { hours: 8, weekdaysOnly: false })
            }
          >
            Alocar <b>8h (dom–sáb)</b> para o projeto arrastado
          </button>

          <div className="my-1 border-t" />

          <button
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
              draggingProject ? 'text-gray-800' : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() =>
              draggingProject &&
              ctxMenu.personId &&
              clearWeekForPersonProject(ctxMenu.personId)
            }
          >
            Limpar semana (apenas este projeto arrastado)
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-red-700"
            onClick={() =>
              ctxMenu.personId && clearWeekForPersonAll(ctxMenu.personId)
            }
          >
            Limpar semana (todas as alocações da pessoa)
          </button>
        </div>
      )}
    </div>
  )
}
