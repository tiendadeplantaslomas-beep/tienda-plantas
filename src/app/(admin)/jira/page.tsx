'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, AlertCircle, CheckCircle2, Clock, PlusCircle, ChevronLeft, ChevronRight, GitCommit, User, FileText, Upload, X, Code } from 'lucide-react';

export default function AdminJiraPage() {
    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [issuetype, setIssuetype] = useState('Task');
    const [parentKey, setParentKey] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Estados para el Modal de Scripts / TXT
    const [showScriptModal, setShowScriptModal] = useState(false);
    const [scriptContent, setScriptContent] = useState('');
    const [executingScript, setExecutingScript] = useState(false);

    // Paginación: 6 elementos por página
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/jira');
            const data = await res.json();
            if (data.success) {
                setIssues(data.tickets || data.issues || []);
            }
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleIssuetypeChange = (newType: string) => {
        setIssuetype(newType);
        if (newType === 'Epic') {
            setParentKey('');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!summary.trim()) return;

        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/admin/jira', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ summary, description, issuetype, parentKey })
            });
            const data = await res.json();
            if (data.success) {
                setSummary('');
                setDescription('');
                setParentKey('');
                setSuccessMsg('¡Ticket creado y vinculado con éxito!');
                setCurrentPage(1);
                fetchTickets();
            } else {
                setErrorMsg(data.error || 'Error al crear el ticket');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    // Manejador para cargar archivo TXT o JSON
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                setScriptContent(content);
            }
        };
        reader.readAsText(file);
    };

    // Ejecutar el script masivo recibido por texto o archivo
    const handleExecuteScript = async () => {
        if (!scriptContent.trim()) {
            setErrorMsg('El contenido del script está vacío.');
            return;
        }

        setExecutingScript(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const items = JSON.parse(scriptContent);
            if (!Array.isArray(items)) {
                throw new Error('El script debe ser un arreglo JSON válido (Array).');
            }

            let createdCount = 0;
            for (const item of items) {
                const res = await fetch('/api/admin/jira', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        summary: item.summary,
                        description: item.description || '',
                        issuetype: item.issuetype || 'Task',
                        parentKey: item.parentKey || ''
                    })
                });
                const data = await res.json();
                if (data.success) {
                    createdCount++;
                }
            }

            setSuccessMsg(`¡Script ejecutado con éxito! Se crearon ${createdCount} de ${items.length} elementos.`);
            setShowScriptModal(false);
            setScriptContent('');
            setCurrentPage(1);
            fetchTickets();
        } catch (err: any) {
            setErrorMsg('Error al parsear o ejecutar el script: ' + err.message);
        } finally {
            setExecutingScript(false);
        }
    };

    const loadSampleScript = () => {
        const sample = [
            {
                "issuetype": "Epic",
                "summary": "Módulo Unificado de Usuarios y Control de Accesos (RBAC)",
                "description": "Épica para la gestión unificada de clientes y personal."
            },
            {
                "issuetype": "Story",
                "parentKey": "PONER_CLAVE_DE_EPICA",
                "summary": "HU-01: Interfaz por Solapas",
                "description": "Implementar solapas para alternar entre clientes y personal."
            }
        ];
        setScriptContent(JSON.stringify(sample, null, 2));
    };

    const getFilteredParents = () => {
        if (issuetype === 'Epic') return [];
        return issues.filter(i => {
            if (issuetype === 'Story') {
                return i.issuetype === 'Epic';
            }
            if (['Task', 'Subtask', 'Bug'].includes(issuetype)) {
                return i.issuetype === 'Story' || i.issuetype === 'Epic';
            }
            return true;
        });
    };

    const filteredParents = getFilteredParents();

    // Cálculos de paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentIssues = issues.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(issues.length / itemsPerPage) || 1;

    return (
        <div className="space-y-4 font-sans text-stone-800 min-h-screen bg-stone-100 p-3 md:p-4 relative">
            {/* Cabecera Principal */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xs font-extrabold text-stone-900 uppercase">Módulo de Integración Jira (PMO)</h1>
                        <p className="text-[10px] text-stone-500">Gestión de tareas, Épicas e Historias de Usuario sincronizadas</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Botón para abrir el Modal de Scripts / TXT */}
                    <button
                        onClick={() => setShowScriptModal(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Code className="w-3.5 h-3.5" /> Ejecutar Script / Subir TXT
                    </button>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Jira API Conectada
                    </span>
                    <Link href="/dashboard" className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition">
                        ← Dashboard
                    </Link>
                </div>
            </div>

            {/* Mensajes Globales */}
            {errorMsg && !showScriptModal && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
            )}

            {successMsg && !showScriptModal && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Formulario Izquierdo */}
                <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
                    <h2 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2 flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-sky-600" /> Nuevo Requerimiento / Tarea
                    </h2>

                    <form onSubmit={handleCreate} className="space-y-2.5 text-xs">
                        <div>
                            <label className="block font-bold text-stone-700 mb-0.5">Tipo de Elemento</label>
                            <select
                                value={issuetype}
                                onChange={(e) => handleIssuetypeChange(e.target.value)}
                                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer text-xs"
                            >
                                <option value="Epic">Épica (Epic)</option>
                                <option value="Story">Historia de Usuario (Story)</option>
                                <option value="Task">Tarea (Task)</option>
                                <option value="Subtask">Subtarea (Subtask)</option>
                                <option value="Bug">Error (Bug)</option>
                            </select>
                        </div>

                        {issuetype !== 'Epic' && (
                            <div>
                                <label className="block font-bold text-stone-700 mb-0.5">
                                    Elemento Padre <span className="text-sky-700 font-medium text-[10px]">({issuetype === 'Story' ? 'Debe pertenecer a una Épica' : 'Debe pertenecer a una HU o Épica'})</span>
                                </label>
                                <select
                                    value={parentKey}
                                    onChange={(e) => setParentKey(e.target.value)}
                                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer text-xs"
                                    required
                                >
                                    <option value="">-- Seleccionar elemento padre --</option>
                                    {filteredParents.map((i) => (
                                        <option key={i.key} value={i.key}>
                                            [{i.key}] {i.issuetype}: {i.summary}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block font-bold text-stone-700 mb-0.5">Título / Resumen</label>
                            <input
                                type="text"
                                placeholder="Ej: Implementar pasarela de pago..."
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-stone-700 mb-0.5">Descripción Detallada</label>
                            <textarea
                                rows={2}
                                placeholder="Detalles técnicos..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none text-xs"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-xs"
                        >
                            {submitting ? 'Sincronizando...' : 'Crear Ticket en Jira'}
                        </button>
                    </form>
                </div>

                {/* Historial Derecho */}
                <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <h2 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-sky-600" /> Historial de Tareas ({issues.length})
                        </h2>
                        <button
                            onClick={fetchTickets}
                            className="text-xs font-bold text-sky-700 hover:underline cursor-pointer"
                        >
                            Actualizar Lista
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-6 text-stone-400 text-xs">Cargando tickets...</div>
                    ) : issues.length === 0 ? (
                        <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-1">
                            <p className="text-xs font-bold text-stone-600 uppercase">No hay tickets registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {currentIssues.map((t: any) => (
                                <div key={t.id || t.key} className="p-2 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3 hover:border-sky-300 transition">
                                    <div className="min-w-0 flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 font-extrabold text-[10px] rounded-md shrink-0">
                                            {t.key}
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-bold text-stone-900 truncate">{t.summary}</h3>
                                            <p className="text-[10px] text-stone-500 flex items-center gap-1.5 flex-wrap">
                                                <span>Tipo: <strong className="text-stone-700">{t.issuetype}</strong></span>
                                                {t.parentKey && (
                                                    <span className="flex items-center gap-0.5 text-indigo-700 font-medium bg-indigo-50 px-1 py-0.2 rounded">
                                                        <GitCommit className="w-3 h-3" /> Padre: {t.parentKey}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-0.5 text-stone-600 font-medium bg-stone-200/60 px-1.5 py-0.2 rounded">
                                                    <User className="w-3 h-3" /> {t.assignee}
                                                </span>
                                                <span>· {t.created}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md shrink-0">
                                        {t.status}
                                    </span>
                                </div>
                            ))}

                            {/* Controles de Paginación */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                                    <span className="text-[11px] text-stone-500 font-medium">
                                        Página <strong className="text-stone-800">{currentPage}</strong> de <strong className="text-stone-800">{totalPages}</strong>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded-lg text-stone-700 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded-lg text-stone-700 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                                        >
                                            Siguiente <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE EJECUCIÓN DE SCRIPT / SUBIR TXT */}
            {showScriptModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Cabecera del Modal */}
                        <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Code className="w-5 h-5 text-sky-400" />
                                <h3 className="text-xs font-extrabold uppercase tracking-wider">Ejecutor Masivo de Scripts / Archivos TXT</h3>
                            </div>
                            <button
                                onClick={() => setShowScriptModal(false)}
                                className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-4 space-y-3 overflow-y-auto text-xs flex-1">
                            {errorMsg && (
                                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                                <div>
                                    <h4 className="font-bold text-stone-800">1. Subir archivo de script (.txt / .json)</h4>
                                    <p className="text-[10px] text-stone-500">Selecciona un archivo local con el arreglo de tickets.</p>
                                </div>
                                <label className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition text-xs">
                                    <Upload className="w-3.5 h-3.5 text-stone-600" /> Cargar Archivo
                                    <input type="file" accept=".txt,.json" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="font-bold text-stone-700">2. O pega / edita el código JSON del script aquí:</label>
                                    <button
                                        type="button"
                                        onClick={loadSampleScript}
                                        className="text-[11px] text-sky-700 font-bold hover:underline cursor-pointer"
                                    >
                                        Cargar plantilla de ejemplo
                                    </button>
                                </div>
                                <textarea
                                    rows={10}
                                    value={scriptContent}
                                    onChange={(e) => setScriptContent(e.target.value)}
                                    placeholder='[\n  {\n    "issuetype": "Epic",\n    "summary": "Nombre de la Épica",\n    "description": "..."\n  }\n]'
                                    className="w-full p-3 font-mono text-[11px] bg-stone-900 text-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Pie del Modal */}
                        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowScriptModal(false)}
                                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition cursor-pointer text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExecuteScript}
                                disabled={executingScript}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
                            >
                                <Code className="w-4 h-4" /> {executingScript ? 'Ejecutando...' : 'Ejecutar Script en Jira'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}