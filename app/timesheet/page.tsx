// app/timesheet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  code: string
  name: string
  status: string
}

interface Person {
  id: string
  full_name: string
  pin_hash: string
}

interface Assignment {
  id: string
  person_id: string
  project_id: string
  date: string
  hours: number
}

interface Timesheet {
  id?: string
  person_id: string
  project_id: string
  date: string
  planned_hours: number
  actual_hours: number | null
  status: 'pending' | 'confirmed'
  notes: string | null
}

interface TimesheetRow {
  project: Project
  days: {
    date: string
    dateISO: string
    planned: number
    actual: number | null
    status: 'pending' | 'confirmed'
    notes: string | null
    timesheetId?: string
  }[]
}

export default function TimesheetPage() {
  const [currentUser, setCurrentUser] = useState<Person | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [currentWeek, setCurrentWeek] = useState<Date[]>([])
  const [timesheetRows, setTimesheetRows] = useState<TimesheetRow[]>([])
  const [newProjectId, setNewProjectId] = useState<string>('')

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('full_name', 'Herculano Swerts')
        .single()

      if (error) throw error
      setCurrentUser(data)
    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
      alert('Erro ao identificar usuário. Faça login novamente.')
    }
  }

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'Aberto')
        .order('code', { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    }
  }

  const loadAssignments = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('person_id', currentUser.id)

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Erro ao carregar assignments:', error)
    }
  }

  const loadTimesheets = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('person_id', currentUser.id)

      if (error) throw error
      setTimesheets(data || [])
    } catch (error) {
      console.error('Erro ao carregar timesheets:', error)
    }
  }

  const loadAllData = async () => {
    await Promise.all([
      loadProjects(),
      loadAssignments(),
      loadTimesheets()
    ])
  }

  const buildTimesheetRows = () => {
    if (!currentUser) return

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const fourWeeksAgo = new Date(now)
    fourWeeksAgo.setDate(now.getDate() - 28)

    const projectMap = new Map<string, TimesheetRow>()

    assignments.forEach(assignment => {
      const assignDate = new Date(assignment.date)
      if (assignDate < fourWeeksAgo) return

      const proj = projects.find(p => p.id === assignment.project_id)
      if (!proj) return

      if (!projectMap.has(proj.id)) {
        projectMap.set(proj.id, {
          project: proj,
          days: currentWeek.map(d => ({
            date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }),
            dateISO: d.toISOString().split('T')[0],
            planned: 0,
            actual: null,
            status: 'pending' as const,
            notes: null,
          }))
        })
      }

      const row = projectMap.get(proj.id)!
      const dayIndex = currentWeek.findIndex(d => d.toISOString().split('T')[0] === assignment.date)
      
      if (dayIndex >= 0) {
        row.days[dayIndex].planned = assignment.hours
      }
    })

    timesheets.forEach(ts => {
      const proj = projects.find(p => p.id === ts.project_id)
      if (!proj) return

      if (!projectMap.has(proj.id)) {
        projectMap.set(proj.id, {
          project: proj,
          days: currentWeek.map(d => ({
            date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }),
            dateISO: d.toISOString().split('T')[0],
            planned: 0,
            actual: null,
            status: 'pending' as const,
            notes: null,
          }))
        })
      }

      const row = projectMap.get(proj.id)!
      const dayIndex = currentWeek.findIndex(d => d.toISOString().split('T')[0] === ts.date)
      
      if (dayIndex >= 0) {
        row.days[dayIndex].planned = ts.planned_hours
        row.days[dayIndex].actual = ts.actual_hours
        row.days[dayIndex].status = ts.status
        row.days[dayIndex].notes = ts.notes
        row.days[dayIndex].timesheetId = ts.id
      }
    })

    const rows = Array.from(projectMap.values()).filter(row => 
      row.days.some(day => day.planned > 0 || day.actual !== null)
    )

    setTimesheetRows(rows)
  }

  useEffect(() => {
    if (currentUser) {
      generateWeek(0)
      loadAllData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    if (currentUser && projects.length > 0 && currentWeek.length > 0) {
      buildTimesheetRows()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, projects, assignments, timesheets, currentWeek])

  const generateWeek = (offset: number = 0) => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + offset)

    const startDay = new Date(base)
    startDay.setDate(base.getDate() - 8)

    const days: Date[] = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(startDay)
      d.setDate(startDay.getDate() + i)
      return d
    })

    setCurrentWeek(days)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const firstDay = currentWeek[0]
    if (!firstDay) return
    
    const newFirstDay = new Date(firstDay)
    newFirstDay.setDate(firstDay.getDate() + (direction === 'next' ? 1 : -1))
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = newFirstDay.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000))
    
    generateWeek(diffDays + 8)
  }

  const goToToday = () => {
    generateWeek(0)
  }

  const checkCanEditDate = (dateISO: string): boolean => {
    const date = new Date(dateISO)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const fourWeeksAgo = new Date(now)
    fourWeeksAgo.setDate(now.getDate() - 28)

    return date >= fourWeeksAgo && date <= now
  }

  const updateTimesheet = async (
    projectId: string, 
    dateISO: string, 
    actualHours: number | null,
    plannedHours: number,
    timesheetId?: string
  ) => {
    if (!currentUser) return
    if (!checkCanEditDate(dateISO)) {
      alert('Você só pode editar timesheets de até 4 semanas atrás.')
      return
    }

    try {
      const payload = {
        person_id: currentUser.id,
        project_id: projectId,
        date: dateISO,
        planned_hours: plannedHours,
        actual_hours: actualHours,
        status: actualHours !== null ? 'confirmed' as const : 'pending' as const,
      }

      console.log('💾 Salvando timesheet:', payload)

      if (timesheetId) {
        const { error } = await supabase
          .from('timesheets')
          .update(payload)
          .eq('id', timesheetId)

        if (error) {
          console.error('❌ Erro ao atualizar:', error)
          throw error
        }
        console.log('✅ Timesheet atualizado com sucesso')
      } else {
        const { data, error } = await supabase
          .from('timesheets')
          .insert([payload])
          .select()

        if (error) {
          console.error('❌ Erro ao inserir:', error)
          throw error
        }
        console.log('✅ Timesheet criado com sucesso:', data)
      }

      await loadTimesheets()
    } catch (error: unknown) {
      console.error('💥 Erro geral ao salvar timesheet:', error)
      const errorMessage = error instanceof Error ? error.message : 'Tente novamente.'
      alert(`Erro ao salvar: ${errorMessage}`)
    }
  }

  const confirmDay = async (projectId: string, dateISO: string, plannedHours: number, timesheetId?: string) => {
    await updateTimesheet(projectId, dateISO, plannedHours, plannedHours, timesheetId)
  }

  const getTotalHoursByDay = (dateISO: string): number => {
    return timesheets
      .filter(ts => ts.date === dateISO && ts.actual_hours !== null)
      .reduce((sum, ts) => sum + (ts.actual_hours || 0), 0)
  }

  const addNewProject = async () => {
    if (!newProjectId || !currentUser) return

    const project = projects.find(p => p.id === newProjectId)
    if (!project) return

    try {
      // Criar um timesheet pendente com planned_hours = 0 e actual_hours = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dateISO = today.toISOString().split('T')[0]

      const payload = {
        person_id: currentUser.id,
        project_id: newProjectId,
        date: dateISO,
        planned_hours: 0,
        actual_hours: 0,
        status: 'pending' as const,
      }

      const { error } = await supabase
        .from('timesheets')
        .insert([payload])

      if (error) throw error

      await loadTimesheets()
      setNewProjectId('')
    } catch (error: unknown) {
      console.error('Erro ao adicionar projeto:', error)
      const errorMessage = error instanceof Error ? error.message : 'Tente novamente.'
      alert(`Erro ao adicionar projeto: ${errorMessage}`)
    }
  }

  const availableProjects = projects.filter(p => 
    !timesheetRows.some(row => row.project.id === p.id)
  )

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      weekday: 'short'
    })
  }

  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Carregando dados do usuário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Timesheet</h1>
          <p className="text-sm text-gray-600">Registre suas horas trabalhadas - {currentUser.full_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="bg-gray-500 text-white px-3 py-1.5 text-sm rounded-md hover:bg-gray-600 transition-colors"
            title="Dia anterior"
          >
            ← Anterior
          </button>
          <button
            onClick={goToToday}
            className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 transition-colors"
            title="Voltar para hoje"
          >
            Hoje
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="bg-gray-500 text-white px-3 py-1.5 text-sm rounded-md hover:bg-gray-600 transition-colors"
            title="Próximo dia"
          >
            Próximo →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '16rem' }} />
            {currentWeek.map((date, i) => {
              const isWeekendDay = date.getDay() === 0 || date.getDay() === 6
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const isToday = date.getTime() === today.getTime()
              
              return (
                <col
                  key={i}
                  style={{
                    width: isWeekendDay ? '5rem' : '9.5rem',
                    backgroundColor: isToday ? '#e0f2fe' : isWeekendDay ? '#e5e7eb' : undefined,
                  }}
                />
              )
            })}
          </colgroup>

          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 bg-gray-100 border-b-2 border-gray-300">
                Projeto
              </th>
              {currentWeek.map((date, index) => {
                const isWeekendDay = date.getDay() === 0 || date.getDay() === 6
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const isToday = date.getTime() === today.getTime()
                
                return (
                  <th
                    key={index}
                    className={`px-1 py-2 text-center text-xs font-medium border-b-2 border-gray-300 ${
                      isToday
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : isWeekendDay
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {formatDate(date)}
                    {isToday && <div className="text-[10px] text-blue-600">HOJE</div>}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {timesheetRows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-sm text-gray-500">
                  Nenhuma alocação encontrada para este período.
                </td>
              </tr>
            )}

            {timesheetRows.map((row) => (
              <tr key={row.project.id}>
                <td className="px-3 py-2">
                  <div className="text-sm font-medium text-gray-900">
                    {row.project.code}: {row.project.name}
                  </div>
                </td>

                {row.days.map((day, dayIndex) => {
                  const editable = checkCanEditDate(day.dateISO)
                  const hasDifference = day.actual !== null && day.actual !== day.planned
                  const dateObj = new Date(day.dateISO)
                  const isWeekendDay = dateObj.getDay() === 0 || dateObj.getDay() === 6
                  
                  return (
                    <td 
                      key={dayIndex}
                      className={`${isWeekendDay ? 'px-1' : 'px-2'} py-2 border-l border-gray-200 overflow-hidden`}
                    >
                      {day.planned > 0 || day.actual !== null ? (
                        <div className={`p-1.5 rounded border min-h-[2rem] flex items-center ${
                          day.status === 'confirmed' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          {day.status === 'pending' ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-yellow-600 text-sm" title="Pendente de confirmação">⚠️</span>
                              <span className="text-xs text-gray-600 whitespace-nowrap">{day.planned}h</span>
                              <input
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                placeholder="Real"
                                defaultValue=""
                                className="w-12 text-xs border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                disabled={!editable}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val) && val > 0) {
                                    void updateTimesheet(row.project.id, day.dateISO, val, day.planned, day.timesheetId)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(e.currentTarget.value)
                                    if (!isNaN(val) && val > 0) {
                                      void updateTimesheet(row.project.id, day.dateISO, val, day.planned, day.timesheetId)
                                    }
                                  }
                                }}
                              />
                              <button
                                className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                                disabled={!editable}
                                onClick={() => void confirmDay(row.project.id, day.dateISO, day.planned, day.timesheetId)}
                                title="Confirmar horas planejadas"
                              >
                                ✓
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-green-600" title="Confirmado">✓</span>
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                hasDifference ? 'text-orange-600' : 'text-green-700'
                              }`}>
                                {day.actual}h
                              </span>
                              {editable && (
                                <button
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    const newVal = prompt(`Editar horas do dia ${day.date}:`, String(day.actual || day.planned))
                                    if (newVal !== null) {
                                      const val = parseFloat(newVal)
                                      if (!isNaN(val)) {
                                        void updateTimesheet(row.project.id, day.dateISO, val, day.planned, day.timesheetId)
                                      }
                                    }
                                  }}
                                >
                                  ✎
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 text-center text-xs text-gray-400">—</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}

            {availableProjects.length > 0 && (
              <tr className="border-t-2 border-gray-300 bg-blue-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={newProjectId}
                      onChange={(e) => setNewProjectId(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">+ Adicionar projeto...</option>
                      {availableProjects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.code}: {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addNewProject}
                      disabled={!newProjectId}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Adicionar
                    </button>
                  </div>
                </td>
                <td colSpan={10} className="px-2 py-2 text-center text-xs text-gray-500">
                  Selecione um projeto para adicionar ao timesheet
                </td>
              </tr>
            )}

            <tr className="border-t-2 border-gray-400 bg-gray-50 font-semibold">
              <td className="px-3 py-2 text-sm text-gray-900">
                TOTAL DO DIA
              </td>
              {currentWeek.map((date, dayIndex) => {
                const dateISO = date.toISOString().split('T')[0]
                const totalHours = getTotalHoursByDay(dateISO)
                const isWeekendDay = date.getDay() === 0 || date.getDay() === 6
                const hasHours = totalHours > 0

                return (
                  <td 
                    key={dayIndex}
                    className={`${isWeekendDay ? 'px-1' : 'px-2'} py-2 border-l border-gray-300 text-center`}
                  >
                    <div className={`text-sm font-bold ${
                      hasHours 
                        ? totalHours > 8 ? 'text-red-600' : 'text-green-700'
                        : 'text-gray-400'
                    }`}>
                      {hasHours ? `${totalHours.toFixed(1)}h` : '—'}
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-1.5">Como usar:</h3>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>• <strong>Amarelo:</strong> Horas aguardando confirmação</li>
          <li>• <strong>Verde:</strong> Horas confirmadas</li>
          <li>• <strong>Botão ✓:</strong> Confirmar as horas planejadas</li>
          <li>• <strong>Campo &quot;Real&quot;:</strong> Digitar horas diferentes do planejado</li>
          <li>• <strong>Você pode editar timesheets de até 4 semanas atrás</strong></li>
        </ul>
      </div>
    </div>
  )
}