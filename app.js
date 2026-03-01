document.addEventListener('DOMContentLoaded', () => {
    const entrada = document.getElementById('texto-entrada');
    const hashEsperadoInput = document.getElementById('hash-esperado');
    const mostrarTodosCheck = document.getElementById('mostrar-todos');
    const monitor = document.getElementById('monitor-resultados');
    const contador = document.getElementById('contador-resultados');

    let resultadosCompletos = [];

    async function procesarEntrada() {
        const texto = entrada.value.trim();

        if (texto === '') {
            monitor.innerHTML = 'Esperando flujo de datos...';
            contador.textContent = '0 resultados procesados';
            return;
        }

        monitor.innerHTML = '<span style="color: var(--accent);">Analizando firmas y heurística...</span>';

        resultadosCompletos = await MotorCifrado.autoDescubrir(texto);
        aplicarFiltros();
    }

    function aplicarFiltros() {
        const hashEsperado = hashEsperadoInput.value.trim().toLowerCase();
        const mostrarTodos = mostrarTodosCheck.checked;

        let resultados = resultadosCompletos;

        if (hashEsperado !== '') {
            resultados = resultados.filter(res => res.sha256.toLowerCase().includes(hashEsperado));
        }

        if (!mostrarTodos && hashEsperado === '') {
            resultados = resultados.slice(0, 15);
        } else if (!mostrarTodos && hashEsperado !== '') {
            if (resultados.length > 20) resultados = resultados.slice(0, 20);
        }

        renderizarResultados(resultados, hashEsperado);
    }

    function renderizarResultados(resultados, hashFiltro) {
        contador.textContent = `${resultados.length} resultados mostrados`;
        
        if (resultados.length === 0) {
            monitor.innerHTML = '<div style="color: #ff5555; padding: 10px; border: 1px solid #ff5555; border-radius: 4px;">No se encontraron coincidencias. Revisa la entrada.</div>';
            return;
        }

        let htmlSalida = '';
        for (const res of resultados) {
            const coincide = hashFiltro !== '' && res.sha256.toLowerCase().includes(hashFiltro);
            
            // Clasificación heurística
            let claseConfianza = 'confianza-baja';
            let badge = '<span class="badge badge-baja">❌ Ruido</span>';
            
            if (res.puntuacion >= 25) {
                claseConfianza = 'confianza-alta';
                badge = '<span class="badge badge-alta">🔥 Alta Probabilidad</span>';
            } else if (res.puntuacion >= 15) {
                claseConfianza = 'confianza-media';
                badge = '<span class="badge badge-media">⚠️ Posible</span>';
            }

            if (coincide) claseConfianza += ' coincide';

            htmlSalida += `
                <div class="resultado-item ${claseConfianza}">
                    <div class="resultado-header">
                        <div>
                            <strong>${res.metodo}</strong>
                            <span style="font-size: 0.7rem; color: #888; margin-left: 10px;">Score: ${res.puntuacion.toFixed(1)}</span>
                        </div>
                        <div>
                            ${coincide ? '<span class="badge badge-coincide">✓ HASH EXACTO</span>' : ''}
                            ${badge}
                        </div>
                    </div>
                    <div class="resultado-texto">${escapeHtml(res.texto)}</div>
                    <div class="resultado-sha">
                        <span><strong>SHA-256:</strong> ${res.sha256}</span>
                        <button class="btn-copiar" data-copy="${encodeURIComponent(res.texto)}">Copiar texto</button>
                    </div>
                </div>
            `;
        }

        monitor.innerHTML = htmlSalida;

        document.querySelectorAll('.btn-copiar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Decodificamos el payload exacto al recuperar del DOM
                const texto = decodeURIComponent(e.target.getAttribute('data-copy'));
                navigator.clipboard.writeText(texto).then(() => {
                    const original = e.target.textContent;
                    e.target.textContent = '¡Copiado!';
                    e.target.style.background = '#00ff88';
                    e.target.style.color = '#000';
                    setTimeout(() => { 
                        e.target.textContent = original;
                        e.target.style.background = '';
                        e.target.style.color = '';
                    }, 1500);
                });
            });
        });
    }

    // Aún usamos escapeHtml para el div que MUESTRA el texto en pantalla, ya que ahí sí queremos que el navegador lo renderice seguro
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

    entrada.addEventListener('input', procesarEntrada);
    entrada.addEventListener('change', procesarEntrada);
    hashEsperadoInput.addEventListener('input', () => aplicarFiltros());
    mostrarTodosCheck.addEventListener('change', () => aplicarFiltros());

    procesarEntrada();
});
