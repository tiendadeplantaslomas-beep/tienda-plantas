import Link from 'next/link';
import { getProducts } from '@/actions/product-actions';
import ProductCarousel from './components/ProductCarousel';

export default async function TiendaLandingPage() {
    const products = await getProducts();
    const WHATSAPP_NUMBER = "54911XXXXXXXX"; // Reemplaza con tu número real

    // Mensaje general para el globo flotante de WhatsApp
    const generalWaUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("¡Hola! Me gustaría hacerles una consulta sobre las plantas y productos del vivero.")}`;

    return (
        <div className="w-full h-full flex flex-col overflow-y-auto bg-stone-50 text-stone-800">

            {/* 1. BANNER DE PROMOCIONES DE LA SEMANA (Administrable) */}
            <section className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-lime-600 text-white py-3 px-6 shadow-xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <span className="text-xl animate-bounce">🌱</span>
                        <div>
                            <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Promoción Destacada
                            </span>
                            <p className="text-xs md:text-sm font-semibold mt-0.5">
                                15% de Descuento en Sustratos y Abonos abonando por transferencia.
                            </p>
                        </div>
                    </div>
                    <span className="text-[11px] bg-white text-emerald-800 font-bold px-3 py-1 rounded-xl shadow-xs">
                        ¡Stock Limitado!
                    </span>
                </div>
            </section>

            {/* 2. HERO / BIENVENIDA CON IMAGEN DE FONDO DEL VIVERO */}
            <section className="relative w-full py-20 md:py-28 px-6 text-center overflow-hidden bg-stone-900">
                {/* Imagen de fondo con opacidad */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://res.cloudinary.com/mfzvsfah/image/upload/v1/vivero-fondo" // Reemplaza con la URL de Cloudinary de tu local
                        alt="Fondo Vivero"
                        className="w-full h-full object-cover opacity-40 scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-stone-900/80"></div>
                </div>

                {/* Contenido del Hero */}
                <div className="relative z-10 max-w-4xl mx-auto space-y-5">
                    <span className="inline-block bg-emerald-500/90 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                        🌿 Bienvenidos a nuestro vivero
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                        Transformá tus espacios con vida y color
                    </h1>
                    <p className="text-stone-200 text-base md:text-lg max-w-2xl mx-auto font-medium">
                        Descubrí nuestra selección exclusiva de plantas de interior, exterior, macetas y asesoramiento personalizado.
                    </p>
                </div>
            </section>

            {/* 3. CARRUSEL DE PRODUCTOS DESTACADOS (Hasta 10 productos con flechas) */}
            <section className="max-w-7xl w-full mx-auto px-6 py-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-stone-200 pb-3 gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-stone-900">✨ Catálogo Destacado</h2>
                        <p className="text-xs text-stone-500">Navegá por nuestros productos principales</p>
                    </div>
                    <Link
                        href="/tienda/categoria"
                        className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                        Ver catálogo completo por categorías ➔
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 shadow-xs">
                        <p className="text-stone-500 text-base">No hay productos cargados en este momento.</p>
                    </div>
                ) : (
                    <ProductCarousel products={products} whatsappNumber={WHATSAPP_NUMBER} />
                )}
            </section>

            {/* 4. RECUADROS CON FOTOS DEL LOCAL Y RESEÑAS */}
            <section className="max-w-7xl w-full mx-auto px-6 py-8 mb-12">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h2 className="text-2xl font-black text-stone-900">Nuestro Vivero & Experiencia</h2>
                    <p className="text-xs text-stone-500 mt-1">Un espacio pensado para los amantes de la jardinería</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Tarjeta Local 1 */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-200 flex flex-col">
                        <div className="h-64 w-full bg-stone-100 overflow-hidden">
                            <img
                                src="https://res.cloudinary.com/mfzvsfah/image/upload/v1/local-1" // URL de foto de tu local
                                alt="Invernadero del vivero"
                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                            />
                        </div>
                        <div className="p-6 flex flex-col justify-between flex-grow space-y-4">
                            <div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase">Atención Personalizada</span>
                                <h3 className="text-lg font-bold text-stone-900 mt-2">Asesoramiento experto para tus plantas</h3>
                                <p className="text-stone-600 text-sm mt-1 leading-relaxed">
                                    &ldquo;Me ayudaron a elegir exactamente las especies que necesitaba para mi balcón con sombra. ¡Super recomendados por su paciencia y dedicación!&rdquo;
                                </p>
                            </div>
                            <p className="text-xs font-semibold text-stone-400">— Sofía M. (Cliente frecuente)</p>
                        </div>
                    </div>

                    {/* Tarjeta Local 2 */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-200 flex flex-col">
                        <div className="h-64 w-full bg-stone-100 overflow-hidden">
                            <img
                                src="https://res.cloudinary.com/mfzvsfah/image/upload/v1/local-2" // URL de otra foto de tu local
                                alt="Sector de plantas de exterior"
                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                            />
                        </div>
                        <div className="p-6 flex flex-col justify-between flex-grow space-y-4">
                            <div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase">Variedad y Calidad</span>
                                <h3 className="text-lg font-bold text-stone-900 mt-2">Plantas sanas y fuertes listas para trasplantar</h3>
                                <p className="text-stone-600 text-sm mt-1 leading-relaxed">
                                    &ldquo;Tienen una variedad increíble de sustratos y macetas. Compré varias especies y llegaron impecables. Da gusto comprar en un lugar así.&rdquo;
                                </p>
                            </div>
                            <p className="text-xs font-semibold text-stone-400">— Javier R. (Vecino de la zona)</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. GLOBO FLOTANTE DE WHATSAPP (WIDGET FIJO) */}
            <a
                href={generalWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 duration-300 group"
                aria-label="Consultar por WhatsApp"
            >
                <span className="text-2xl">💬</span>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 ease-in-out text-xs font-bold pl-0 group-hover:pl-2">
                    ¡Escribinos tus dudas!
                </span>
            </a>

        </div>
    );
}