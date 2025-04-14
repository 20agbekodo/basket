import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UserPlayer, Position, PlayerLevel } from '../data/types'

interface AddPlayerFormProps {
  onClose: () => void
  onSubmit: (user: Omit<UserPlayer, 'x' | 'y' | 'z' | 'neighbors' | 'expectedSalaryLow' | 'expectedSalaryHigh' | 'expectedSalaryMid' | 'createdAt'>) => void
}

interface FormValues {
  name: string
  position: Position
  level: PlayerLevel
  heightFeet: number
  heightInches: number
  weightLbs: number
  ppg?: number
  fgPct?: number
  threePct?: number
  ftPct?: number
  vertInches?: number
  wingspanInches?: number
  hundredMeterSec?: number
}

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']
const LEVELS: PlayerLevel[] = [
  'Recreational',
  'High School',
  'College D2',
  'College D1',
  'Semi-Pro',
  'Pro',
]

const inputCls =
  'bg-white/10 rounded-lg px-3 py-2 w-full text-white text-sm outline-none focus:ring-1 focus:ring-orange-500/60 placeholder-white/30'
const labelCls = 'block text-xs text-white/50 mb-1'
const errorCls = 'text-red-400 text-xs mt-0.5'

export function AddPlayerForm({ onClose, onSubmit }: AddPlayerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      heightFeet: 6,
      heightInches: 0,
      weightLbs: 180,
    },
  })

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setPhotoPreview(result)
      setPhotoBase64(result)
    }
    reader.readAsDataURL(file)
  }

  function processSubmit(data: FormValues) {
    const heightCm = (data.heightFeet * 12 + (data.heightInches ?? 0)) * 2.54
    const weightKg = data.weightLbs * 0.453592

    const user: Omit<UserPlayer, 'x' | 'y' | 'z' | 'neighbors' | 'expectedSalaryLow' | 'expectedSalaryHigh' | 'expectedSalaryMid' | 'createdAt'> = {
      id: crypto.randomUUID(),
      name: data.name,
      photoBase64,
      heightCm,
      weightKg,
      position: data.position,
      level: data.level,
      ppg: data.ppg !== undefined && data.ppg !== null && !isNaN(Number(data.ppg)) ? Number(data.ppg) : undefined,
      fgPct: data.fgPct !== undefined && !isNaN(Number(data.fgPct)) ? Number(data.fgPct) / 100 : undefined,
      threePct: data.threePct !== undefined && !isNaN(Number(data.threePct)) ? Number(data.threePct) / 100 : undefined,
      ftPct: data.ftPct !== undefined && !isNaN(Number(data.ftPct)) ? Number(data.ftPct) / 100 : undefined,
      vertInches: data.vertInches !== undefined && !isNaN(Number(data.vertInches)) ? Number(data.vertInches) : undefined,
      wingspanInches: data.wingspanInches !== undefined && !isNaN(Number(data.wingspanInches)) ? Number(data.wingspanInches) : undefined,
      hundredMeterSec: data.hundredMeterSec !== undefined && !isNaN(Number(data.hundredMeterSec)) ? Number(data.hundredMeterSec) : undefined,
    }

    onSubmit(user)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-lg font-bold">Add yourself to the graph</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className={inputCls}
              placeholder="Your name"
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          {/* Photo */}
          <div>
            <label className={labelCls}>Photo (optional)</label>
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 64 64" className="w-8 h-8 text-white/30" fill="currentColor">
                    <circle cx="32" cy="22" r="12" opacity="0.6" />
                    <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" opacity="0.6" />
                  </svg>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                Choose photo
              </button>
            </div>
          </div>

          {/* Position */}
          <div>
            <label className={labelCls}>Position *</label>
            <select
              {...register('position', { required: 'Position is required' })}
              className={inputCls}
            >
              <option value="" disabled>Select position</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.position && <p className={errorCls}>{errors.position.message}</p>}
          </div>

          {/* Level */}
          <div>
            <label className={labelCls}>Level *</label>
            <select
              {...register('level', { required: 'Level is required' })}
              className={inputCls}
            >
              <option value="" disabled>Select level</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {errors.level && <p className={errorCls}>{errors.level.message}</p>}
          </div>

          {/* Height */}
          <div>
            <label className={labelCls}>Height *</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  {...register('heightFeet', {
                    required: true,
                    min: { value: 4, message: 'Min 4ft' },
                    max: { value: 8, message: 'Max 8ft' },
                    valueAsNumber: true,
                  })}
                  type="number"
                  className={inputCls}
                  placeholder="6"
                />
                <p className="text-white/30 text-xs mt-0.5 text-center">feet</p>
              </div>
              <div className="flex-1">
                <input
                  {...register('heightInches', {
                    min: { value: 0, message: 'Min 0' },
                    max: { value: 11, message: 'Max 11' },
                    valueAsNumber: true,
                  })}
                  type="number"
                  className={inputCls}
                  placeholder="0"
                />
                <p className="text-white/30 text-xs mt-0.5 text-center">inches</p>
              </div>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className={labelCls}>Weight (lbs) *</label>
            <input
              {...register('weightLbs', {
                required: 'Weight is required',
                min: { value: 100, message: 'Min 100 lbs' },
                max: { value: 400, message: 'Max 400 lbs' },
                valueAsNumber: true,
              })}
              type="number"
              className={inputCls}
              placeholder="180"
            />
            {errors.weightLbs && <p className={errorCls}>{errors.weightLbs.message}</p>}
          </div>

          {/* Optional stats */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Stats (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>PPG</label>
                <input
                  {...register('ppg', { min: 0, max: 50, valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder="0–50"
                />
              </div>
              <div>
                <label className={labelCls}>FG%</label>
                <input
                  {...register('fgPct', { min: 0, max: 100, valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder="0–100"
                />
              </div>
              <div>
                <label className={labelCls}>3P%</label>
                <input
                  {...register('threePct', { min: 0, max: 100, valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder="0–100"
                />
              </div>
              <div>
                <label className={labelCls}>FT%</label>
                <input
                  {...register('ftPct', { min: 0, max: 100, valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder="0–100"
                />
              </div>
            </div>
          </div>

          {/* Physical measurements */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Physical (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Vert leap (in)</label>
                <input
                  {...register('vertInches', { min: 10, max: 60, valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  className={inputCls}
                  placeholder="10–60"
                />
              </div>
              <div>
                <label className={labelCls}>Wingspan (in)</label>
                <input
                  {...register('wingspanInches', { min: 50, max: 100, valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  className={inputCls}
                  placeholder="50–100"
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>100m PR (seconds)</label>
                <input
                  {...register('hundredMeterSec', { min: 9, max: 25, valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder="9–25"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg px-6 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-6 py-2 font-bold text-sm transition-colors"
            >
              Add to Universe
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
