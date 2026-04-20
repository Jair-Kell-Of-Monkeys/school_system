import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'card' | 'transfer' | 'oxxo';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'card',     label: 'Tarjeta de crédito/débito' },
  { value: 'transfer', label: 'Transferencia bancaria' },
  { value: 'oxxo',     label: 'OXXO Pay' },
];

// Datos dummy — se conectarán al backend en una iteración posterior
const DUMMY_SUMMARY = [
  { label: 'Referencia', value: 'PAY-20260419-0001', highlight: false },
  { label: 'Concepto',   value: 'Examen de Admisión', highlight: false },
  { label: 'Monto',      value: '$500.00 MXN',        highlight: true  },
] as const;

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function CardIcon({ size = 28, color = '#6C47FF' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OnlinePayment() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');

  // Suprime advertencia de variable no usada; se usará cuando se conecte al backend
  void paymentId;

  return (
    <div className="w-full">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto py-6 px-4 space-y-6">

        {/* ── Volver ──────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <BackArrowIcon />
          Volver
        </button>

        {/* ── Encabezado ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center gap-3 pt-2 pb-1">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(108, 71, 255, 0.15)' }}
          >
            <CardIcon size={28} color="#6C47FF" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Pago en línea
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Completa tu pago de forma segura
            </p>
          </div>
        </div>

        {/* ── Cards: Resumen + Método (side-by-side en lg) ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Resumen de pago ───────────────────────────────────────────── */}
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{
              background: '#1a1a3e',
              borderColor: 'rgba(108, 71, 255, 0.3)',
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Resumen de Pago
            </p>

            {DUMMY_SUMMARY.map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: highlight ? '#6C47FF' : 'var(--text-primary)' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Método de pago ────────────────────────────────────────────── */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              background: '#1a1a3e',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Método de Pago
            </p>

            {PAYMENT_METHODS.map(({ value, label }) => {
              const checked = selectedMethod === value;
              return (
                <label
                  key={value}
                  className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all duration-150"
                  style={{
                    background: checked ? 'rgba(108, 71, 255, 0.12)' : 'transparent',
                    border: `1.5px solid ${checked ? '#6C47FF' : 'rgba(255, 255, 255, 0.08)'}`,
                  }}
                >
                  {/* Input real oculto — accesibilidad */}
                  <input
                    type="radio"
                    name="payment_method"
                    value={value}
                    checked={checked}
                    onChange={() => setSelectedMethod(value)}
                    className="sr-only"
                  />

                  {/* Radio visual personalizado */}
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: checked ? '#6C47FF' : 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {checked && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: '#6C47FF' }}
                      />
                    )}
                  </div>

                  <span
                    className="text-sm font-medium"
                    style={{
                      color: checked ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {label}
                  </span>
                </label>
              );
            })}
          </div>

        </div>{/* /grid */}

        {/* ── Continuar ───────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => alert('Próximamente disponible')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[.98]"
          style={{
            background: 'linear-gradient(135deg, #6C47FF 0%, #3B82F6 100%)',
          }}
        >
          Continuar con el pago
          <ArrowRightIcon />
        </button>

        {/* ── Seguridad ───────────────────────────────────────────────────── */}
        <p
          className="text-center text-xs leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          🔒 Pago seguro — los datos de tu tarjeta son cifrados
        </p>

      </div>
    </div>
  );
}
