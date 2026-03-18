const MotorCifrado = (() => {
  const COMMON_WORDS_EN = new Set([
    'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us'
  ]);

  const COMMON_WORDS_ES = new Set([
    'el','la','los','las','de','que','y','a','en','un','ser','se','no','haber','por','con','su','para','como','estar','tener','le','yo','lo','todo','pero','más','hacer','bien','ahora','cuando','poder','decir','este','sin','sobre','trabajo','vez','entre','nunca','gran','ella','ellas','ellos','nos','os','mi','tu','te','me','ya','hay','sí','asi','así','algo','nada','casa','año','día','hombre','mujer','niño','amigo','ciudad','país','vida','mundo','familia','trabajar','estudiar','programa','cifrado','seguridad','sistema'
  ]);

  const LETTER_FREQ_ES = {
    a: 0.11525, b: 0.02215, c: 0.04019, d: 0.05010, e: 0.12181, f: 0.00692,
    g: 0.01768, h: 0.00703, i: 0.06247, j: 0.00493, k: 0.00011, l: 0.04967,
    m: 0.03157, n: 0.06712, o: 0.08683, p: 0.02510, q: 0.00877, r: 0.06870,
    s: 0.07977, t: 0.04632, u: 0.03927, v: 0.01138, w: 0.00017, x: 0.00215,
    y: 0.01008, z: 0.00467
  };

  async function generarSHA256(mensaje) {
    const msgBuffer = new TextEncoder().encode(mensaje);
    const cryptoApi = globalThis.crypto?.subtle || (globalThis.require ? require('crypto').webcrypto.subtle : null);
    if (!cryptoApi) throw new Error('Crypto API no disponible');
    const hashBuffer = await cryptoApi.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function utf8FromBytes(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    }
  }

  function puntuarTexto(textoCompleto) {
    if (!textoCompleto || textoCompleto.length === 0) return 0;
    const texto = textoCompleto.substring(0, 2500);
    const lower = texto.toLowerCase();
    let puntuacion = 0;
    let letras = 0;

    for (const char of lower) {
      if (char >= 'a' && char <= 'z') {
        letras += 1;
        puntuacion += LETTER_FREQ_ES[char] || 0;
      }
    }

    if (letras > 0) puntuacion = (puntuacion / letras) * 100;

    const palabras = lower.split(/\s+/);
    for (const palabra of palabras) {
      if (COMMON_WORDS_EN.has(palabra)) puntuacion += 3;
      if (COMMON_WORDS_ES.has(palabra)) puntuacion += 5;
    }

    puntuacion += (letras / Math.max(1, texto.length)) * 20;
    return puntuacion;
  }

  const decodificadores = [
    {
      nombre: 'Base64',
      test: texto => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(texto.trim().substring(0, 100)) && texto.trim().length % 4 === 0,
      decodificar: texto => {
        const binaryString = atob(texto.trim());
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) bytes[i] = binaryString.charCodeAt(i);
        return utf8FromBytes(bytes);
      }
    },
    {
      nombre: 'Hexadecimal',
      test: texto => {
        const limpio = texto.substring(0, 100).replace(/\s+/g, '');
        return /^[0-9A-Fa-f]+$/.test(limpio) && texto.replace(/\s+/g, '').length % 2 === 0;
      },
      decodificar: texto => {
        const limpio = texto.replace(/\s+/g, '');
        const bytes = new Uint8Array(limpio.length / 2);
        for (let n = 0; n < limpio.length; n += 2) bytes[n / 2] = parseInt(limpio.substring(n, n + 2), 16);
        return utf8FromBytes(bytes);
      }
    },
    {
      nombre: 'Binario (8 bits)',
      test: texto => {
        const limpio = texto.substring(0, 80).replace(/\s+/g, '');
        return /^[01]+$/.test(limpio) && texto.replace(/\s+/g, '').length % 8 === 0;
      },
      decodificar: texto => {
        const limpio = texto.replace(/\s+/g, '');
        const bytes = new Uint8Array(limpio.length / 8);
        for (let n = 0; n < limpio.length; n += 8) bytes[n / 8] = parseInt(limpio.substr(n, 8), 2);
        return utf8FromBytes(bytes);
      }
    },
    { nombre: 'Reverso', test: () => true, decodificar: texto => texto.split('').reverse().join('') },
    {
      nombre: 'ROT13',
      test: () => true,
      decodificar: texto => texto.replace(/[A-Za-z]/g, c => String.fromCharCode((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26 + (c <= 'Z' ? 65 : 97)))
    },
    {
      nombre: 'Atbash',
      test: () => true,
      decodificar: texto => texto.replace(/[A-Za-z]/g, c => String.fromCharCode((c >= 'A' && c <= 'Z') ? 155 - c.charCodeAt(0) : 219 - c.charCodeAt(0)))
    }
  ];

  function cesarImprimible(texto, desplazamiento) {
    let res = '';
    for (let i = 0; i < texto.length; i += 1) {
      const code = texto.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        let nuevo = code - desplazamiento;
        if (nuevo < 32) nuevo += 95;
        res += String.fromCharCode(nuevo);
      } else {
        res += texto[i];
      }
    }
    return res;
  }

// ... (mismo inicio de app.js)

  function actualizarEstadoMapeo() {
    const origen = alfabetoOrigen.value;
    const destino = alfabetoDestino.value;
    metaOrigen.textContent = `${origen.length} caracteres`;
    metaDestino.textContent = `${destino.length} caracteres`;

    if (!origen && destino) {
      setStatus(estadoMapeo, 'Origen vacío: Se usará reconstrucción Unicode automática.', 'warning');
      return true;
    }

    const estado = MotorCifrado.validarAlfabetos(origen, destino);
    if (!origen && !destino) {
      setStatus(estadoMapeo, 'Configura los alfabetos.', 'neutral');
      return false;
    }

    if (estado.ok) {
      setStatus(estadoMapeo, `Mapeo válido: ${estado.longitudOrigen} símbolos únicos.`, 'ok');
      return true;
    }

    setStatus(estadoMapeo, `Error: ${estado.duplicadosOrigen ? 'Duplicados' : 'Longitudes distintas'}.`, 'error');
    return false;
  }

  function ejecutarSustitucion(tipo) {
    const texto = textoSustitucionEntrada.value.trim();
    if (!texto) return;

    let origen = alfabetoOrigen.value;
    let destino = alfabetoDestino.value;

    // RECONSTRUCCIÓN AUTOMÁTICA SI ORIGEN ESTÁ VACÍO
    if (!origen && destino) {
      // Extraemos los caracteres únicos de la cadena del profe y los ordenamos por código Unicode
      origen = MotorCifrado.extraerAlfabetoUnico(destino).split('').sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join('');
      alfabetoOrigen.value = origen; // Lo mostramos en la caja para que el usuario vea el 'molde'
      autoResize.call(alfabetoOrigen);
    }

    if (!actualizarEstadoMapeo()) return;

    try {
      // Si detecta bloque masivo (Cadena 1, Cadena 2...)
      if (/(?:^|\n)Cadena\s*\d+/i.test(texto)) {
        textoSustitucionSalida.value = procesarSustitucionMasiva(texto, origen, tipo);
      } else {
        const salida = tipo === 'decode'
          ? MotorCifrado.descifrarSustitucionPersonalizada(texto, origen, destino)
          : MotorCifrado.cifrarSustitucionPersonalizada(texto, origen, destino);
        textoSustitucionSalida.value = salida;
      }
      autoResize.call(textoSustitucionSalida);
      showToast('Operación completada');
    } catch (error) {
      textoSustitucionSalida.value = `Error: ${error.message}`;
    }
  }

// ... (resto del archivo app.js se mantiene igual)

  
  function cifrarCesar(texto, desplazamiento) {
    let res = '';
    let shift = Number.isFinite(Number(desplazamiento)) ? Number(desplazamiento) : 0;
    shift = ((shift % 95) + 95) % 95;
    for (let i = 0; i < texto.length; i += 1) {
      const code = texto.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        let nuevo = code + shift;
        if (nuevo > 126) nuevo -= 95;
        res += String.fromCharCode(nuevo);
      } else {
        res += texto[i];
      }
    }
    return res;
  }

  function xorUnByte(texto, clave) {
    let res = '';
    const key = parseInt(clave, 10) || 0;
    for (let i = 0; i < texto.length; i += 1) res += String.fromCharCode(texto.charCodeAt(i) ^ key);
    return res;
  }

  async function autoDescubrir(texto) {
    const resultados = [];

    for (const dec of decodificadores) {
      try {
        if (dec.test(texto)) {
          const decodificado = dec.decodificar(texto);
          if (decodificado && decodificado !== texto) {
            resultados.push({
              metodo: dec.nombre,
              texto: decodificado,
              puntuacion: puntuarTexto(decodificado),
              sha256: await generarSHA256(decodificado)
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }

    for (let shift = 1; shift < 95; shift += 1) {
      try {
        const dec = cesarImprimible(texto, shift);
        if (dec && dec !== texto) {
          const p = puntuarTexto(dec);
          if (p > 10) {
            resultados.push({
              metodo: `César (desplazamiento -${shift})`,
              texto: dec,
              puntuacion: p,
              sha256: await generarSHA256(dec)
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }

    for (let key = 1; key < 256; key += 1) {
      try {
        const dec = xorUnByte(texto, key);
        if (dec && dec !== texto) {
          const p = puntuarTexto(dec);
          if (p > 15) {
            resultados.push({
              metodo: `XOR (Clave: 0x${key.toString(16).padStart(2, '0')})`,
              texto: dec,
              puntuacion: p,
              sha256: await generarSHA256(dec)
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }

    resultados.sort((a, b) => b.puntuacion - a.puntuacion);
    return resultados.slice(0, 30);
  }

  function extraerAlfabetoUnico(texto) {
    const visto = new Set();
    let salida = '';
    for (const char of texto || '') {
      if (!visto.has(char)) {
        visto.add(char);
        salida += char;
      }
    }
    return salida;
  }

  function validarAlfabetos(origen, destino) {
    const limpioOrigen = origen || '';
    const limpioDestino = destino || '';
    const duplicadosOrigen = limpioOrigen.length !== new Set(limpioOrigen).size;
    const duplicadosDestino = limpioDestino.length !== new Set(limpioDestino).size;

    return {
      ok: limpioOrigen.length > 0 && limpioDestino.length > 0 && limpioOrigen.length === limpioDestino.length && !duplicadosOrigen && !duplicadosDestino,
      longitudOrigen: limpioOrigen.length,
      longitudDestino: limpioDestino.length,
      duplicadosOrigen,
      duplicadosDestino
    };
  }

  function traducirConAlfabeto(texto, desde, hacia, conservarDesconocidos = true) {
    const mapa = new Map();
    for (let i = 0; i < desde.length; i += 1) mapa.set(desde[i], hacia[i]);

    let salida = '';
    for (const char of texto) {
      if (mapa.has(char)) salida += mapa.get(char);
      else if (conservarDesconocidos) salida += char;
    }
    return salida;
  }

  function cifrarSustitucionPersonalizada(texto, alfabetoPlano, alfabetoCifrado) {
    const estado = validarAlfabetos(alfabetoPlano, alfabetoCifrado);
    if (!estado.ok) throw new Error('Los alfabetos deben tener la misma longitud y no repetir caracteres.');
    return traducirConAlfabeto(texto, alfabetoPlano, alfabetoCifrado, true);
  }




  
  function descifrarSustitucionPersonalizada(texto, alfabetoPlano, alfabetoCifrado) {
    const estado = validarAlfabetos(alfabetoPlano, alfabetoCifrado);
    if (!estado.ok) throw new Error('Los alfabetos deben tener la misma longitud y no repetir caracteres.');
    return traducirConAlfabeto(texto, alfabetoCifrado, alfabetoPlano, true);
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function importarClaveAesDesdePassphrase(passphrase, salt) {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function cifrarAES(texto, clave) {
    if (!clave) throw new Error('Clave requerida para AES');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await importarClaveAesDesdePassphrase(clave, salt);
    
    const payload = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(texto)
    );

    // Empaquetar Salt + IV + Payload en un solo búfer binario
    const encryptedBytes = new Uint8Array(payload);
    const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedBytes, salt.length + iv.length);

    // Retorna una única cadena compacta en Base64
    return bytesToBase64(combined);
  }

  async function descifrarAES(payload, clave) {
    if (!clave) throw new Error('Clave requerida para AES');
    
    let combined;
    const trimPayload = payload.trim();
    
    try {
      // Retrocompatibilidad: Si el payload viene en el viejo formato JSON
      if (trimPayload.startsWith('{')) {
        const obj = JSON.parse(trimPayload);
        const saltJson = Uint8Array.from(atob(obj.salt), c => c.charCodeAt(0));
        const ivJson = Uint8Array.from(atob(obj.iv), c => c.charCodeAt(0));
        const dataJson = Uint8Array.from(atob(obj.data), c => c.charCodeAt(0));
        
        const aesKeyJson = await importarClaveAesDesdePassphrase(clave, saltJson);
        const plainBufferJson = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivJson }, aesKeyJson, dataJson);
        return new TextDecoder().decode(plainBufferJson);
      }

      // Nuevo flujo: Desempaquetar la cadena Base64 única
      const binaryString = atob(trimPayload);
      combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }
    } catch (e) {
      throw new Error('El payload AES no tiene un formato Base64 o JSON válido.');
    }

    if (combined.length < 28) throw new Error('Payload corrupto o demasiado corto.');

    // Extraer en orden: Salt (16 bytes), IV (12 bytes) y los datos cifrados restantes
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const aesKey = await importarClaveAesDesdePassphrase(clave, salt);
    try {
      const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, data);
      return new TextDecoder().decode(plainBuffer);
    } catch (e) {
      throw new Error('Fallo al descifrar. La contraseña es incorrecta o los datos fueron alterados.');
    }
  }

  const codificadoresSalida = {
    Base64: async texto => btoa(String.fromCodePoint(...new TextEncoder().encode(texto))),
    Hexadecimal: async texto => Array.from(new TextEncoder().encode(texto)).map(b => b.toString(16).padStart(2, '0')).join(''),
    Binario: async texto => Array.from(new TextEncoder().encode(texto)).map(b => b.toString(2).padStart(8, '0')).join(' '),
    Reverso: async texto => texto.split('').reverse().join(''),
    ROT13: async texto => decodificadores.find(d => d.nombre === 'ROT13').decodificar(texto),
    Atbash: async texto => decodificadores.find(d => d.nombre === 'Atbash').decodificar(texto),
    Cesar: async (texto, clave) => cifrarCesar(texto, parseInt(clave, 10) || 0),
    XOR: async (texto, clave) => xorUnByte(texto, parseInt(clave, 10) || 0),
    AES: async (texto, clave) => cifrarAES(texto, clave)
  };

  async function cifrarSalida(texto, metodo, clave) {
    if (!codificadoresSalida[metodo]) throw new Error('Método no soportado');
    const cifrado = await codificadoresSalida[metodo](texto, clave);
    const hash = await generarSHA256(cifrado);
    return { cifrado, hash };
  }

  async function generarLlavesRSA() {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );

    const pubBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    return {
      publica: arrayBufferToPem(pubBuffer, 'PUBLIC KEY'),
      privada: arrayBufferToPem(privBuffer, 'PRIVATE KEY')
    };
  }

  function arrayBufferToPem(buffer, type) {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const lines = b64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
  }

  function pemToArrayBuffer(pem) {
    const b64Lines = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
    const b64 = atob(b64Lines);
    const buffer = new Uint8Array(b64.length);
    for (let i = 0; i < b64.length; i += 1) buffer[i] = b64.charCodeAt(i);
    return buffer.buffer;
  }


// Nueva función para medir qué tanto se parece un texto al español
  function calcularLegibilidad(texto) {
    let score = 0;
    const vocales = "aeiouáéíóú";
    const comunes = [" de ", " el ", " la ", " que ", " en ", " los ", " se "];
    
    for (const char of texto.toLowerCase()) {
      if (vocales.includes(char)) score += 2;
      if (char === " ") score += 3;
    }
    comunes.forEach(palabra => {
      if (texto.toLowerCase().includes(palabra)) score += 15;
    });
    return score;
  }

  // Fuerza bruta sobre una sola cadena rotándola
  function crackearCesar(texto, cadena) {
    let mejorTexto = "";
    let mejorScore = -1;
    let mejorK = 0;
    const chars = extraerAlfabetoUnico(cadena).split('');
    const N = chars.length;

    for (let k = 0; k < N; k++) {
      const rotado = [...chars.slice(k), ...chars.slice(0, k)].join('');
      const intento = traducirConAlfabeto(texto, rotado, chars);
      const actualScore = calcularLegibilidad(intento);
      
      if (actualScore > mejorScore) {
        mejorScore = actualScore;
        mejorTexto = intento;
        mejorK = k;
      }
    }
    return { texto: mejorTexto, k: mejorK };
  }

  
  async function firmarMensajeRSA(mensaje, pemPrivada) {
    const privBuffer = pemToArrayBuffer(pemPrivada);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const data = new TextEncoder().encode(mensaje);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  return {
    generarSHA256,
    autoDescubrir,
    cifrarSalida,
    generarLlavesRSA,
    firmarMensajeRSA,
    descifrarAES,
    cifrarAES,
    validarAlfabetos,
    extraerAlfabetoUnico,
    cifrarSustitucionPersonalizada,
    descifrarSustitucionPersonalizada
  };
})();
