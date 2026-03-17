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

  // Auto-resize de textareas
  function autoResize() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  }
  document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', autoResize);
  });

  // Sistema de Notificaciones (Toast)
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

  function ejecutarSustitucion(tipo) {
    if (!actualizarEstadoMapeo()) return;

    const texto = textoSustitucionEntrada.value;
    if (!texto) {
      textoSustitucionSalida.value = '';
      return;
    }

    try {
      const salida = tipo === 'decode'
        ? MotorCifrado.descifrarSustitucionPersonalizada(texto, alfabetoOrigen.value, alfabetoDestino.value)
        : MotorCifrado.cifrarSustitucionPersonalizada(texto, alfabetoOrigen.value, alfabetoDestino.value);

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

  // Manejo de la Zona de Drag & Drop
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
