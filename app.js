document.addEventListener('DOMContentLoaded', () => {
  const archivoEntrada = document.getElementById('archivo-entrada');
  const dropZone = document.getElementById('drop-zone');
  const entrada = document.getElementById('texto-entrada');
  const hashEsperadoInput = document.getElementById('hash-esperado');
  const estadoIntegridad = document.getElementById('estado-integridad');
  const btnAnalizar = document.getElementById('btn-analizar');
  const monitor = document.getElementById('monitor-resultados');
  const contador = document.getElementById('contador-resultados');
  const mostrarTodosCheck = document.getElementById('mostrar-todos');

  const aesPassword = document.getElementById('aes-password');
  const btnDescifrarAes = document.getElementById('btn-descifrar-aes');

  const btnGenerarRsa = document.getElementById('btn-generar-rsa');
  const rsaPrivada = document.getElementById('rsa-privada');
  const rsaPublica = document.getElementById('rsa-publica');
  const usarRsaCheck = document.getElementById('usar-rsa');

  const alfabetoOrigen = document.getElementById('alfabeto-origen');
  const alfabetoDestino = document.getElementById('alfabeto-destino');
  const metaOrigen = document.getElementById('meta-origen');
  const metaDestino = document.getElementById('meta-destino');
  const estadoMapeo = document.getElementById('estado-mapeo');
  const btnExtraerOrigen = document.getElementById('btn-extraer-origen');
  const btnExtraerDestino = document.getElementById('btn-extraer-destino');
  const btnIntercambiar = document.getElementById('btn-intercambiar');
  const textoSustitucionEntrada = document.getElementById('texto-sustitucion-entrada');
  const textoSustitucionSalida = document.getElementById('texto-sustitucion-salida');
  const btnDescifrarPersonalizado = document.getElementById('btn-descifrar-personalizado');
  const btnCifrarPersonalizado = document.getElementById('btn-cifrar-personalizado');
  const btnCopiarSustitucion = document.getElementById('btn-copiar-sustitucion');
  const btnEnviarEditor = document.getElementById('btn-enviar-editor');

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

  function autoResize() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  }
  document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', autoResize);
  });

  function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function setStatus(el, text, mode = 'neutral') {
    if (!el) return;
    el.textContent = text;
    el.dataset.state = mode;
  }

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function btnFeedback(target, msg = '¡Listo!') {
    if (!target) return;
    target.disabled = true;
    showToast(msg);
    setTimeout(() => {
      target.disabled = false;
    }, 1000);
  }

  async function verificarIntegridad() {
    const texto = entrada.value;
    if (!texto) {
      setStatus(estadoIntegridad, 'Esperando flujo de datos…', 'neutral');
      return;
    }

    if (!hashCalculadoBase || texto !== archivoEntrada.dataset.lastTextRead) {
      hashCalculadoBase = await MotorCifrado.generarSHA256(texto);
      archivoEntrada.dataset.lastTextRead = texto;
    }

    const esperado = hashEsperadoInput.value.trim().toLowerCase();
    if (!esperado) {
      setStatus(estadoIntegridad, `Hash SHA-256: ${hashCalculadoBase}`, 'neutral');
    } else if (esperado === hashCalculadoBase) {
      setStatus(estadoIntegridad, '✓ Integridad verificada. El hash coincide.', 'ok');
    } else {
      setStatus(estadoIntegridad, `✗ Hash distinto. Calculado: ${hashCalculadoBase}`, 'error');
    }
  }

  function renderizarResultados(resultados) {
    contador.textContent = `${resultados.length} resultados`;    
    if (!resultados.length) {
      monitor.innerHTML = '<div class="empty-state">No se encontraron patrones clásicos reconocibles. Usa el módulo de sustitución personalizada.</div>';
      return;
    }

    const html = resultados.map((res, index) => {
      let badge = 'Baja';
      let badgeClass = 'badge-low';
      if (res.puntuacion >= 25) {
        badge = 'Alta';
        badgeClass = 'badge-high';
      } else if (res.puntuacion >= 15) {
        badge = 'Media';
        badgeClass = 'badge-mid';
      }

      return `
        <article class="result-card">
          <div class="result-head">
            <div>
              <h4>${escapeHtml(res.metodo)}</h4>
              <p>Score heurístico: ${res.puntuacion.toFixed(1)}</p>
            </div>
            <span class="confidence ${badgeClass}">${badge}</span>
          </div>
          <pre>${escapeHtml(res.texto)}</pre>
          <div class="result-foot">
            <small>SHA-256: ${res.sha256}</small>
            <div class="row-actions">
              <button class="btn-tertiary btn-copiar" data-copy="${encodeURIComponent(res.texto)}">Copiar</button>
              <button class="btn-tertiary btn-usar" data-idx="${index}">Enviar al editor</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    monitor.innerHTML = html;

    monitor.querySelectorAll('.btn-copiar').forEach(btn => {
      btn.addEventListener('click', async e => {
        const texto = decodeURIComponent(e.currentTarget.getAttribute('data-copy'));
        await navigator.clipboard.writeText(texto);
        btnFeedback(e.currentTarget, 'Texto copiado al portapapeles');
      });
    });

    monitor.querySelectorAll('.btn-usar').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = Number(e.currentTarget.getAttribute('data-idx'));
        textoBaseSalida.value = resultados[idx].texto;
        autoResize.call(textoBaseSalida);
        actualizarSalidaFinal();
        btnFeedback(e.currentTarget, 'Payload enviado al editor');
      });
    });
  }

  function aplicarFiltros() {
    const mostrarTodos = mostrarTodosCheck.checked;
    const resultados = mostrarTodos ? resultadosCompletos : resultadosCompletos.slice(0, 15);
    renderizarResultados(resultados);
  }

  async function procesarEntrada() {
    await verificarIntegridad();
    const texto = entrada.value.trim();
    if (!texto) {
      monitor.innerHTML = '<div class="empty-state">El análisis heurístico se mostrará aquí.</div>';
      contador.textContent = '0 resultados';
      resultadosCompletos = [];
      return;
    }

    monitor.innerHTML = '<div class="empty-state">Analizando patrones clásicos…</div>';
    resultadosCompletos = await MotorCifrado.autoDescubrir(texto);
    aplicarFiltros();
  }


document.addEventListener('DOMContentLoaded', () => {
  const entrada = document.getElementById('texto-entrada');
  const alfabetoOrigen = document.getElementById('alfabeto-origen');
  const alfabetoDestino = document.getElementById('alfabeto-destino');
  const estadoMapeo = document.getElementById('estado-mapeo');
  const textoSustitucionEntrada = document.getElementById('texto-sustitucion-entrada');
  const textoSustitucionSalida = document.getElementById('texto-sustitucion-salida');
  const btnDescifrarPersonalizado = document.getElementById('btn-descifrar-personalizado');
  
  // Elementos de UI para mostrar info
  const metaOrigen = document.getElementById('meta-origen');
  const metaDestino = document.getElementById('meta-destino');

  function autoResize() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  }
  document.querySelectorAll('textarea').forEach(ta => ta.addEventListener('input', autoResize));

  function setStatus(el, text, mode = 'neutral') {
    if (!el) return;
    el.textContent = text;
    el.dataset.state = mode;
  }

  // --- NUEVA LÓGICA DE CRIPTOANÁLISIS ---

  function rotarAlfabeto(alfabeto, k) {
    const arr = alfabeto.split('');
    const n = arr.length;
    const shift = ((k % n) + n) % n;
    const rotado = [...arr.slice(shift), ...arr.slice(0, shift)];
    return rotado.join('');
  }

  function crackearCesarPersonalizado(texto, cadenaMaestra) {
    let mejorTexto = "";
    let mejorScore = -1000;
    let mejorOrigen = "";
    let mejorK = 0;

    // Probamos todas las rotaciones posibles (0 a 130)
    for (let k = 0; k < cadenaMaestra.length; k++) {
      const origenPrueba = rotarAlfabeto(cadenaMaestra, k);
      const intento = MotorCifrado.descifrarSustitucionPersonalizada(texto, origenPrueba, cadenaMaestra);
      
      // Usamos la función de puntuar de tu cipher.js
      const score = MotorCifrado.autoDescubrir ? (intento.split(' ').length * 2) : 0; 
      
      // Heurística simple: contar vocales y espacios (común en español)
      let currentScore = (intento.match(/[aeiouáéíóú ]/gi) || []).length;
      
      if (currentScore > mejorScore) {
        mejorScore = currentScore;
        mejorTexto = intento;
        mejorOrigen = origenPrueba;
        mejorK = k;
      }
    }
    return { mejorTexto, mejorOrigen, mejorK };
  }

  function ejecutarSustitucion(tipo) {
    const texto = textoSustitucionEntrada.value.trim();
    if (!texto) return;

    let destino = alfabetoDestino.value.trim();
    let origen = alfabetoOrigen.value.trim();

    // Si el usuario no puso origen, usamos el CRACKER
    if (!origen && destino) {
      const cleanDestino = MotorCifrado.extraerAlfabetoUnico(destino);
      const resultado = crackearCesarPersonalizado(texto, cleanDestino);
      
      alfabetoOrigen.value = resultado.mejorOrigen;
      textoSustitucionSalida.value = `[AUTO-CRACK K=${resultado.mejorK}]\n${resultado.mejorTexto}`;
      autoResize.call(alfabetoOrigen);
      autoResize.call(textoSustitucionSalida);
      setStatus(estadoMapeo, `¡Código roto! Desplazamiento K=${resultado.mejorK} detectado.`, 'ok');
      return;
    }

    // Flujo normal si ya hay alfabetos
    try {
      const salida = tipo === 'decode'
        ? MotorCifrado.descifrarSustitucionPersonalizada(texto, origen, destino)
        : MotorCifrado.cifrarSustitucionPersonalizada(texto, origen, destino);
      textoSustitucionSalida.value = salida;
      autoResize.call(textoSustitucionSalida);
    } catch (e) {
      textoSustitucionSalida.value = "Error: " + e.message;
    }
  }

  // Listener para el botón
  btnDescifrarPersonalizado.addEventListener('click', () => ejecutarSustitucion('decode'));
  
  // El resto de tus listeners de app.js se mantienen igual...
  // (Copiar aquí el resto de tu app.js original para no perder las firmas RSA y AES)
});


  
  function actualizarEstadoMapeo() {
    const origen = alfabetoOrigen.value;
    const destino = alfabetoDestino.value;
    metaOrigen.textContent = `${origen.length} caracteres`;
    metaDestino.textContent = `${destino.length} caracteres`;

    const estado = MotorCifrado.validarAlfabetos(origen, destino);
    if (!origen && !destino) {
      setStatus(estadoMapeo, 'Pega o extrae los alfabetos para habilitar el traductor.', 'neutral');
      return false;
    }

    if (!origen && destino) {
      setStatus(estadoMapeo, 'Origen en blanco. El sistema intentará adivinarlo por ordenamiento Unicode.', 'warning');
      return true; // Permitimos avanzar para que el auto-adivinador entre en acción
    }

    if (estado.ok) {
      setStatus(estadoMapeo, `Mapeo válido: ${estado.longitudOrigen} símbolos únicos por lado.`, 'ok');
      return true;
    }

    if (estado.duplicadosOrigen || estado.duplicadosDestino) {
      setStatus(estadoMapeo, 'Hay caracteres repetidos. Cada símbolo debe aparecer una sola vez en cada alfabeto.', 'error');
      return false;
    }

    setStatus(estadoMapeo, `Longitudes distintas: origen ${estado.longitudOrigen}, destino ${estado.longitudDestino}.`, 'error');
    return false;
  }

  function cargarExtraido(inputFuente, inputDestino) {
    inputDestino.value = MotorCifrado.extraerAlfabetoUnico(inputFuente.value);
    autoResize.call(inputDestino);
    actualizarEstadoMapeo();
  }

  // Lógica para descifrar en bloque (múltiples cadenas/textos)
  function procesarSustitucionMasiva(textoBloque, alfabetoBase, tipo) {
    let resultados = [];
    const bloquesCadena = textoBloque.split(/(?=Cadena\s*\d+)/i);
    
    bloquesCadena.forEach(bloque => {
      if (!bloque.trim()) return;
      
      const matchCadena = bloque.match(/^(Cadena\s*\d+)/i);
      const nombreCadena = matchCadena ? matchCadena[1] : 'Desconocida';
      let resto = bloque.replace(/^(Cadena\s*\d+)/i, '').trim();
      const matchTexto = resto.match(/(?:^|\n)texto:\s*([\s\S]*)/i);
      
      let alfabetoDestino = resto;
      let textoPayload = '';
      
      if (matchTexto) {
          alfabetoDestino = resto.substring(0, matchTexto.index).trim();
          textoPayload = matchTexto[1].trim();
      }
      
      if (alfabetoDestino && textoPayload) {
          try {
            alfabetoDestino = alfabetoDestino.replace(/\r?\n/g, '').trim();
            
            // Heurística de auto-adivinar por ordenamiento Unicode si el origen viene vacío
            let baseUsada = alfabetoBase;
            if (!baseUsada) {
              baseUsada = MotorCifrado.extraerAlfabetoUnico(alfabetoDestino).split('').sort().join('');
              resultados.push(`\n[i] Alfabeto origen adivinado: ${baseUsada.substring(0, 15)}...`);
            }

            const procesado = tipo === 'decode'
              ? MotorCifrado.descifrarSustitucionPersonalizada(textoPayload, baseUsada, alfabetoDestino)
              : MotorCifrado.cifrarSustitucionPersonalizada(textoPayload, baseUsada, alfabetoDestino);
            
            resultados.push(`--- ${nombreCadena} ---`);
            resultados.push(`${procesado}\n`);
          } catch (e) {
            resultados.push(`--- ${nombreCadena} ---`);
            resultados.push(`Error: ${e.message}\n`);
          }
      } else if (alfabetoDestino && !textoPayload) {
          resultados.push(`--- ${nombreCadena} ---\n(Ignorado: Sin etiqueta de 'Texto:' para procesar)\n`);
      }
    });
    
    return resultados.join('\n');
  }

  function ejecutarSustitucion(tipo) {
    const texto = textoSustitucionEntrada.value.trim();
    if (!texto) {
      textoSustitucionSalida.value = '';
      return;
    }

    let origen = alfabetoOrigen.value;
    const destino = alfabetoDestino.value;

    // Detectar si el usuario metió un bloque entero (modo masivo)
    if (/(?:^|\n)Cadena\s*\d+/i.test(texto) && /(?:^|\n)texto:/i.test(texto)) {
      textoSustitucionSalida.value = procesarSustitucionMasiva(texto, origen, tipo);
      autoResize.call(textoSustitucionSalida);
      showToast('Procesamiento por lotes completado');
      
      // Auto-llenar el input de la UI si estaba vacío y lo adivinamos
      if (!origen) {
        const firstMatch = texto.split(/(?=Cadena\s*\d+)/i)[1];
        if (firstMatch) {
            let destText = firstMatch.replace(/^(Cadena\s*\d+)/i, '').split(/(?:^|\n)texto:/i)[0].replace(/\r?\n/g, '').trim();
            alfabetoOrigen.value = MotorCifrado.extraerAlfabetoUnico(destText).split('').sort().join('');
            actualizarEstadoMapeo();
        }
      }
      return;
    }

    // Flujo normal para una sola cadena
    if (!origen && destino) {
      origen = MotorCifrado.extraerAlfabetoUnico(destino).split('').sort().join('');
      alfabetoOrigen.value = origen;
      showToast('Alfabeto origen auto-generado por ordenamiento');
    }

    if (!actualizarEstadoMapeo()) return;

    try {
      const salida = tipo === 'decode'
        ? MotorCifrado.descifrarSustitucionPersonalizada(texto, origen, destino)
        : MotorCifrado.cifrarSustitucionPersonalizada(texto, origen, destino);

      textoSustitucionSalida.value = salida;
      autoResize.call(textoSustitucionSalida);
      showToast('Sustitución ejecutada correctamente');
    } catch (error) {
      textoSustitucionSalida.value = `Error: ${error.message}`;
      showToast('Error durante la sustitución');
    }
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
        payloadFinal.value = 'ERROR: Se requiere una llave privada RSA válida.';
        hashFinal.textContent = '-';
        return;
      }

      try {
        const firmaCriptografica = await MotorCifrado.firmarMensajeRSA(textoCompleto, pem);
        textoCompleto += `\n\n-----BEGIN RSA SIGNATURE-----\n${firmaCriptografica}\n-----END RSA SIGNATURE-----`;
      } catch (error) {
        payloadFinal.value = 'ERROR RSA: llave inválida o corrupta.';
        hashFinal.textContent = '-';
        return;
      }
    }

    const metodo = metodoSalida.value;
    const clave = claveSalida.value;

    try {
      const resultado = await MotorCifrado.cifrarSalida(textoCompleto, metodo, clave);
      payloadFinal.value = resultado.cifrado;
      hashFinal.textContent = resultado.hash;
      autoResize.call(payloadFinal);
    } catch (error) {
      payloadFinal.value = `Error de procesamiento: ${error.message}`;
      hashFinal.textContent = '-';
    }
  }

  dropZone.addEventListener('click', () => archivoEntrada.click());
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      archivoEntrada.files = e.dataTransfer.files;
      archivoEntrada.dispatchEvent(new Event('change'));
    }
  });

  btnAnalizar.addEventListener('click', procesarEntrada);
  mostrarTodosCheck.addEventListener('change', aplicarFiltros);
  entrada.addEventListener('input', verificarIntegridad);
  hashEsperadoInput.addEventListener('input', verificarIntegridad);

  archivoEntrada.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const text = String(e.target.result || '');
      entrada.value = text;
      textoSustitucionEntrada.value = text;
      
      autoResize.call(entrada);
      autoResize.call(textoSustitucionEntrada);

      archivoEntrada.dataset.lastTextRead = text;
      hashCalculadoBase = await MotorCifrado.generarSHA256(text);
      await procesarEntrada();
      showToast(`Archivo procesado: ${file.name}`);
    };
    reader.readAsText(file);
  });

  btnDescifrarAes.addEventListener('click', async () => {
    const payload = entrada.value.trim();
    const pass = aesPassword.value.trim();
    if (!payload || !pass) return;
    try {
      const decodificado = await MotorCifrado.descifrarAES(payload, pass);
      textoBaseSalida.value = decodificado;
      autoResize.call(textoBaseSalida);
      btnFeedback(btnDescifrarAes, 'Carga AES descifrada exitosamente');
      actualizarSalidaFinal();
    } catch (error) {
      showToast(error.message);
    }
  });

  btnGenerarRsa.addEventListener('click', async () => {
    const claves = await MotorCifrado.generarLlavesRSA();
    rsaPrivada.value = claves.privada;
    rsaPublica.value = claves.publica;
    autoResize.call(rsaPrivada);
    autoResize.call(rsaPublica);
    btnFeedback(btnGenerarRsa, 'Nuevo par de llaves RSA generado');
    actualizarSalidaFinal();
  });

  usarRsaCheck.addEventListener('change', actualizarSalidaFinal);
  rsaPrivada.addEventListener('input', actualizarSalidaFinal);

  [alfabetoOrigen, alfabetoDestino].forEach(el => el.addEventListener('input', actualizarEstadoMapeo));
  btnExtraerOrigen.addEventListener('click', () => cargarExtraido(textoSustitucionEntrada, alfabetoOrigen));
  btnExtraerDestino.addEventListener('click', () => cargarExtraido(textoSustitucionEntrada, alfabetoDestino));
  btnIntercambiar.addEventListener('click', () => {
    const tmp = alfabetoOrigen.value;
    alfabetoOrigen.value = alfabetoDestino.value;
    alfabetoDestino.value = tmp;
    actualizarEstadoMapeo();
    btnFeedback(btnIntercambiar, 'Alfabetos intercambiados');
  });
  
  btnDescifrarPersonalizado.addEventListener('click', () => ejecutarSustitucion('decode'));
  btnCifrarPersonalizado.addEventListener('click', () => ejecutarSustitucion('encode'));
  
  btnCopiarSustitucion.addEventListener('click', async () => {
    if (!textoSustitucionSalida.value) return;
    await navigator.clipboard.writeText(textoSustitucionSalida.value);
    btnFeedback(btnCopiarSustitucion, 'Traducción copiada al portapapeles');
  });
  
  btnEnviarEditor.addEventListener('click', () => {
    textoBaseSalida.value = textoSustitucionSalida.value;
    autoResize.call(textoBaseSalida);
    actualizarSalidaFinal();
    btnFeedback(btnEnviarEditor, 'Enviado al editor base');
  });

  textoBaseSalida.addEventListener('input', actualizarSalidaFinal);
  metodoSalida.addEventListener('change', () => {
    const v = metodoSalida.value;
    contenedorClaveSalida.hidden = !['AES', 'Cesar', 'XOR'].includes(v);
    actualizarSalidaFinal();
  });
  claveSalida.addEventListener('input', actualizarSalidaFinal);

  btnCopiarFinal.addEventListener('click', async () => {
    if (!payloadFinal.value) return;
    await navigator.clipboard.writeText(payloadFinal.value);
    btnFeedback(btnCopiarFinal, 'Payload final copiado');
  });

  btnDescargarFinal.addEventListener('click', () => {
    if (!payloadFinal.value) return;
    const blob = new Blob([payloadFinal.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contenedor_cifrado_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    btnFeedback(btnDescargarFinal, 'Descarga iniciada');
  });

  textoSustitucionEntrada.value = entrada.value;
  actualizarEstadoMapeo();
  procesarEntrada();
});
