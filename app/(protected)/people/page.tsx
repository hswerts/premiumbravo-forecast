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
  
  // Novos campos
  email?: string
  telefone?: string
  data_nascimento?: string
  sexo?: string
  estado_civil?: string
  modalidade_trabalho?: string
  salario_inicial?: number
  data_admissao?: string
  grau_instrucao?: string
  nome_mae?: string
  nome_pai?: string
  endereco_completo?: string
  cpf?: string
  nis?: string
  ctps?: string
  serie_ctps?: string
  rg?: string
  orgao_expedidor_rg?: string
  data_expedicao_rg?: string
  titulo_eleitor?: string
  anexo_rg_url?: string
  anexo_titulo_eleitor_url?: string
  portador_deficiencia?: boolean
  cidade?: string
  uf?: string
  cep?: string
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

// Lista de estados brasileiros
const estadosBR = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
]

// Componente de seção colapsável (FORA do componente principal)
const CollapsibleSection = ({ 
  title, 
  isOpen, 
  onToggle, 
  children 
}: { 
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) => (
  <div className="border border-gray-200 rounded-lg mb-4">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
    >
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <span className="text-xl text-gray-600">{isOpen ? '−' : '+'}</span>
    </button>
    {isOpen && (
      <div className="p-4">
        {children}
      </div>
    )}
  </div>
)

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingRG, setUploadingRG] = useState(false)
  const [uploadingTitulo, setUploadingTitulo] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  // Estado do formulário
  const [formData, setFormData] = useState({
    timesheetCode: '',
    fullName: '',
    role: '',
    department: '',
    hourlyCost: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    sexo: '',
    estadoCivil: '',
    modalidadeTrabalho: '',
    salarioInicial: '',
    dataAdmissao: '',
    grauInstrucao: '',
    nomeMae: '',
    nomePai: '',
    enderecoCompleto: '',
    cpf: '',
    nis: '',
    ctps: '',
    serieCTPS: '',
    rg: '',
    orgaoExpedidorRG: '',
    dataExpedicaoRG: '',
    tituloEleitor: '',
    portadorDeficiencia: false,
    active: true,
    cidade: '',
    uf: '',
    cep: '',
    
    // Anexos
    anexoRG: null as File | null,
    anexoTitulo: null as File | null
  })

  // Controle de seções expandidas
  const [expandedSections, setExpandedSections] = useState({
    dadosBasicos: true,
    dadosContato: true,
    dadosProfissionais: true,
    filiacao: false,
    endereco: false,
    documentos: false,
    anexos: false,
    outras: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

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
      /* ignora erros */
    }
  }, [])

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

  // Função para formatar data ISO para DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateISO: string): string => {
    if (!dateISO) return ''
    const [year, month, day] = dateISO.split('-')
    return `${day}/${month}/${year}`
  }

  // Função para formatar valor monetário para exibição
  const formatMoneyForDisplay = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Função para editar pessoa
  const handleEdit = (person: Person) => {
    setEditingPerson(person)
    setFormData({
      timesheetCode: person.timesheet_code,
      fullName: person.full_name,
      role: person.role,
      department: person.department,
      hourlyCost: person.hourly_cost ? formatMoneyForDisplay(person.hourly_cost) : '',
      email: person.email || '',
      telefone: person.telefone || '',
      dataNascimento: person.data_nascimento ? formatDateToDDMMYYYY(person.data_nascimento) : '',
      sexo: person.sexo || '',
      estadoCivil: person.estado_civil || '',
      modalidadeTrabalho: person.modalidade_trabalho || '',
      salarioInicial: person.salario_inicial ? formatMoneyForDisplay(person.salario_inicial) : '',
      dataAdmissao: person.data_admissao ? formatDateToDDMMYYYY(person.data_admissao) : '',
      grauInstrucao: person.grau_instrucao || '',
      nomeMae: person.nome_mae || '',
      nomePai: person.nome_pai || '',
      enderecoCompleto: person.endereco_completo || '',
      cpf: person.cpf || '',
      nis: person.nis || '',
      ctps: person.ctps || '',
      serieCTPS: person.serie_ctps || '',
      rg: person.rg || '',
      orgaoExpedidorRG: person.orgao_expedidor_rg || '',
      dataExpedicaoRG: person.data_expedicao_rg ? formatDateToDDMMYYYY(person.data_expedicao_rg) : '',
      tituloEleitor: person.titulo_eleitor || '',
      portadorDeficiencia: Boolean(person.portador_deficiencia),
      active: Boolean(person.active),
      cidade: person.cidade || '',
      uf: person.uf || '',
      cep: person.cep || '',
      anexoRG: null,
      anexoTitulo: null
    })
    setShowForm(true)
  }

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '')
    
    if (cpf.length !== 11) return false
    if (/^(\d)\1+$/.test(cpf)) return false

    let sum = 0
    let remainder

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.substring(9, 10))) return false

    sum = 0
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.substring(10, 11))) return false

    return true
  }

  // Máscaras
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  const maskDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{4})\d+?$/, '$1')
  }

  const maskMoney = (value: string) => {
    const numericValue = value.replace(/\D/g, '')
    if (!numericValue) return ''
    const number = parseFloat(numericValue) / 100
    return number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1')
  }

  // Converter data DD/MM/YYYY para YYYY-MM-DD
  const convertDateToISO = (dateBR: string): string | null => {
    if (!dateBR || dateBR.length !== 10) return null
    const [day, month, year] = dateBR.split('/')
    if (!day || !month || !year) return null
    return `${year}-${month}-${day}`
  }

  // Converter valor R$ para float
  const convertMoneyToFloat = (moneyStr: string): number | null => {
    if (!moneyStr) return null
    const cleaned = moneyStr.replace(/\./g, '').replace(',', '.')
    const value = parseFloat(cleaned)
    return isNaN(value) ? null : value
  }

  // Upload de arquivos para o Supabase Storage
  const uploadFile = async (file: File, folder: 'rg' | 'titulo-eleitor', cpf: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${cpf.replace(/\D/g, '')}_${folder}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documentos-funcionarios')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Gerar URL assinada (válida por 10 anos)
    const { data: urlData } = await supabase.storage
      .from('documentos-funcionarios')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

    return urlData?.signedUrl || ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'anexoRG' | 'anexoTitulo') => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de arquivo
      if (file.type !== 'application/pdf') {
        alert('Por favor, selecione apenas arquivos PDF')
        e.target.value = ''
        return
      }
      
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 10MB')
        e.target.value = ''
        return
      }
      
      setFormData({
        ...formData,
        [field]: file
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
      alert('CPF inválido! Por favor, verifique.')
      return
    }

    if (formData.dataNascimento && formData.dataNascimento.length === 10) {
      const isoDate = convertDateToISO(formData.dataNascimento)
      if (!isoDate) {
        alert('Data de nascimento inválida! Use o formato DD/MM/AAAA')
        return
      }
    }

    if (formData.dataAdmissao && formData.dataAdmissao.length === 10) {
      const isoDate = convertDateToISO(formData.dataAdmissao)
      if (!isoDate) {
        alert('Data de admissão inválida! Use o formato DD/MM/AAAA')
        return
      }
    }

    if (formData.dataExpedicaoRG && formData.dataExpedicaoRG.length === 10) {
      const isoDate = convertDateToISO(formData.dataExpedicaoRG)
      if (!isoDate) {
        alert('Data de expedição do RG inválida! Use o formato DD/MM/AAAA')
        return
      }
    }

    setLoading(true)

    try {
      let anexoRGUrl = ''
      let anexoTituloUrl = ''

      // Upload do RG se houver arquivo e CPF
      if (formData.anexoRG && formData.cpf) {
        setUploadingRG(true)
        anexoRGUrl = await uploadFile(formData.anexoRG, 'rg', formData.cpf)
        setUploadingRG(false)
      }

      // Upload do Título se houver arquivo e CPF
      if (formData.anexoTitulo && formData.cpf) {
        setUploadingTitulo(true)
        anexoTituloUrl = await uploadFile(formData.anexoTitulo, 'titulo-eleitor', formData.cpf)
        setUploadingTitulo(false)
      }

      const personData = {
        timesheet_code: formData.timesheetCode,
        full_name: formData.fullName,
        role: formData.role,
        department: formData.department,
        hourly_cost: formData.hourlyCost ? convertMoneyToFloat(formData.hourlyCost) : null,
        active: formData.active,
        email: formData.email || null,
        telefone: formData.telefone || null,
        data_nascimento: formData.dataNascimento ? convertDateToISO(formData.dataNascimento) : null,
        sexo: formData.sexo || null,
        estado_civil: formData.estadoCivil || null,
        modalidade_trabalho: formData.modalidadeTrabalho || null,
        salario_inicial: formData.salarioInicial ? convertMoneyToFloat(formData.salarioInicial) : null,
        data_admissao: formData.dataAdmissao ? convertDateToISO(formData.dataAdmissao) : null,
        grau_instrucao: formData.grauInstrucao || null,
        nome_mae: formData.nomeMae || null,
        nome_pai: formData.nomePai || null,
        endereco_completo: formData.enderecoCompleto || null,
        cpf: formData.cpf ? formData.cpf.replace(/\D/g, '') : null,
        nis: formData.nis || null,
        ctps: formData.ctps || null,
        serie_ctps: formData.serieCTPS || null,
        rg: formData.rg || null,
        orgao_expedidor_rg: formData.orgaoExpedidorRG || null,
        data_expedicao_rg: formData.dataExpedicaoRG ? convertDateToISO(formData.dataExpedicaoRG) : null,
        titulo_eleitor: formData.tituloEleitor || null,
        portador_deficiencia: formData.portadorDeficiencia,
        cidade: formData.cidade || null,
        uf: formData.uf || null,
        cep: formData.cep ? formData.cep.replace(/\D/g, '') : null
      }

      // Adicionar URLs de anexos apenas se foram enviados
      const personDataWithAnexos = {
        ...personData,
        ...(anexoRGUrl && { anexo_rg_url: anexoRGUrl }),
        ...(anexoTituloUrl && { anexo_titulo_eleitor_url: anexoTituloUrl })
      }

      let result

      if (editingPerson) {
        // MODE EDIT: Atualizar pessoa existente
        const { data, error } = await supabase
          .from('people')
          .update(personDataWithAnexos)
          .eq('id', editingPerson.id)
          .select()

        if (error) throw error
        result = data
      } else {
        // MODE CREATE: Criar nova pessoa
        const { data, error } = await supabase
          .from('people')
          .insert([personDataWithAnexos])
          .select()

        if (error) throw error
        result = data
      }

      // Atualizar a lista
      if (result && result[0]) {
        if (editingPerson) {
          setPeople(people.map(p => p.id === editingPerson.id ? result[0] : p))
        } else {
          setPeople([result[0], ...people])
        }
      }

      // Reset do formulário
      setFormData({
        timesheetCode: '',
        fullName: '',
        role: '',
        department: '',
        hourlyCost: '',
        email: '',
        telefone: '',
        dataNascimento: '',
        sexo: '',
        estadoCivil: '',
        modalidadeTrabalho: '',
        salarioInicial: '',
        dataAdmissao: '',
        grauInstrucao: '',
        nomeMae: '',
        nomePai: '',
        enderecoCompleto: '',
        cpf: '',
        nis: '',
        ctps: '',
        serieCTPS: '',
        rg: '',
        orgaoExpedidorRG: '',
        dataExpedicaoRG: '',
        tituloEleitor: '',
        portadorDeficiencia: false,
        active: true,
        cidade: '',
        uf: '',
        cep: '',
        anexoRG: null,
        anexoTitulo: null
      })
      
      setShowForm(false)
      setEditingPerson(null)
      
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error)
      alert('Erro ao salvar pessoa: ' + (error as Error).message)
    } finally {
      setLoading(false)
      setUploadingRG(false)
      setUploadingTitulo(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    let finalValue = value
    
    if (name === 'cpf') {
      finalValue = maskCPF(value)
    } else if (name === 'telefone') {
      finalValue = maskPhone(value)
    } else if (name === 'dataNascimento' || name === 'dataAdmissao' || name === 'dataExpedicaoRG') {
      finalValue = maskDate(value)
    } else if (name === 'salarioInicial' || name === 'hourlyCost') {
      finalValue = maskMoney(value)
    } else if (name === 'cep') {
      finalValue = maskCEP(value)
    }
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: finalValue
      })
    }
  }

  const resetForm = () => {
    setFormData({
      timesheetCode: '',
      fullName: '',
      role: '',
      department: '',
      hourlyCost: '',
      email: '',
      telefone: '',
      dataNascimento: '',
      sexo: '',
      estadoCivil: '',
      modalidadeTrabalho: '',
      salarioInicial: '',
      dataAdmissao: '',
      grauInstrucao: '',
      nomeMae: '',
      nomePai: '',
      enderecoCompleto: '',
      cpf: '',
      nis: '',
      ctps: '',
      serieCTPS: '',
      rg: '',
      orgaoExpedidorRG: '',
      dataExpedicaoRG: '',
      tituloEleitor: '',
      portadorDeficiencia: false,
      active: true,
      cidade: '',
      uf: '',
      cep: '',
      anexoRG: null,
      anexoTitulo: null
    })
    setEditingPerson(null)
    setShowForm(false)
  }

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
          onClick={() => {
            setEditingPerson(null)
            setShowForm(true)
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          + Nova Pessoa
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">
            {editingPerson ? 'Editar Pessoa' : 'Cadastrar Nova Pessoa'}
          </h2>
          <form onSubmit={handleSubmit}>
            
            <CollapsibleSection
              title="1. Dados Básicos *"
              isOpen={expandedSections.dadosBasicos}
              onToggle={() => toggleSection('dadosBasicos')}
            >
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    name="dataNascimento"
                    value={formData.dataNascimento}
                    onChange={handleChange}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="DD/MM/AAAA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo
                  </label>
                  <select
                    name="sexo"
                    value={formData.sexo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado Civil
                  </label>
                  <select
                    name="estadoCivil"
                    value={formData.estadoCivil}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="solteiro(a)">Solteiro(a)</option>
                    <option value="casado(a)">Casado(a)</option>
                    <option value="divorciado(a)">Divorciado(a)</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    maxLength={14}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="000.000.000-00"
                  />
                  {formData.cpf && !validateCPF(formData.cpf) && (
                    <p className="text-xs text-red-500 mt-1">CPF inválido</p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="2. Dados de Contato"
              isOpen={expandedSections.dadosContato}
              onToggle={() => toggleSection('dadosContato')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="3. Dados Profissionais *"
              isOpen={expandedSections.dadosProfissionais}
              onToggle={() => toggleSection('dadosProfissionais')}
            >
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modalidade de Trabalho
                  </label>
                  <select
                    name="modalidadeTrabalho"
                    value={formData.modalidadeTrabalho}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="Fixo">Fixo</option>
                    <option value="Intermitente">Intermitente</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Parceiro">Parceiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grau de Instrução
                  </label>
                  <select
                    name="grauInstrucao"
                    value={formData.grauInstrucao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="Médio">Médio</option>
                    <option value="Superior">Superior</option>
                    <option value="Pós-graduação">Pós-graduação</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Admissão
                  </label>
                  <input
                    type="text"
                    name="dataAdmissao"
                    value={formData.dataAdmissao}
                    onChange={handleChange}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="DD/MM/AAAA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salário Inicial
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R$</span>
                    <input
                      type="text"
                      name="salarioInicial"
                      value={formData.salarioInicial}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custo Efetivo da Hora
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R$</span>
                    <input
                      type="text"
                      name="hourlyCost"
                      value={formData.hourlyCost}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Custo total da hora trabalhada (salário + encargos + benefícios)
                  </p>
                </div>

                {/* CAMPO STATUS */}
                <div className="col-span-2 flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="active"
                    checked={Boolean(formData.active)}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Funcionário Ativo
                  </label>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="4. Filiação"
              isOpen={expandedSections.filiacao}
              onToggle={() => toggleSection('filiacao')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Mãe
                  </label>
                  <input
                    type="text"
                    name="nomeMae"
                    value={formData.nomeMae}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Pai
                  </label>
                  <input
                    type="text"
                    name="nomePai"
                    value={formData.nomePai}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="5. Endereço"
              isOpen={expandedSections.endereco}
              onToggle={() => toggleSection('endereco')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço Completo
                  </label>
                  <textarea
                    name="enderecoCompleto"
                    value={formData.enderecoCompleto}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rua, número, complemento, bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    maxLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome da cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado (UF)
                  </label>
                  <select
                    name="uf"
                    value={formData.uf}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o estado</option>
                    {estadosBR.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="6. Documentos"
              isOpen={expandedSections.documentos}
              onToggle={() => toggleSection('documentos')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    name="nis"
                    value={formData.nis}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CTPS
                  </label>
                  <input
                    type="text"
                    name="ctps"
                    value={formData.ctps}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Série da CTPS
                  </label>
                  <input
                    type="text"
                    name="serieCTPS"
                    value={formData.serieCTPS}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RG
                  </label>
                  <input
                    type="text"
                    name="rg"
                    value={formData.rg}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Órgão Expedidor do RG
                  </label>
                  <input
                    type="text"
                    name="orgaoExpedidorRG"
                    value={formData.orgaoExpedidorRG}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: SSP-SP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Expedição do RG
                  </label>
                  <input
                    type="text"
                    name="dataExpedicaoRG"
                    value={formData.dataExpedicaoRG}
                    onChange={handleChange}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="DD/MM/AAAA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título de Eleitor
                  </label>
                  <input
                    type="text"
                    name="tituloEleitor"
                    value={formData.tituloEleitor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* SEÇÃO 7: Anexos de Documentos */}
            <CollapsibleSection
              title="7. Anexos de Documentos (PDF)"
              isOpen={expandedSections.anexos}
              onToggle={() => toggleSection('anexos')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anexo do RG (PDF)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 'anexoRG')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.anexoRG && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {formData.anexoRG.name}
                    </p>
                  )}
                  {uploadingRG && (
                    <p className="text-xs text-blue-600 mt-1">📤 Enviando RG...</p>
                  )}
                  {editingPerson?.anexo_rg_url && !formData.anexoRG && (
                    <p className="text-xs text-gray-600 mt-1">
                      📄 Documento atual: <a href={editingPerson.anexo_rg_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver RG</a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anexo do Título de Eleitor (PDF)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 'anexoTitulo')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.anexoTitulo && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {formData.anexoTitulo.name}
                    </p>
                  )}
                  {uploadingTitulo && (
                    <p className="text-xs text-blue-600 mt-1">📤 Enviando Título...</p>
                  )}
                  {editingPerson?.anexo_titulo_eleitor_url && !formData.anexoTitulo && (
                    <p className="text-xs text-gray-600 mt-1">
                      📄 Documento atual: <a href={editingPerson.anexo_titulo_eleitor_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver Título</a>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ Apenas arquivos PDF, tamanho máximo 10MB
              </p>
              <p className="text-xs text-amber-600 mt-1">
                💡 Dica: É necessário preencher o CPF antes de fazer upload dos documentos
              </p>
            </CollapsibleSection>

            <CollapsibleSection
              title="8. Outras Informações"
              isOpen={expandedSections.outras}
              onToggle={() => toggleSection('outras')}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="portadorDeficiencia"
                  checked={Boolean(formData.portadorDeficiencia)}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Portador de Deficiência
                </label>
              </div>
            </CollapsibleSection>

            <div className="flex gap-2 pt-6 border-t">
              <button
                type="submit"
                disabled={loading || uploadingRG || uploadingTitulo}
                className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Salvando...' : uploadingRG || uploadingTitulo ? 'Enviando documentos...' : editingPerson ? '✓ Atualizar Pessoa' : '✓ Salvar Pessoa'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading || uploadingRG || uploadingTitulo}
                className="bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 disabled:opacity-50 font-semibold"
              >
                ✗ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

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
              <th className="px-4 py-2 text-gray-500 uppercase text-xs font-medium">
                Ações
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
                <td className="px-4 py-1.5">
                  <button
                    onClick={() => handleEdit(person)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {sortedPeople.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
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