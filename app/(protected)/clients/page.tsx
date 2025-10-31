// app/(protected)/clients/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  endereco_completo?: string
  cidade?: string
  uf?: string
  cep?: string
  segmento?: string
  email?: string
  telefone?: string
  site?: string
  porte?: string
  natureza_juridica?: string
  data_abertura?: string
  active: boolean
  created_at?: string
}

type SortKey = 'cnpj' | 'razao_social' | 'cidade' | 'uf' | 'segmento' | 'active' | 'created_at'
type SortDirection = 'asc' | 'desc'

const STORAGE_KEY = 'clientsSort-v1'

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

const segmentos = [
  'Varejo',
  'Indústria',
  'Serviços',
  'Tecnologia',
  'Saúde',
  'Educação',
  'Construção Civil',
  'Agronegócio',
  'Alimentação',
  'Transporte e Logística',
  'Financeiro',
  'Imobiliário',
  'Energia',
  'Telecomunicações',
  'Entretenimento',
  'Outros'
]

// Componente de seção colapsável
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingCNPJ, setFetchingCNPJ] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  // Estado do formulário
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    enderecoCompleto: '',
    cidade: '',
    uf: '',
    cep: '',
    segmento: '',
    email: '',
    telefone: '',
    site: '',
    porte: '',
    naturezaJuridica: '',
    dataAbertura: '',
    active: true
  })

  // Controle de seções expandidas
  const [expandedSections, setExpandedSections] = useState({
    dadosEmpresa: true,
    endereco: true,
    contato: false,
    outros: false
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

      const validKeys: SortKey[] = ['cnpj', 'razao_social', 'cidade', 'uf', 'segmento', 'active', 'created_at']
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
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      alert('Erro ao carregar clientes')
    }
  }

  // Validação de CNPJ
  const validateCNPJ = (cnpj: string): boolean => {
    cnpj = cnpj.replace(/[^\d]/g, '')
    
    if (cnpj.length !== 14) return false
    if (/^(\d)\1+$/.test(cnpj)) return false

    let tamanho = cnpj.length - 2
    let numeros = cnpj.substring(0, tamanho)
    const digitos = cnpj.substring(tamanho)
    let soma = 0
    let pos = tamanho - 7

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--
      if (pos < 2) pos = 9
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
    if (resultado !== parseInt(digitos.charAt(0))) return false

    tamanho = tamanho + 1
    numeros = cnpj.substring(0, tamanho)
    soma = 0
    pos = tamanho - 7

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--
      if (pos < 2) pos = 9
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
    if (resultado !== parseInt(digitos.charAt(1))) return false

    return true
  }

  // Máscara de CNPJ
  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  // Máscara de CEP
  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1')
  }

  // Máscara de telefone
  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  // Máscara de data
  const maskDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{4})\d+?$/, '$1')
  }

  // Converter data DD/MM/YYYY para YYYY-MM-DD
  const convertDateToISO = (dateBR: string): string | null => {
    if (!dateBR || dateBR.length !== 10) return null
    const [day, month, year] = dateBR.split('/')
    if (!day || !month || !year) return null
    return `${year}-${month}-${day}`
  }

  // Formatar data ISO para DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateISO: string): string => {
    if (!dateISO) return ''
    const [year, month, day] = dateISO.split('-')
    return `${day}/${month}/${year}`
  }

  // Buscar dados do CNPJ na Receita Federal
  const fetchCNPJData = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    
    if (cleanCNPJ.length !== 14) {
      alert('CNPJ deve ter 14 dígitos')
      return
    }

    if (!validateCNPJ(cnpj)) {
      alert('CNPJ inválido!')
      return
    }

    setFetchingCNPJ(true)

    try {
      // API gratuita da ReceitaWS
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado')
      }

      const data = await response.json()

      // Preencher formulário com os dados retornados
      setFormData(prev => ({
        ...prev,
        razaoSocial: data.razao_social || data.nome_empresarial || '',
        nomeFantasia: data.nome_fantasia || data.estabelecimento?.nome_fantasia || '',
        enderecoCompleto: `${data.logradouro || ''}, ${data.numero || 'S/N'}${data.complemento ? ' - ' + data.complemento : ''} - ${data.bairro || ''}`,
        cidade: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep ? data.cep.replace(/[^\d]/g, '') : '',
        porte: data.porte || data.descricao_porte || '',
        naturezaJuridica: data.natureza_juridica || data.descricao_natureza_juridica || '',
        dataAbertura: data.data_inicio_atividade ? formatDateToDDMMYYYY(data.data_inicio_atividade) : ''
      }))

      alert('✅ Dados do CNPJ carregados com sucesso!')
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error)
      alert('❌ Erro ao buscar dados do CNPJ. Verifique se o CNPJ está correto e tente novamente.')
    } finally {
      setFetchingCNPJ(false)
    }
  }

  // Editar cliente
  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      cnpj: maskCNPJ(client.cnpj),
      razaoSocial: client.razao_social,
      nomeFantasia: client.nome_fantasia || '',
      enderecoCompleto: client.endereco_completo || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      cep: client.cep ? maskCEP(client.cep) : '',
      segmento: client.segmento || '',
      email: client.email || '',
      telefone: client.telefone || '',
      site: client.site || '',
      porte: client.porte || '',
      naturezaJuridica: client.natureza_juridica || '',
      dataAbertura: client.data_abertura ? formatDateToDDMMYYYY(client.data_abertura) : '',
      active: Boolean(client.active)
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateCNPJ(formData.cnpj)) {
      alert('CNPJ inválido! Por favor, verifique.')
      return
    }

    setLoading(true)

    try {
      const clientData = {
        cnpj: formData.cnpj.replace(/\D/g, ''),
        razao_social: formData.razaoSocial,
        nome_fantasia: formData.nomeFantasia || null,
        endereco_completo: formData.enderecoCompleto || null,
        cidade: formData.cidade || null,
        uf: formData.uf || null,
        cep: formData.cep ? formData.cep.replace(/\D/g, '') : null,
        segmento: formData.segmento || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        site: formData.site || null,
        porte: formData.porte || null,
        natureza_juridica: formData.naturezaJuridica || null,
        data_abertura: formData.dataAbertura ? convertDateToISO(formData.dataAbertura) : null,
        active: formData.active
      }

      let result

      if (editingClient) {
        // MODE EDIT: Atualizar cliente existente
        const { data, error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .select()

        if (error) throw error
        result = data
      } else {
        // MODE CREATE: Criar novo cliente
        const { data, error } = await supabase
          .from('clients')
          .insert([clientData])
          .select()

        if (error) throw error
        result = data
      }

      // Atualizar a lista
      if (result && result[0]) {
        if (editingClient) {
          setClients(clients.map(c => c.id === editingClient.id ? result[0] : c))
        } else {
          setClients([result[0], ...clients])
        }
      }

      // Reset do formulário
      resetForm()
      
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Erro ao salvar cliente: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    let finalValue = value
    
    if (name === 'cnpj') {
      finalValue = maskCNPJ(value)
    } else if (name === 'cep') {
      finalValue = maskCEP(value)
    } else if (name === 'telefone') {
      finalValue = maskPhone(value)
    } else if (name === 'dataAbertura') {
      finalValue = maskDate(value)
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
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      enderecoCompleto: '',
      cidade: '',
      uf: '',
      cep: '',
      segmento: '',
      email: '',
      telefone: '',
      site: '',
      porte: '',
      naturezaJuridica: '',
      dataAbertura: '',
      active: true
    })
    setEditingClient(null)
    setShowForm(false)
  }

  const sortedClients = useMemo(() => {
    const copy = [...clients]

    const getVal = (c: Client, key: SortKey) => {
      switch (key) {
        case 'cnpj':
          return c.cnpj || ''
        case 'razao_social':
          return c.razao_social || ''
        case 'cidade':
          return c.cidade || ''
        case 'uf':
          return c.uf || ''
        case 'segmento':
          return c.segmento || ''
        case 'active':
          return c.active ? 1 : 0
        case 'created_at':
          return c.created_at ? new Date(c.created_at).getTime() : -Infinity
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
  }, [clients, sortKey, sortDir])

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

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => {
            setEditingClient(null)
            setShowForm(true)
          }}
          className="bg-premiumbravo text-white px-4 py-2 rounded-lg hover:bg-teal-600"
        >
          + Novo Cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">
            {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
          </h2>
          <form onSubmit={handleSubmit}>
            
            <CollapsibleSection
              title="1. Dados da Empresa *"
              isOpen={expandedSections.dadosEmpresa}
              onToggle={() => toggleSection('dadosEmpresa')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleChange}
                      maxLength={18}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00.000.000/0000-00"
                      disabled={!!editingClient}
                    />
                    <button
                      type="button"
                      onClick={() => fetchCNPJData(formData.cnpj)}
                      disabled={fetchingCNPJ || !formData.cnpj || formData.cnpj.replace(/\D/g, '').length !== 14}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fetchingCNPJ ? '🔄 Buscando...' : '🔍 Buscar Dados'}
                    </button>
                  </div>
                  {formData.cnpj && formData.cnpj.replace(/\D/g, '').length === 14 && !validateCNPJ(formData.cnpj) && (
                    <p className="text-xs text-red-500 mt-1">CNPJ inválido</p>
                  )}
                  {editingClient && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ O CNPJ não pode ser alterado</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razão Social *
                  </label>
                  <input
                    type="text"
                    name="razaoSocial"
                    value={formData.razaoSocial}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: EMPRESA EXEMPLO LTDA"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    name="nomeFantasia"
                    value={formData.nomeFantasia}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Empresa Exemplo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segmento
                  </label>
                  <select
                    name="segmento"
                    value={formData.segmento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    {segmentos.map(seg => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porte
                  </label>
                  <input
                    type="text"
                    name="porte"
                    value={formData.porte}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: ME, EPP, Grande Porte"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Natureza Jurídica
                  </label>
                  <input
                    type="text"
                    name="naturezaJuridica"
                    value={formData.naturezaJuridica}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Abertura
                  </label>
                  <input
                    type="text"
                    name="dataAbertura"
                    value={formData.dataAbertura}
                    onChange={handleChange}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="DD/MM/AAAA"
                  />
                </div>

                <div className="col-span-2 flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="active"
                    checked={Boolean(formData.active)}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Cliente Ativo
                  </label>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="2. Endereço"
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
                    <option value="">Selecione</option>
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
              title="3. Dados de Contato"
              isOpen={expandedSections.contato}
              onToggle={() => toggleSection('contato')}
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
                    placeholder="contato@empresa.com"
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site
                  </label>
                  <input
                    type="url"
                    name="site"
                    value={formData.site}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.empresa.com.br"
                  />
                </div>
              </div>
            </CollapsibleSection>

            <div className="flex gap-2 pt-6 border-t">
              <button
                type="submit"
                disabled={loading || fetchingCNPJ}
                className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Salvando...' : editingClient ? '✓ Atualizar Cliente' : '✓ Salvar Cliente'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading || fetchingCNPJ}
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
          <thead className="bg-gray-300">
            <tr>
              <th className="px-4 py-2 text-gray-900">
                <button className={headerBtn} onClick={() => toggleSort('cnpj')} title="Ordenar por CNPJ">
                  <span className="uppercase">CNPJ</span>
                  <span>{arrow('cnpj')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-800">
                <button className={headerBtn} onClick={() => toggleSort('razao_social')} title="Ordenar por razão social">
                  <span className="uppercase">Razão Social</span>
                  <span>{arrow('razao_social')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-700">
                <button className={headerBtn} onClick={() => toggleSort('segmento')} title="Ordenar por segmento">
                  <span className="uppercase">Segmento</span>
                  <span>{arrow('segmento')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-800">
                <button className={headerBtn} onClick={() => toggleSort('cidade')} title="Ordenar por cidade">
                  <span className="uppercase">Cidade</span>
                  <span>{arrow('cidade')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-800">
                <button className={headerBtn} onClick={() => toggleSort('uf')} title="Ordenar por UF">
                  <span className="uppercase">UF</span>
                  <span>{arrow('uf')}</span>
                </button>
              </th>
              <th className="px-4 py-2 text-gray-800">
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
            {sortedClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-4 py-1.5 font-mono text-gray-900">{maskCNPJ(client.cnpj)}</td>
                <td className="px-4 py-1.5 font-medium text-gray-900">
                  {client.nome_fantasia || client.razao_social}
                </td>
                <td className="px-4 py-1.5 text-gray-500">{client.segmento}</td>
                <td className="px-4 py-1.5 text-gray-500">{client.cidade}</td>
                <td className="px-4 py-1.5 text-gray-500">{client.uf}</td>
                <td className="px-4 py-1.5">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {client.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-1.5">
                  <button
                    onClick={() => handleEdit(client)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {sortedClients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
                  Nenhum cliente cadastrado ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
