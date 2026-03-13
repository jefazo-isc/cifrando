document.addEventListener('DOMContentLoaded', () => {
    // Fase Entrada
    const archivoEntrada = document.getElementById('archivo-entrada');
    const entrada = document.getElementById('texto-entrada');
    const hashEsperadoInput = document.getElementById('hash-esperado');
    const estadoIntegridad = document.getElementById('estado-integridad');
    
    // Fase AES
    const aesPassword = document.getElementById('aes-password');
    const btnDescifrarAes = document.getElementById('btn-descifrar-aes');

    // Fase Heurística
    const mostrarTodosCheck = document.getElementById('mostrar-todos');
    const monitor = document.getElementById('monitor-resultados');
    const contador = document.getElementById('contador-resultados');

    // Fase RSA
    const btnGenerarRsa = document.getElementById('btn-generar-rsa');
    const rsaPrivada = document.getElementById('rsa-privada');
    const rsaPublica = document.getElementById('rsa-publica');
    const usarRsaCheck = document.getElementById('usar-rsa');

    // Fase Salida
    const textoBaseSalida = document.getElementById('texto-base-salida');
    const metodoSalida = document.getElementById('metodo-salida');
    const contenedorClaveSalida = document.getElementById('contenedor-clave-salida');
    const claveSalida = document.getElementById('clave-salida');
    const payloadFinal = document.getElementById('payload-final');
    const hashFinal = document.getElementById('hash-final');
    const btnCopiarFinal = document.getElementById('btn-copiar-final');
    const btnDescargarFinal = document.getElementById('btn-descargar-final');

    let resultadosCompletos = [];
    let hashCalculadoBase = '';

    // EVENTOS RSA
    btnGenerarRsa.addEventListener('click', async () => {
        const claves = await MotorCifrado.generarLlavesRSA();
        rsaPrivada.value = claves.privada;
        rsaPublica.value = claves.publica;
        btnFeedback(btnGenerarRsa, "¡Llaves Generadas!");
        actualizarSalidaFinal();
    });

    usarRsaCheck.addEventListener('change', actualizarSalidaFinal);
    rsaPrivada.addEventListener('input', actualizarSalidaFinal);

    // EVENTOS AES
    btnDescifrarAes.addEventListener('click', () => {
        const pass = aesPassword.value.trim();
        const texto = entrada.value.trim();
        if (!pass || !texto) {
            alert("Requiere un payload cifrado y la clave simétrica.");
            return;
        }
        try {
            const decodificado = MotorCifrado.descifrarAES(texto, pass);
            textoBaseSalida.value = decodificado;
            btnFeedback(btnDescifrarAes, "¡Descifrado Exitoso!");
            actualizarSalidaFinal();
            document.getElementById('modulo-salida').scrollIntoView({ behavior: 'smooth' });
        } catch (e) {
            alert(e.message);
        }
    });

    // LECTURA DE ARCHIVO (PROTECCIÓN CONTRA BINARIOS)
    archivoEntrada.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evento) => {
            const buffer = evento.target.result;
            const bytes = new Uint8Array(buffer);
            
            let esTexto = true;
            for(let i = 0; i < Math.min(bytes.length, 500); i++) {
                if(bytes[i] === 0 || (bytes[i] < 32 && bytes[i] !== 9 && bytes[i] !== 10 && bytes[i] !== 13)) {
                    esTexto = false;
                    break;
                }
            }

            let contenido = "";
            if (esTexto) {
                contenido = new TextDecoder('utf-8').decode(bytes);
            } else {
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                contenido = btoa(binary);
            }

            entrada.value = contenido;
            hashCalculadoBase = await MotorCifrado.generarSHA256(contenido);
            archivoEntrada.lastTextRead = contenido;
            verificarIntegridad();
            procesarEntrada();
        };
        reader.readAsArrayBuffer(file);
    });

    async function verificarIntegridad() {
        const texto = entrada.value;
        if (texto === '') {
            estadoIntegridad.className = 'estado-integridad neutro';
            estadoIntegridad.textContent = 'Esperando flujo de datos...';
            return;
        }

        if (!hashCalculadoBase || texto !== archivoEntrada.lastTextRead) {
            hashCalculadoBase = await MotorCifrado.generarSHA256(texto);
            archivoEntrada.lastTextRead = texto;
        }

        const esperado = hashEsperadoInput.value.trim().toLowerCase();
        
        if (esperado === '') {
            estadoIntegridad.className = 'estado-integridad neutro';
            estadoIntegridad.innerHTML = `<strong>Hash SHA-256:</strong> ${hashCalculadoBase}`;
        } else if (esperado === hashCalculadoBase) {
            estadoIntegridad.className = 'estado-integridad valido';
            estadoIntegridad.innerHTML = `<strong>✓ INTEGRIDAD VERIFICADA:</strong> El hash coincide con el esperado.`;
        } else {
            estadoIntegridad.className = 'estado-integridad invalido';
            estadoIntegridad.innerHTML = `<strong>❌ ALERTA DE CORRUPCIÓN:</strong> El hash calculado (${hashCalculadoBase}) difiere.`;
        }
    }

    async function procesarEntrada() {
        const texto = entrada.value.trim();
        verificarIntegridad();

        if (texto === '') {
            monitor.innerHTML = '<div class="mensaje-espera">El análisis heurístico se mostrará aquí.</div>';
            contador.textContent = '0 resultados procesados';
            resultadosCompletos = [];
            return;
        }

        monitor.innerHTML = '<span style="color: var(--primary); font-weight: bold; padding: 20px; display: block;">Ejecutando motores de análisis heurístico...</span>';
        resultadosCompletos = await MotorCifrado.autoDescubrir(texto);
        aplicarFiltros();
    }

    function aplicarFiltros() {
        const mostrarTodos = mostrarTodosCheck.checked;
        let resultados = resultadosCompletos;
        if (!mostrarTodos) resultados = resultados.slice(0, 15);
        renderizarResultados(resultados);
    }

    function renderizarResultados(resultados) {
        contador.textContent = `${resultados.length} iteraciones procesadas`;
        
        if (resultados.length === 0) {
            monitor.innerHTML = '<div style="color: var(--danger); padding: 15px; border: 1px solid var(--danger); border-radius: 6px; background: var(--danger-bg);">No se encontraron patrones clásicos reconocibles. Considera el uso del Módulo Simétrico.</div>';
            return;
        }

        let htmlSalida = '';
        for (let i = 0; i < resultados.length; i++) {
            const res = resultados[i];
            let claseConfianza = 'confianza-baja';
            let badge = '<span class="badge badge-baja">Ruido Estocástico</span>';
            
            if (res.puntuacion >= 25) {
                claseConfianza = 'confianza-alta';
                badge = '<span class="badge badge-alta">Alta Confianza</span>';
            } else if (res.puntuacion >= 15) {
                claseConfianza = 'confianza-media';
                badge = '<span class="badge badge-media">Confianza Media</span>';
            }

            htmlSalida += `
                <div class="resultado-item ${claseConfianza}">
                    <div class="resultado-header">
                        <div>
                            <strong>${res.metodo}</strong>
                            <span style="font-size: 0.7rem; color: #888; margin-left: 10px;">Score Heurístico: ${res.puntuacion.toFixed(1)}</span>
                        </div>
                        <div>${badge}</div>
                    </div>
                    <div class="resultado-texto" id="res-txt-${i}">${escapeHtml(res.texto)}</div>
                    <div class="resultado-sha">
                        <span><strong>SHA-256:</strong> ${res.sha256}</span>
                        <div>
                            <button class="btn-accion-chico btn-copiar" data-copy="${escapeHtml(res.texto)}">Copiar</button>
                            <button class="btn-accion-chico btn-usar" data-idx="${i}" style="background: var(--success); margin-left: 5px;">Enviar al Editor</button>
                        </div>
                    </div>
                </div>
            `;
        }

        monitor.innerHTML = htmlSalida;

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
                btnFeedback(e.target, '¡Cargado!');
                actualizarSalidaFinal();
                document.getElementById('modulo-salida').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    async function actualizarSalidaFinal() {
        let textoCompleto = textoBaseSalida.value;
        if (!textoCompleto) {
            payloadFinal.value = '';
            hashFinal.textContent = '-';
            return;
        }

        if (usarRsaCheck.checked) {
            const pem = rsaPrivada.value.trim();
            if (!pem.includes('BEGIN PRIVATE KEY')) {
                payloadFinal.value = 'ERROR: Se requiere una llave privada RSA válida (PEM) en el Módulo Asimétrico.';
                return;
            }
            try {
                const firmaCriptografica = await MotorCifrado.firmarMensajeRSA(textoCompleto, pem);
                textoCompleto += `\n\n-----BEGIN RSA SIGNATURE-----\n${firmaCriptografica}\n-----END RSA SIGNATURE-----`;
            } catch (error) {
                payloadFinal.value = 'ERROR en RSA: Llave privada corrupta o formato incompatible.';
                return;
            }
        }

        const metodo = metodoSalida.value;
        const clave = claveSalida.value;

        try {
            const resultado = await MotorCifrado.cifrarSalida(textoCompleto, metodo, clave);
            payloadFinal.value = resultado.cifrado;
            hashFinal.textContent = resultado.hash;
        } catch (e) {
            payloadFinal.value = 'Error de procesamiento: ' + e.message;
            hashFinal.textContent = '-';
        }
    }

    function btnFeedback(target, msg = '¡Listo!') {
        const original = target.textContent;
        const originalBg = target.style.background;
        target.textContent = msg;
        target.style.background = '#16a34a';
        target.style.color = '#fff';
        setTimeout(() => { 
            target.textContent = original;
            target.style.background = originalBg;
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

    // Listeners
    entrada.addEventListener('input', procesarEntrada);
    hashEsperadoInput.addEventListener('input', verificarIntegridad);
    mostrarTodosCheck.addEventListener('change', () => aplicarFiltros());
    
    textoBaseSalida.addEventListener('input', actualizarSalidaFinal);
    
    metodoSalida.addEventListener('change', () => {
        const v = metodoSalida.value;
        if (['AES', 'TripleDES', 'Rabbit', 'RC4', 'Cesar', 'XOR'].includes(v)) {
            contenedorClaveSalida.style.display = 'block';
        } else {
            contenedorClaveSalida.style.display = 'none';
        }
        actualizarSalidaFinal();
    });
    
    claveSalida.addEventListener('input', actualizarSalidaFinal);

    btnCopiarFinal.addEventListener('click', () => {
        if (payloadFinal.value) {
            navigator.clipboard.writeText(payloadFinal.value).then(() => btnFeedback(btnCopiarFinal));
        }
    });

    btnDescargarFinal.addEventListener('click', () => {
        if (!payloadFinal.value) return;
        const blob = new Blob([payloadFinal.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documento_cifrado_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        btnFeedback(btnDescargarFinal, '¡Exportado!');
    });

    procesarEntrada();
});
