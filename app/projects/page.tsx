// app/reports/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

/** Tipos do banco (ajuste nomes de colunas se necessário) */
type ProjectType =
  | 'Auditoria Interna'
  | 'Inventários'
  | 'CVM 88'
  | 'Projetos Especiais'
  | 'Outros';

interface Project {
  id: string;
  code: string;
  name: string;
  client_name?: string | null;
  status: string;
  budget_hours?: number | null;
  budget_value?: number | null;
  project_type?: ProjectType | null;
  deadline?: string | null;   // 'YYYY-MM-DD'
  manager_id?: string | null; // FK -> people.id
  created_at?: string;
  updated_at?: string;
}

interface Assignment {
  id: string;
  project_id: string;
  person_id: string;
  date: string;   // 'YYYY-MM-DD'
  hours: number;  // horas lançadas
  notes?: string | null;
  created_at?: string;
}

interface ProjectReport {
  projectId: string;
  code: string;
  name: string;
  status: string;
  budgetHours: number;       // 0 se nulo
  usedHours: number;         // somatório das assignments
  remainingHours: number;    // budget - used (>= 0)
  completionPercentage: number; // used/budget (0..100)
}

/** Util: formata número como 0 ou com 1 casa */
const fmtHours = (n: number) =>
  Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : '0.0';

/** Página */
export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /** 1) Carregar projetos */
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('code', { ascending: false });

      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (err: unknown) {
      console.error('Erro ao carregar projetos:', err);
    }
    // supabase é import estático, não muda; deps vazias são adequadas.
  }, []);

  /** 2) Carregar lançamentos (assignments) */
  const loadAssignments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, project_id, person_id, date, hours, notes, created_at');

      if (error) throw error;
      setAssignments((data ?? []) as Assignment[]);
    } catch (err: unknown) {
      console.error('Erro ao carregar alocações:', err);
    }
  }, []);

  /** 3) Calcular relatórios por projeto */
  const calculateProjectReports = useCallback(() => {
    // Agrupa horas por projeto
    const usedByProject = new Map<string, number>();
    for (const a of assignments) {
      const prev = usedByProject.get(a.project_id) ?? 0;
      usedByProject.set(a.project_id, prev + (a.hours ?? 0));
    }

    const reports: ProjectReport[] = projects.map((p) => {
      const budget = p.budget_hours ?? 0;
      const used = usedByProject.get(p.id) ?? 0;
      const remaining = Math.max(0, budget - used);
      const completion =
        budget > 0 ? Math.min(100, (used / budget) * 100) : 0;

      return {
        projectId: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        budgetHours: budget,
        usedHours: used,
        remainingHours: remaining,
        completionPercentage: Number((Math.round(completion * 10) / 10).toFixed(1)),
      };
    });

    // Opcional: ordenar por % de conclusão desc
    reports.sort((a, b) => b.completionPercentage - a.completionPercentage);

    setProjectReports(reports);
  }, [assignments, projects]);

  /** 4) Carregamento combinado inicial */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadProjects(), loadAssignments()]);
      // cálculo é separado em outro efeito para garantir state atualizado
    } finally {
      setLoading(false);
    }
  }, [loadProjects, loadAssignments]);

  /** 5) Efeito inicial */
  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  /** 6) Recalcula relatório quando dados mudarem */
  useEffect(() => {
    calculateProjectReports();
  }, [calculateProjectReports]);

  const hasData = useMemo(
    () => projectReports.length > 0,
    [projectReports.length]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Relatórios de Projetos</h1>
        <button
          className="px-4 py-2 rounded-lg border"
          onClick={() => void loadAllData()}
          disabled={loading}
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {!hasData && !loading && (
        <div className="text-sm text-gray-600">
          Nenhum dado para exibir. Cadastre projetos e lançamentos.
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-600">Carregando…</div>
      )}

      {hasData && (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border">Código</th>
                <th className="text-left p-2 border">Projeto</th>
                <th className="text-left p-2 border">Status</th>
                <th className="text-right p-2 border">Horas Orçadas</th>
                <th className="text-right p-2 border">Horas Usadas</th>
                <th className="text-right p-2 border">Saldo (h)</th>
                <th className="text-right p-2 border">% Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {projectReports.map((r) => (
                <tr key={r.projectId} className="border-t">
                  <td className="p-2 border">{r.code}</td>
                  <td className="p-2 border">{r.name}</td>
                  <td className="p-2 border">{r.status}</td>
                  <td className="p-2 border text-right">{fmtHours(r.budgetHours)}</td>
                  <td className="p-2 border text-right">{fmtHours(r.usedHours)}</td>
                  <td className="p-2 border text-right">{fmtHours(r.remainingHours)}</td>
                  <td className="p-2 border text-right">
                    {r.completionPercentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}