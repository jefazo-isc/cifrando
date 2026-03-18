document.addEventListener('DOMContentLoaded', () => {
  const alfabetos = [document.getElementById('alfabeto-origen'), document.getElementById('alfabeto-destino')];
  const sustitucionEntrada = document.getElementById('texto-sustitucion-entrada');
  const sustitucionSalida = document.getElementById('texto-sustitucion-salida');
  const btnDescifrar = document.getElementById('btn-descifrar-personalizado');
  const estadoMapeo = document.getElementById('estado-mapeo');

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  async function procesarEntrada() {
    const rawInput = sustitucionEntrada.value.trim();
    if (!rawInput) return;

    // PARSER MASIVO: Busca "Cadena X" y "Texto: ..." en el bloque pegado
    if (/(?:^|\n)Cadena\s*\d+/i.test(rawInput)) {
      const bloques = rawInput.split(/(?=Cadena\s*\d+)/i);
      let resultados = [];

      bloques.forEach(bloque => {
        const matchAlfabeto = bloque.match(/Cadena\s*\d+\n+([^\n]+)/i);
        const matchTexto = bloque.match(/Texto:\s*([\s\S]+)/i);

        if (matchAlfabeto && matchTexto) {
          const cadena = matchAlfabeto[1].trim();
          const cifrado = matchTexto[1].trim();
          // Ejecuta el auto-crack por rotación
          const res = MotorCifrado.crackearCesar(cifrado, cadena);
          resultados.push(`--- DESCIFRADO AUTOMÁTICO (K=${res.k}) ---\n${res.texto}\n`);
        }
      });

      sustitucionSalida.value = resultados.join('\n');
      estadoMapeo.textContent = "Procesamiento masivo completado con éxito.";
      estadoMapeo.dataset.state = "ok";
    } else {
      // Flujo manual si el usuario provee ambos alfabetos
      const origen = alfabetos[0].value;
      const destino = alfabetos[1].value;
      if (origen && destino) {
        sustitucionSalida.value = MotorCifrado.traducirConAlfabeto(rawInput, destino, origen);
      }
    }
    autoResize(sustitucionSalida);
  }

  btnDescifrar.addEventListener('click', procesarEntrada);
  sustitucionEntrada.addEventListener('input', () => autoResize(sustitucionEntrada));

  // Botón para generar RSA (Módulo 03)
  document.getElementById('btn-generar-rsa').addEventListener('click', async () => {
    const claves = await MotorCifrado.generarLlavesRSA();
    document.getElementById('rsa-privada').value = claves.privada;
    document.getElementById('rsa-publica').value = claves.publica;
    alert("Par de llaves RSA generado.");
  });
});
