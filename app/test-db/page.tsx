// app/test-db/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDBPage() {
  const [message, setMessage] = useState('Testando conexão...')

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*')
      if (error) {
        console.error('Erro ao conectar com Supabase:', error)
        setMessage('Erro ao conectar com Supabase: ' + error.message)
      } else {
        setMessage(`Conexão bem-sucedida! ${data.length} projetos encontrados.`)
      }
    } catch (error) {
      console.error('Erro ao conectar com Supabase:', error)
      setMessage('Erro ao conectar com Supabase: ' + (error as Error).message)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão com Banco de Dados</h1>
      <button
        onClick={testConnection}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
      >
        Testar Conexão
      </button>
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <p>{message}</p>
      </div>
    </div>
  )
}