import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface VerifyResponse {
  es_valido: boolean;
  nombre_completo: string;
  carrera: string;
  ciclo_escolar: string;
  foto_url: string | null;
}

type PageState =
  | { status: 'loading' }
  | { status: 'success'; data: VerifyResponse }
  | { status: 'error'; message: string };

// ─── Helpers SVG (sin librerías de iconos) ───────────────────────────────────

function CheckIcon() {
  return (
    <svg
      className="w-8 h-8 text-white flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function UserPlaceholderIcon() {
  return (
    <svg
      className="w-12 h-12 text-[#6C47FF]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function VerifyCredential() {
  const { matricula } = useParams<{ matricula: string }>();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const apiBase = import.meta.env.VITE_API_URL as string;

    fetch(`${apiBase}/credentials/verify/${matricula}/`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (res.status === 404) {
          setState({ status: 'error', message: 'MATRÍCULA NO ENCONTRADA' });
          return;
        }
        if (!res.ok) {
          setState({
            status: 'error',
            message: 'ATENCIÓN: REGISTRO NO VÁLIDO O EXPIRADO',
          });
          return;
        }
        const data: VerifyResponse = await res.json();
        setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          setState({
            status: 'error',
            message: 'La solicitud tardó demasiado. Intenta de nuevo.',
          });
        } else {
          setState({
            status: 'error',
            message: 'ATENCIÓN: REGISTRO NO VÁLIDO O EXPIRADO',
          });
        }
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [matricula]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F0F23' }}
      >
        <div className="w-10 h-10 rounded-full border-4 border-[#6C47FF] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F0F23' }}>
        <div className="w-full bg-red-600 px-4 py-6 text-center">
          <p className="text-white font-bold text-lg tracking-widest">{state.message}</p>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  const { data } = state;

  if (!data.es_valido) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F0F23' }}>
        <div className="w-full bg-red-600 px-4 py-6 text-center">
          <p className="text-white font-bold text-lg tracking-widest">
            ATENCIÓN: REGISTRO NO VÁLIDO O EXPIRADO
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F23' }}>
      {/* Banner verde ─────────────────────────────────────────────────────── */}
      <div className="w-full bg-emerald-500 px-4 py-6 flex items-center justify-center gap-3">
        <CheckIcon />
        <p className="text-white font-bold text-xl tracking-widest">CREDENCIAL VÁLIDA</p>
      </div>

      {/* Card ──────────────────────────────────────────────────────────────── */}
      <div className="max-w-sm mx-auto mt-8 px-4 pb-12">
        <div
          className="rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ backgroundColor: '#1a1a3e' }}
        >
          {/* Foto del alumno */}
          {data.foto_url ? (
            <img
              src={data.foto_url}
              alt={`Foto de ${data.nombre_completo}`}
              className="w-28 h-36 object-cover rounded-xl"
            />
          ) : (
            <div className="w-28 h-36 rounded-xl bg-[#2a2a5a] flex items-center justify-center">
              <UserPlaceholderIcon />
            </div>
          )}

          {/* Datos del alumno */}
          <div className="text-center space-y-3 w-full">
            <p className="text-white font-bold text-lg leading-snug">{data.nombre_completo}</p>
            <p className="text-gray-300 text-sm">{data.carrera}</p>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: '#6C47FF' }}
            >
              {data.ciclo_escolar}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
