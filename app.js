document.addEventListener('DOMContentLoaded', () => {
    // Fase 1
    const archivoEntrada = document.getElementById('archivo-entrada');
    const entrada = document.getElementById('texto-entrada');
    const hashEsperadoInput = document.getElementById('hash-esperado');
    const estadoIntegridad = document.getElementById('estado-integridad');
    
    // Fase 2
    const mostrarTodosCheck = document.getElementById('mostrar-todos');
    const monitor = document.getElementById('monitor-resultados');
    const contador = document.getElementById('contador-resultados');

    // Fase 3
    const textoBaseSalida = document.getElementById('texto-base-salida');
    const firmaSalida = document.getElementById('firma-salida');
    const metodoSalida = document.getElementById('metodo-salida');
    const payloadFinal = document.getElementById('payload-final');
    const hashFinal = document.getElementById('hash-final');
    const btnCopiarFinal = document.getElementById('btn-copiar-final');

    let resultadosCompletos = [];
    let hashCalculadoFase1 = '';

    // LECTURA DE ARCHIVO
    archivoEntrada.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evento) => {
            const contenido = evento.target.result;
            entrada.value = contenido;
            hashCalculadoFase1 = await MotorCifrado.generarSHA256(contenido);
            verificarIntegridad();
            procesarEntrada();
        };
        reader.readAsText(file);
    });

    async function verificarIntegridad() {
        const texto = entrada.value;
        if (texto === '') {
            estadoIntegridad.className = 'estado-integridad neutro';
            estadoIntegridad.textContent = 'Esperando archivo o texto para verificar integridad...';
            return;
        }

        if (!hashCalculadoFase1 || entrada.value !== archivoEntrada.lastTextRead) {
            hashCalculadoFase1 = await MotorCifrado.generarSHA256(texto);
            archivoEntrada.lastTextRead = texto;
        }

        const esperado = hashEsperadoInput.value.trim().toLowerCase();
        
        if (esperado === '') {
            estadoIntegridad.className = 'estado-integridad neutro';
            estadoIntegridad.innerHTML = `<strong>Hash calculado (Sin verificar):</strong> ${hashCalculadoFase1}`;
        } else if (esperado === hashCalculadoFase1) {
            estadoIntegridad.className = 'estado-integridad valido';
            estadoIntegridad.innerHTML = `<strong>✓ INTEGRIDAD CONFIRMADA:</strong> El hash coincide exactamente.`;
        } else {
            estadoIntegridad.className = 'estado-integridad invalido';
            estadoIntegridad.innerHTML = `<strong>❌ ADVERTENCIA DE INTEGRIDAD:</strong> El hash calculado (${hashCalculadoFase1}) NO coincide con el esperado.`;
        }
    }

    async function procesarEntrada() {
        const texto = entrada.value.trim();
        verificarIntegridad();

        if (texto === '') {
            monitor.innerHTML = 'Esperando flujo de datos...';
            contador.textContent = '0 resultados procesados';
            resultadosCompletos = [];
            return;
        }

        monitor.innerHTML = '<span style="color: var(--accent);">Analizando firmas y heurística...</span>';
        resultadosCompletos = await MotorCifrado.autoDescubrir(texto);
        aplicarFiltros();
    }

    function aplicarFiltros() {
        const mostrarTodos = mostrarTodosCheck.checked;
        let resultados = resultadosCompletos;

        if (!mostrarTodos) {
            resultados = resultados.slice(0, 15);
        }

        renderizarResultados(resultados);
    }

    function renderizarResultados(resultados) {
        contador.textContent = `${resultados.length} resultados mostrados`;
        
        if (resultados.length === 0) {
            monitor.innerHTML = '<div style="color: #ff5555; padding: 10px; border: 1px solid #ff5555; border-radius: 4px;">No se encontraron coincidencias. Revisa la entrada.</div>';
            return;
        }

        let htmlSalida = '';
        for (let i = 0; i < resultados.length; i++) {
            const res = resultados[i];
            
            let claseConfianza = 'confianza-baja';
            let badge = '<span class="badge badge-baja">❌ Ruido</span>';
            
            if (res.puntuacion >= 25) {
                claseConfianza = 'confianza-alta';
                badge = '<span class="badge badge-alta">🔥 Alta Probabilidad</span>';
            } else if (res.puntuacion >= 15) {
                claseConfianza = 'confianza-media';
                badge = '<span class="badge badge-media">⚠️ Posible</span>';
            }

            htmlSalida += `
                <div class="resultado-item ${claseConfianza}">
                    <div class="resultado-header">
                        <div>
                            <strong>${res.metodo}</strong>
                            <span style="font-size: 0.7rem; color: #888; margin-left: 10px;">Score: ${res.puntuacion.toFixed(1)}</span>
                        </div>
                        <div>${badge}</div>
                    </div>
                    <div class="resultado-texto" id="res-txt-${i}">${escapeHtml(res.texto)}</div>
                    <div class="resultado-sha">
                        <span><strong>SHA-256:</strong> ${res.sha256}</span>
                        <div>
                            <button class="btn-accion btn-copiar" data-copy="${escapeHtml(res.texto)}">Copiar</button>
                            <button class="btn-accion btn-usar" data-idx="${i}" style="background: var(--secondary); border-color: var(--secondary); margin-left: 5px;">Usar para Fase 3</button>
                        </div>
                    </div>
                </div>
            `;
        }

        monitor.innerHTML = htmlSalida;

        // Listeners para botones de la Fase 2
        document.querySelectorAll('.btn-copiar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const texto = e.target.getAttribute('data-copy');
                navigator.clipboard.writeText(texto).then(() => btnFeedback(e.target));
            });
        });

        document.querySelectorAll('.btn-usar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-idx');
                textoBaseSalida.value = resultadosCompletos[idx].texto;
                btnFeedback(e.target, '¡Seleccionado!');
                actualizarSalidaFinal();
                // Scroll a la Fase 3
                document.getElementById('fase-salida').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // FASE 3 LÓGICA
    async function actualizarSalidaFinal() {
        const base = textoBaseSalida.value;
        if (!base) {
            payloadFinal.value = '';
            hashFinal.textContent = '-';
            return;
        }

        const firma = firmaSalida.value;
        const textoCompleto = base + (firma ? `\n\n${firma}` : '');
        const metodo = metodoSalida.value;

        try {
            const resultado = await MotorCifrado.cifrarSalida(textoCompleto, metodo);
            payloadFinal.value = resultado.cifrado;
            hashFinal.textContent = resultado.hash;
        } catch (e) {
            payloadFinal.value = 'Error al cifrar: ' + e.message;
            hashFinal.textContent = '-';
        }
    }

    // Utilidades
    function btnFeedback(target, msg = '¡Copiado!') {
        const original = target.textContent;
        const originalBg = target.style.background;
        target.textContent = msg;
        target.style.background = '#00ff88';
        target.style.color = '#000';
        setTimeout(() => { 
            target.textContent = original;
            target.style.background = originalBg;
            target.style.color = '';
        }, 1500);
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/[&<>"']/g, function(m) {
            if(m === '&') return '&amp;';
            if(m === '<') return '&lt;';
            if(m === '>') return '&gt;';
            if(m === '"') return '&quot;';
            if(m === "'") return '&#039;';
            return m;
        });
    }

    // Event Listeners principales
    entrada.addEventListener('input', procesarEntrada);
    hashEsperadoInput.addEventListener('input', verificarIntegridad);
    mostrarTodosCheck.addEventListener('change', () => aplicarFiltros());
    
    textoBaseSalida.addEventListener('input', actualizarSalidaFinal);
    firmaSalida.addEventListener('input', actualizarSalidaFinal);
    metodoSalida.addEventListener('change', actualizarSalidaFinal);

    btnCopiarFinal.addEventListener('click', () => {
        if (payloadFinal.value) {
            navigator.clipboard.writeText(payloadFinal.value).then(() => btnFeedback(btnCopiarFinal));
        }
    });

    procesarEntrada();
});
