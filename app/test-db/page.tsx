// app/test-db/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDB() {
  const [message, setMessage] = useState('Testando conexão...')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('projects').select('*').limit(1)
        
        if (error) {
          setMessage(`Erro: ${error.message}`)
        } else {
          setMessage('✅ Conexão com Supabase funcionando!')
        }
      } catch (err) {
        setMessage(`Erro: ${err}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão com Banco de Dados</h1>
      <p>{message}</p>
    </div>
  )
}