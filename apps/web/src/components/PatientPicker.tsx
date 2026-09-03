import { useEffect, useId, useMemo, useRef, useState } from 'react'
import s from './PatientPicker.module.css'

export interface PatientOption {
  id: string
  nome: string
  email?: string
}

interface PatientPickerProps {
  patients: PatientOption[]
  value: string
  onChange: (value: string) => void
  onSelect?: (patient: PatientOption) => void
  label?: string
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
}

export default function PatientPicker({
  patients,
  value,
  onChange,
  onSelect,
  label = 'Paciente',
  placeholder = 'Digite para buscar um paciente...',
  emptyMessage = 'Nenhum paciente encontrado.',
  disabled = false,
}: PatientPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = `patient-picker-${useId()}`
  const optionsId = `${inputId}-options`
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const filtered = useMemo(() => {
    const term = value.trim().toLocaleLowerCase()
    if (!term) return patients
    return patients.filter((patient) =>
      `${patient.nome} ${patient.email ?? ''}`.toLocaleLowerCase().includes(term),
    )
  }, [patients, value])

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [])

  useEffect(() => {
    setHighlighted(0)
  }, [value])

  function selectPatient(patient: PatientOption) {
    onChange(patient.nome)
    onSelect?.(patient)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((current) => Math.min(current + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && filtered[highlighted]) {
      event.preventDefault()
      selectPatient(filtered[highlighted])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={rootRef} className={s.root}>
      <label className={s.label} htmlFor={inputId}>{label}</label>
      <div className={`${s.inputWrap} ${open ? s.inputWrapOpen : ''}`}>
        <span className={s.searchIcon} aria-hidden="true"><SearchIcon /></span>
        <input
          ref={inputRef}
          id={inputId}
          className={s.input}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={optionsId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(event) => { onChange(event.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button type="button" className={s.clear} onClick={() => { onChange(''); inputRef.current?.focus() }} aria-label="Limpar paciente">
            <CloseIcon />
          </button>
        )}
      </div>
      {open && (
        <div id={optionsId} className={s.dropdown} role="listbox">
          {filtered.length > 0 ? filtered.map((patient, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === highlighted}
              key={patient.id}
              className={`${s.option} ${index === highlighted ? s.optionActive : ''}`}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectPatient(patient)}
            >
              <span className={s.avatar}>{patient.nome.charAt(0).toUpperCase()}</span>
              <span className={s.optionText}>
                <strong>{patient.nome}</strong>
                {patient.email && <small>{patient.email}</small>}
              </span>
              <CheckIcon />
            </button>
          )) : <div className={s.empty}>{emptyMessage}</div>}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
}

function CloseIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function CheckIcon() {
  return <svg className="patient-picker-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
}
