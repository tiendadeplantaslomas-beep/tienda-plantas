import React from 'react';
import Link from 'next/link';
import { Sprout, ShieldAlert, Award, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">

      {/* Sección Hero (Banner principal) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-800">
            🌱 Vivero en Lomas de Zamora
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-stone-950 sm:text-6xl">
            Llevá la naturaleza <br />
            <span className="text-emerald-700">a tu hogar</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
            Explorá nuestra variedad seleccionada de plantas de interior y exterior, sustratos premium y macetas de diseño para armar tu rincón verde.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/catalogo" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition">
              Ver Catálogo Completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Sección de Categorías Rápidas */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 w-full">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 mb-8">Nuestras Categorías</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {/* Categoría 1 */}
          <div className="group relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sprout className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-stone-900 group-hover:text-emerald-700 transition">Plantas de Interior</h3>
            <p className="mt-2 text-sm text-stone-500">Hermosas variedades adaptadas para dar vida y purificar el aire de tus ambientes cerrados.</p>
          </div>

          {/* Categoría 2 */}
          <div className="group relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-stone-900 group-hover:text-emerald-700 transition">Sustratos Especiales</h3>
            <p className="mt-2 text-sm text-stone-500">Mezclas profesionales preparadas a medida con el mejor drenaje y nutrientes para tus raíces.</p>
          </div>

          {/* Categoría 3 */}
          <div className="group relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-stone-900 group-hover:text-emerald-700 transition">Macetas y Accesorios</h3>
            <p className="mt-2 text-sm text-stone-500">Macetas plásticas y de cemento deco de excelente calidad para el trasplante ideal.</p>
          </div>

        </div>
      </section>

    </div>
  );
}