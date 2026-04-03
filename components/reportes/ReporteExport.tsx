'use client'

import { RefObject, useState } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ReporteExportProps {
  tableRef: RefObject<HTMLDivElement | null>
  filename: string
  columns: string[]
  rows: Record<string, unknown>[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escaparCSV(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  // Encerrar en comillas si contiene comas, saltos de línea o comillas
  if (texto.includes(',') || texto.includes('\n') || texto.includes('"')) {
    return '"' + texto.replace(/"/g, '""') + '"'
  }
  return texto
}

function descargarCSV(columns: string[], rows: Record<string, unknown>[], filename: string) {
  const encabezado = columns.join(',')
  const filas = rows.map((fila) =>
    columns.map((col) => escaparCSV(fila[col])).join(',')
  )
  // BOM UTF-8 para que Excel reconozca tildes y ñ
  const csv = '\ufeff' + [encabezado, ...filas].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${filename}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function ReporteExport({ tableRef, filename, columns, rows }: ReporteExportProps) {
  const [exportandoPDF, setExportandoPDF] = useState(false)

  async function exportarPDF() {
    if (!tableRef.current) return
    setExportandoPDF(true)
    try {
      // Importaciones dinámicas para evitar carga en SSR
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const elemento = tableRef.current
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const anchoCanvas = canvas.width / 2   // escala 2x → dividir para puntos reales
      const altoCanvas  = canvas.height / 2

      // Orientación según dimensiones del contenido
      const orientacion = anchoCanvas > altoCanvas ? 'landscape' : 'portrait'
      const pdf = new jsPDF({
        orientation: orientacion,
        unit: 'px',
        format: [anchoCanvas, altoCanvas],
        hotfixes: ['px_scaling'],
      })

      pdf.addImage(imgData, 'PNG', 0, 0, anchoCanvas, altoCanvas)
      pdf.save(`${filename}.pdf`)
    } catch (e) {
      console.error('Error al exportar PDF:', e)
    } finally {
      setExportandoPDF(false)
    }
  }

  function exportarCSV() {
    descargarCSV(columns, rows, filename)
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={exportarPDF}
        disabled={exportandoPDF}
        className="ct-btn ct-btn-secondary"
        style={{ fontSize: 13, height: 36, padding: '0 14px' }}
      >
        {exportandoPDF ? 'Generando...' : '↓ Exportar PDF'}
      </button>

      <button
        onClick={exportarCSV}
        className="ct-btn ct-btn-secondary"
        style={{ fontSize: 13, height: 36, padding: '0 14px' }}
      >
        ↓ Exportar CSV
      </button>
    </div>
  )
}
