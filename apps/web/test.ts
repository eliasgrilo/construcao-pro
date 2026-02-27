import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vjiabffqqwxuqrybvgat.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqaWFiZmZxcXd4dXFyeWJ2Z2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODEyMzgsImV4cCI6MjA4NzM1NzIzOH0.sOk8_0PsIUl36wnntvvGYoOPy8WugIPOV9drV0HfIb4'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data: mats } = await supabase.from('materiais').select('id, preco_unitario').limit(1)
    if (!mats || mats.length === 0) { console.log('No materials'); return }
    const p_material_id = mats[0].id

    const { data: almoxs } = await supabase.from('almoxarifados').select('id').limit(1)
    if (!almoxs || almoxs.length === 0) { console.log('No almoxs'); return }
    const p_almoxarifado_id = almoxs[0].id

    console.log(`Testing with material: ${p_material_id}, almox: ${p_almoxarifado_id}`)

    const params = {
        p_material_id, p_quantidade: 1, p_preco_unitario: mats[0].preco_unitario, p_almoxarifado_id
    }

    const { data, error } = await supabase.rpc('criar_movimentacao_entrada', params)
    if (error) {
        console.error('RPC Error:', error)
    } else {
        console.log('RPC Success:', data)
    }
}

test()
