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
  project_type?: string
}

interface Person {
  id: string
  timesheet_code: string
  full_name: string
  nome_de_guerra: string
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

/* ===== Helpers ===== */
const isWeekend = (d: Date) => {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

const mustWarn = (d: Date, totalHoursForCell: number) => {
  return isWeekend(d) ? totalHoursForCell > 0 : totalHoursForCell > 8
}

const getProjectTypeStyles = (projectType: string | null | undefined) => {
  if (!projectType) return 'bg-gray-100 text-gray-700 border-l-4 border-l-gray-400'
  
  switch (projectType) {
    case 'Auditoria Interna':
      return 'bg-blue-50 text-blue-800 border-l-4 border-l-blue-500'
    case 'Inventários':
      return 'bg-red-50 text-red-800 border-l-4 border-l-red-500'
    case 'CVM 88':
      return 'bg-orange-50 text-orange-800 border-l-4 border-l-orange-500'
    case 'Projetos Especiais':
      return 'bg-yellow-50 text-yellow-800 border-l-4 border-l-yellow-500'
    case 'Outros':
      return 'bg-green-50 text-green-800 border-l-4 border-l-green-500'
    default:
      return 'bg-gray-100 text-gray-700 border-l-4 border-l-gray-400'
  }
}

// 🎨 Função para estilizar os totalizadores
const getTotalStyles = (date: Date, totalHours: number) => {
  const isWeekendDay = isWeekend(date)
  
  // Fim de semana
  if (isWeekendDay) {
    if (totalHours === 0) {
      return 'bg-gray-500 text-white'
    } else {
      return 'bg-gray-500 text-white'
    }
  }
  
  // Dia útil
  if (totalHours === 0) {
    return 'bg-gray-500 text-white'
  } else if (totalHours === 8) {
    return 'bg-gray-500 text-white'
  } else if (totalHours < 8) {
    return 'bg-gray-500 text-white'
  } else {
    return 'bg-gray-500 text-white'
  }
}

export default function TimelinePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [currentWeek, setCurrentWeek] = useState<Date[]>([])
  const [draggingProject, setDraggingProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // 🆕 Estado para o filtro de departamento
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Todos')

  // Menu contextual
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
    const onClick = () => {
      closeCtxMenu()
      setDraggingProject(null)
    }
    const onEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        closeCtxMenu()
        setDraggingProject(null)
      }
    }
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
      const rows = updatedAssignments.map(a => ({
        person_id: a.person_id,
        project_id: a.project_id,
        date: a.date,
        hours: a.hours,
      }))

      const { error: upsertErr } = await supabase
        .from('assignments')
        .upsert(rows, { onConflict: 'person_id,project_id,date' })

      if (upsertErr) throw upsertErr

      const key = (r: { person_id: string; project_id: string; date: string }) =>
        `${r.person_id}|${r.project_id}|${r.date}`

      const currentKeys = new Set(rows.map(key))

      const { data: dbList, error: selErr } = await supabase
        .from('assignments')
        .select('id, person_id, project_id, date')

      if (selErr) throw selErr

      const toDeleteIds =
        (dbList ?? [])
          .filter(r => !currentKeys.has(key(r)))
          .map(r => r.id)

      if (toDeleteIds.length) {
        const { error: delErr } = await supabase
          .from('assignments')
          .delete()
          .in('id', toDeleteIds)

        if (delErr) throw delErr
      }

      console.log('✅ Assignments sincronizados com o Supabase (upsert + limpeza)')
    } catch (error) {
      console.error('Erro ao salvar assignments:', error)
      alert('Erro ao salvar alocações. Tente novamente.')
    }
  }

  const generateWeek = (offset: number = 0) => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + offset * 7)

    const sunday = new Date(base)
    const dow = sunday.getDay()
    sunday.setDate(sunday.getDate() - dow)

    const week: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      return d
    })

    setCurrentWeek(week)
  }

  const goToToday = () => {
    generateWeek(0)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      weekday: 'short'
    })
  }

  const getTotalHoursPerDay = (personId: string, date: string) => {
    const dayAssignments = assignments.filter(a => 
      a.person_id === personId && a.date === date
    )
    return dayAssignments.reduce((total, assignment) => total + assignment.hours, 0)
  }

  const getTotalHoursForDate = (date: string) => {
    const dayAssignments = assignments.filter(a => a.date === date)
    return dayAssignments.reduce((total, assignment) => total + assignment.hours, 0)
  }

  const getWeekTotal = () => {
    const weekDates = currentWeek.map(d => d.toISOString().split('T')[0])
    return weekDates.reduce((total, date) => total + getTotalHoursForDate(date), 0)
  }

  const getMonthTotal = () => {
    if (currentWeek.length === 0) return 0
    
    const currentMonth = currentWeek[3].getMonth()
    const currentYear = currentWeek[3].getFullYear()
    
    return assignments
      .filter(a => {
        const assignmentDate = new Date(a.date + 'T00:00:00')
        return assignmentDate.getMonth() === currentMonth && 
               assignmentDate.getFullYear() === currentYear
      })
      .reduce((total, assignment) => total + assignment.hours, 0)
  }

  const handleAssignment = async (projectId: string, personId: string, date: string, hours: number = 8) => {
    const existingAssignmentIndex = assignments.findIndex(a => 
      a.person_id === personId && 
      a.project_id === projectId && 
      a.date === date
    )

    let updatedAssignments: Assignment[]

    if (existingAssignmentIndex !== -1) {
      updatedAssignments = [...assignments]
      updatedAssignments[existingAssignmentIndex].hours += hours
    } else {
      const newAssignment: Assignment = {
        id: Math.random().toString(36),
        project_id: projectId,
        person_id: personId,
        date,
        hours
      }
      updatedAssignments = [...assignments, newAssignment]
    }

    setAssignments(updatedAssignments)
    saveAssignments(updatedAssignments)
  }

  const allocateWeekForPerson = async (
    personId: string,
    { hours = 8, weekdaysOnly = true }: { hours?: number; weekdaysOnly?: boolean } = {}
  ) => {
    if (!draggingProject) {
      alert('Arraste um projeto primeiro, depois use o menu com botão direito.')
      return
    }

    const newAssignments = [...assignments]

    currentWeek.forEach((d) => {
      const dow = d.getDay()
      if (!weekdaysOnly || (dow >= 1 && dow <= 5)) {
        const ds = d.toISOString().split('T')[0]
        const idx = newAssignments.findIndex(
          a => a.person_id === personId && a.project_id === draggingProject && a.date === ds
        )
        if (idx >= 0) {
          newAssignments[idx].hours = hours
        } else {
          newAssignments.push({
            id: Math.random().toString(36),
            person_id: personId,
            project_id: draggingProject,
            date: ds,
            hours,
          })
        }
      }
    })

    await saveAssignments(newAssignments)
    closeCtxMenu()
  }

  const clearWeekForPersonProject = async (personId: string) => {
    if (!draggingProject) {
      alert('Arraste um projeto primeiro para limpar somente esse projeto.')
      return
    }
    const weekISO = currentWeek.map(d => d.toISOString().split('T')[0])
    const updated = assignments.filter(
      a => !(a.person_id === personId && a.project_id === draggingProject && weekISO.includes(a.date))
    )
    await saveAssignments(updated)
    closeCtxMenu()
  }

  const clearWeekForPersonAll = async (personId: string) => {
    const weekISO = currentWeek.map(d => d.toISOString().split('T')[0])
    const updated = assignments.filter(
      a => !(a.person_id === personId && weekISO.includes(a.date))
    )
    await saveAssignments(updated)
    closeCtxMenu()
  }

  const removeAssignment = async (assignmentId: string) => {
    const updatedAssignments = assignments.filter(a => a.id !== assignmentId)
    setAssignments(updatedAssignments)
    await saveAssignments(updatedAssignments)
  }

  const handleDragStart = (projectId: string) => {
    setDraggingProject(projectId)
  }

  const handleDrop = (personId: string, date: string) => {
    if (draggingProject) {
      handleAssignment(draggingProject, personId, date)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = currentWeek.map(day => {
      const newDate = new Date(day)
      newDate.setDate(day.getDate() + (direction === 'next' ? 7 : -7))
      return newDate
    })
    setCurrentWeek(newWeek)
  }

  const updateAssignmentHours = async (assignmentId: string, hours: number) => {
    if (hours <= 0) {
      await removeAssignment(assignmentId)
      return
    }

    const updatedAssignments = assignments.map(a => 
      a.id === assignmentId ? { ...a, hours } : a
    )
    
    setAssignments(updatedAssignments)
    await saveAssignments(updatedAssignments)
  }

  const getProjectDisplayName = (project: Project | undefined) => {
    if (!project) return "Projeto Não Encontrado"
    
    const maxLength = 30
    let projectName = project.name
    
    if (projectName.length > maxLength) {
      projectName = projectName.substring(0, maxLength) + "..."
    }
    
    return `${project.code}: ${projectName}`
  }

  const getMonthName = () => {
    if (currentWeek.length === 0) return ''
    const date = currentWeek[3]
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  // 🆕 Obter lista de departamentos únicos
  const getDepartments = () => {
    const departments = [...new Set(people.map(person => person.department).filter(Boolean))]
    return ['Todos', ...departments.sort()]
  }

  // 🆕 Filtrar pessoas por departamento - CORRIGIDO
  const filteredPeople = selectedDepartment === 'Todos' 
    ? people 
    : people.filter(person => person.department === selectedDepartment)

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Timeline de Alocações</h1>
          <div className="mt-1 text-sm">
            <span className="text-gray-600">Mês: </span>
            <span className="font-medium text-gray-800 capitalize">{getMonthName()}</span>
            <span className="mx-2 text-gray-400">•</span>
            <span className="text-gray-600">Total alocado: </span>
            <span className="font-bold text-teal-800 text-base">
              {getMonthTotal()}h
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="bg-gray-500 text-white px-4 py-1.5 text-sm rounded-md hover:bg-gray-600 transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={goToToday}
            className="bg-teal-600 text-white px-4 py-1.5 text-sm rounded-md hover:bg-teal-700 transition-colors font-medium"
          >
            Hoje
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="bg-gray-500 text-white px-4 py-1.5 text-sm rounded-md hover:bg-gray-600 transition-colors"
          >
            Próximo →
          </button>
        </div>
      </div>

      {/* 🆕 Filtro de Departamento - CORRIGIDO */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Filtrar por Departamento:</span>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {getDepartments().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            {filteredPeople.length} {filteredPeople.length === 1 ? 'pessoa' : 'pessoas'} encontradas
          </span>
        </div>
      </div>

      {/* Projetos Disponíveis com scroll horizontal */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Projetos Disponíveis (Arraste para alocar):</h3>
        <div className="overflow-x-auto overflow-y-hidden max-h-24 border border-gray-200 rounded-lg bg-gray-50 p-2">
          <div className="flex gap-2 min-w-max">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`border rounded px-3 py-1.5 text-xs cursor-move hover:opacity-80 transition-all flex-shrink-0 ${
                  draggingProject === project.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${getProjectTypeStyles(project.project_type)}`}
                draggable
                onDragStart={() => handleDragStart(project.id)}
                title={`${project.code}: ${project.name}`}
              >
                <strong>{project.code}</strong>: {project.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicador de projeto selecionado */}
      {draggingProject && (
        <div className="bg-premiumbravo-50 border border-premiumbravo-200 p-2 rounded-lg flex items-center justify-between">
          <div className="text-sm text-premiumbravo-800">
            <strong>Projeto selecionado:</strong> {getProjectDisplayName(projects.find(p => p.id === draggingProject))}
          </div>
          <button
            onClick={() => setDraggingProject(null)}
            className="text-premiumbravo-600 hover:text-premiumbravo-800 text-xs font-medium"
          >
            Desmarcar
          </button>
        </div>
      )}

      {/* Timeline - CORRIGIDA para usar filteredPeople */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
        <table className="w-full">
          <colgroup>
            <col style={{ width: '12rem' }} />
            {currentWeek.map((date, i) => {
              const isWeekendDay = date.getDay() === 0 || date.getDay() === 6
              return (
                <col
                  key={i}
                  style={{
                    width: isWeekendDay ? '8rem' : '12rem',
                  }}
                />
              )
            })}
          </colgroup>

          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 bg-gray-200 border-b">
                Pessoa / Data
              </th>

              {currentWeek.map((date, index) => {
                const isWeekendDay = date.getDay() === 0 || date.getDay() === 6

                return (
                  <th
                    key={index}
                    className={`px-2 py-2 text-center text-xs font-medium border-b ${
                      isWeekendDay
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {formatDate(date)}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-300">
            {/* 🆕 CORREÇÃO: usando filteredPeople em vez de people */}
            {filteredPeople.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  {/* 🆕 CORREÇÃO: usando nome_de_guerra e department em vez de role */}
                  <div className="text-sm font-medium text-gray-900">
                    {person.nome_de_guerra || person.full_name}
                  </div>
                  {/* 🆕 CORREÇÃO: exibindo department com destaque amarelo para Auditoria */}
                  <div className={`text-xs ${
                    person.department === 'Auditoria' 
                      ? 'bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium inline-block mt-1' 
                      : 'text-gray-500'
                  }`}>
                    {person.department}
                  </div>
                </td>
                
                {currentWeek.map((date, dayIndex) => {
                  const dateString = date.toISOString().split('T')[0]
                  const totalHours = getTotalHoursPerDay(person.id, dateString)
                  const warning = mustWarn(date, totalHours)
                  
                  return (
                    <td 
                      key={dayIndex}
                      className={`px-1.5 py-1 border-l border-gray-100 ${isWeekend(date) ? 'bg-gray-200' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'copy'
                      }}
                      onDrop={() => handleDrop(person.id, dateString)}
                      onContextMenuCapture={(e) => openCtxMenu(e, person.id, dateString)}
                      onContextMenu={(e) => openCtxMenu(e, person.id, dateString)}
                    >
                      <div className={`min-h-8 transition-colors rounded ${
                        warning ? 'bg-red-450 border border-red-800' : ''
                      }`}>
                        {assignments
                          .filter(a => a.person_id === person.id && a.date === dateString)
                          .map((assignment) => {
                            const project = projects.find(p => p.id === assignment.project_id)
                            return (
                              <div
                                key={assignment.id}
                                className={`rounded px-2 py-1 mb-0.5 text-xs ${getProjectTypeStyles(project?.project_type)}`}
                              >
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <span className="text-[11px] font-medium truncate flex-1"
                                    title={project ? `${project.code}: ${project.name}` : ''}>
                                    {project?.code}: {project?.name.substring(0, 10)}
                                    {project && project.name.length > 10 && '...'}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <input
                                      type="number"
                                      min={0}
                                      max={19}
                                      step={0.5}
                                      value={assignment.hours}
                                      onChange={(e) => updateAssignmentHours(assignment.id, parseFloat(e.target.value) || 0)}
                                      inputMode="decimal"
                                      className="w-8 text-xs text-right border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      aria-label="Horas"
                                      title="Horas"
                                    />

                                    <button
                                      onClick={() => removeAssignment(assignment.id)}
                                      className="text-red-500 hover:text-red-700 text-xs font-bold ml-0.5"
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
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* LINHA DE TOTALIZADOR POR DIA */}
            <tr className="bg-gray-800 text-white font-semibold">
              <td className="px-3 py-2 text-sm">
                Total do Dia
              </td>
              {currentWeek.map((date, index) => {
                const dateString = date.toISOString().split('T')[0]
                const dayTotal = getTotalHoursForDate(dateString)
                
                return (
                  <td 
                    key={index}
                    className={`px-2 py-2 text-center text-sm border-l border-gray-700 ${getTotalStyles(date, dayTotal)}`}
                  >
                    {dayTotal > 0 ? `${dayTotal}h` : '0h'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Instruções */}
      <div className="bg-teal-50 border border-premiumbravo-200 p-3 rounded-lg">
        <h3 className="text-sm font-semibold text-premiumbravo-800 mb-1.5">Como usar:</h3>
        <ul className="text-xs text-premiumbravo-700 space-y-0.5">
          <li>• <strong>Arraste os projetos</strong> para os dias da semana de cada pessoa</li>
          <li>• <strong>Ajuste as horas</strong> diretamente no input de cada alocação</li>
          <li>• <strong>Clique no ×</strong> para remover uma alocação</li>
          <li>• <strong>Vermelho</strong> indica: dias úteis &gt; 8h, ou qualquer hora no fim de semana</li>
          <li>• <strong>Botão direito do mouse</strong>: após arrastar um projeto, clique com botão direito em qualquer célula da pessoa para alocar 8h por toda a semana</li>
          <li>• <strong>Desmarcar projeto</strong>: clique fora da timeline ou pressione ESC para desmarcar o projeto selecionado</li>
          <li>• <strong>Totalizadores</strong>: a linha inferior mostra o total de horas por dia</li>
          <li>• <strong>Dados salvos automaticamente</strong> no banco de dados</li>
          <li>• <strong>Cores dos projetos</strong> indicam o tipo: Azul=Auditoria, Vermelho=Inventários, Laranja=CVM88, Amarelo=Especiais, Verde=Outros</li>
          {/* 🆕 Instrução sobre filtro */}
          <li>• <strong>Filtro de Departamento</strong>: use o seletor acima da timeline para filtrar pessoas por departamento</li>
          <li>• <strong>Departamentos em amarelo</strong>: pessoas do departamento de Auditoria são destacadas em amarelo</li>
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
              {people.find(p => p.id === ctxMenu.personId)?.nome_de_guerra || people.find(p => p.id === ctxMenu.personId)?.full_name}
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