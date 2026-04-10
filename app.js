document.addEventListener('DOMContentLoaded', () => {
  const inputRelampago = document.getElementById('input-relampago');
  const outputRelampago = document.getElementById('output-relampago');
  const quickStatus = document.getElementById('quick-status');

  // Función de Decodificación Relámpago
  inputRelampago.addEventListener('input', async () => {
    const texto = inputRelampago.value.trim();
    if (!texto) {
      outputRelampago.value = "";
      quickStatus.textContent = "Esperando cadena...";
      quickStatus.dataset.state = "neutral";
      return;
    }

    try {
      // Usamos el motor heurístico para encontrar la mejor opción
      const posibilidades = await MotorCifrado.autoDescubrir(texto);
      
      if (posibilidades.length > 0) {
        const mejor = posibilidades[0];
        outputRelampago.value = mejor.texto;
        quickStatus.textContent = `Detectado: ${mejor.metodo}`;
        quickStatus.dataset.state = "ok";
      } else {
        outputRelampago.value = "No se encontró un patrón claro.";
        quickStatus.textContent = "Análisis fallido";
        quickStatus.dataset.state = "error";
      }
    } catch (e) {
      outputRelampago.value = "Error en el procesamiento.";
      quickStatus.dataset.state = "error";
    }
  });

  // Mantener el resto de tu lógica original
  document.getElementById('btn-generar-rsa')?.addEventListener('click', async () => {
    const claves = await MotorCifrado.generarLlavesRSA();
    document.getElementById('rsa-privada').value = claves.privada;
    alert("Par de llaves RSA generado.");
  });

  // ... (aquí irían los demás listeners que ya tenías)
});
