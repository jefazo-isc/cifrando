const MotorCifrado = (function() {
    const COMMON_WORDS_EN = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us']);
    const COMMON_WORDS_ES = new Set(['el', 'la', 'los', 'las', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'yo', 'lo', 'todo', 'pero', 'más', 'hacer', 'bien', 'ahora', 'cuando', 'poder', 'decir', 'este', 'sin', 'sobre', 'trabajo', 'vez', 'entre', 'nunca', 'gran', 'ella', 'ellas', 'ellos', 'nos', 'os', 'mi', 'tu', 'te', 'me', 'se', 'ya', 'hay', 'sí', 'así', 'algo', 'nada', 'casa', 'año', 'día', 'hombre', 'mujer', 'niño', 'amigo', 'ciudad', 'país', 'vida', 'mundo', 'familia', 'trabajar', 'estudiar', 'examen', 'programa', 'cifrado']);
    const LETTER_FREQ_ES = {'a': 0.11525, 'b': 0.02215, 'c': 0.04019, 'd': 0.05010, 'e': 0.12181, 'f': 0.00692, 'g': 0.01768, 'h': 0.00703, 'i': 0.06247, 'j': 0.00493, 'k': 0.00011, 'l': 0.04967, 'm': 0.03157, 'n': 0.06712, 'o': 0.08683, 'p': 0.02510, 'q': 0.00877, 'r': 0.06870, 's': 0.07977, 't': 0.04632, 'u': 0.03927, 'v': 0.01138, 'w': 0.00017, 'x': 0.00215, 'y': 0.01008, 'z': 0.00467};

    async function generarSHA256(mensaje) {
        const msgBuffer = new TextEncoder().encode(mensaje);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function utf8FromBytes(bytes) {
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch(e) {
            return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        }
    }

    function puntuarTexto(textoCompleto) {
        if (textoCompleto.length === 0) return 0;
        const texto = textoCompleto.substring(0, 2500); 
        let puntuacion = 0;
        const lower = texto.toLowerCase();
        let letras = 0;
        for (let char of lower) {
            if (char >= 'a' && char <= 'z') {
                letras++;
                puntuacion += LETTER_FREQ_ES[char] || 0;
            }
        }
        if (letras > 0) puntuacion = (puntuacion / letras) * 100;
        const palabras = lower.split(/\s+/);
        for (let palabra of palabras) {
            if (COMMON_WORDS_EN.has(palabra)) puntuacion += 3;
            if (COMMON_WORDS_ES.has(palabra)) puntuacion += 5;
        }
        puntuacion += (letras / texto.length) * 20;
        return puntuacion;
    }

    const decodificadores = [
        {
            nombre: 'Base64',
            test: (texto) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(texto.trim().substring(0, 100)) && texto.trim().length % 4 === 0,
            decodificar: (texto) => {
                const binaryString = atob(texto.trim());
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                return utf8FromBytes(bytes);
            }
        },
        {
            nombre: 'Hexadecimal',
            test: (texto) => {
                const limpio = texto.substring(0, 100).replace(/\s+/g, '');
                return /^[0-9A-Fa-f]+$/.test(limpio) && texto.replace(/\s+/g, '').length % 2 === 0;
            },
            decodificar: (texto) => {
                const limpio = texto.replace(/\s+/g, '');
                const bytes = new Uint8Array(limpio.length / 2);
                for (let n = 0; n < limpio.length; n += 2) bytes[n/2] = parseInt(limpio.substring(n, n+2), 16);
                return utf8FromBytes(bytes);
            }
        },
        {
            nombre: 'Binario (8 bits)',
            test: (texto) => {
                const limpio = texto.substring(0, 80).replace(/\s+/g, '');
                return /^[01]+$/.test(limpio) && texto.replace(/\s+/g, '').length % 8 === 0;
            },
            decodificar: (texto) => {
                const limpio = texto.replace(/\s+/g, '');
                const bytes = new Uint8Array(limpio.length / 8);
                for (let n = 0; n < limpio.length; n += 8) bytes[n/8] = parseInt(limpio.substr(n, 8), 2);
                return utf8FromBytes(bytes);
            }
        },
        { nombre: 'Reverso', test: () => true, decodificar: (texto) => texto.split('').reverse().join('') },
        { nombre: 'ROT13', test: () => true, decodificar: (texto) => texto.replace(/[A-Za-z]/g, c => String.fromCharCode((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26 + (c <= 'Z' ? 65 : 97))) },
        { nombre: 'Atbash', test: () => true, decodificar: (texto) => texto.replace(/[A-Za-z]/g, c => String.fromCharCode((c >= 'A' && c <= 'Z') ? 155 - c.charCodeAt(0) : 219 - c.charCodeAt(0))) }
    ];

    function cesarImprimible(texto, desplazamiento) {
        let res = '';
        for (let i = 0; i < texto.length; i++) {
            const code = texto.charCodeAt(i);
            if (code >= 32 && code <= 126) {
                let nuevo = code - desplazamiento;
                if (nuevo < 32) nuevo += 95;
                res += String.fromCharCode(nuevo);
            } else res += texto[i];
        }
        return res;
    }

    function cifrarCesar(texto, desplazamiento) {
        let res = '';
        desplazamiento = ((desplazamiento % 95) + 95) % 95;
        for (let i = 0; i < texto.length; i++) {
            const code = texto.charCodeAt(i);
            if (code >= 32 && code <= 126) {
                let nuevo = code + desplazamiento;
                if (nuevo > 126) nuevo -= 95;
                res += String.fromCharCode(nuevo);
            } else res += texto[i];
        }
        return res;
    }

    function xorUnByte(texto, clave) {
        let res = '';
        for (let i = 0; i < texto.length; i++) res += String.fromCharCode(texto.charCodeAt(i) ^ clave);
        return res;
    }

    async function autoDescubrir(texto) {
        const resultados = [];
        for (let dec of decodificadores) {
            try {
                if (dec.test(texto)) {
                    const decodificado = dec.decodificar(texto);
                    if (decodificado && decodificado !== texto) resultados.push({ metodo: dec.nombre, texto: decodificado, puntuacion: puntuarTexto(decodificado) });
                }
            } catch (e) {}
        }
        for (let shift = 1; shift < 95; shift++) {
            try {
                const dec = cesarImprimible(texto, shift);
                if (dec && dec !== texto) {
                    const p = puntuarTexto(dec);
                    if (p > 10) resultados.push({ metodo: `César (desplazamiento -${shift})`, texto: dec, puntuacion: p });
                }
            } catch (e) {}
        }
        for (let key = 1; key < 256; key++) {
            try {
                const dec = xorUnByte(texto, key);
                if (dec && dec !== texto) {
                    const p = puntuarTexto(dec);
                    if (p > 15) resultados.push({ metodo: `XOR (Clave: 0x${key.toString(16).padStart(2,'0')})`, texto: dec, puntuacion: p });
                }
            } catch (e) {}
        }
        resultados.sort((a, b) => b.puntuacion - a.puntuacion);
        const maxResultados = Math.min(resultados.length, 30);
        for(let i=0; i<maxResultados; i++) resultados[i].sha256 = await generarSHA256(resultados[i].texto);
        return resultados.slice(0, 30);
    }

    /* -------------------------------------------------------------
       MÓDULO AES (OpenSSL Compatible via CryptoJS)
    ------------------------------------------------------------- */
    function descifrarAES(textoCifradoBase64, password) {
        try {
            // CryptoJS decodifica nativamente archivos encriptados con openssl (Salted__)
            const bytes = CryptoJS.AES.decrypt(textoCifradoBase64.trim(), password);
            const textoClaro = bytes.toString(CryptoJS.enc.Utf8);
            if (!textoClaro) throw new Error("Llave incorrecta o formato inválido.");
            return textoClaro;
        } catch (e) {
            throw new Error("Fallo al descifrar AES. Verifica la contraseña y que el archivo se haya leído bien.");
        }
    }

    function cifrarAES(textoPlano, password) {
        if (!password) throw new Error("Necesitas ingresar una contraseña para cifrar en AES.");
        // Devuelve el string Base64 compatible con OpenSSL
        return CryptoJS.AES.encrypt(textoPlano, password).toString();
    }

    /* -------------------------------------------------------------
       MÓDULO RSA (Estándar PKCS#8 / SPKI)
    ------------------------------------------------------------- */
    function arrayBufferToPem(buffer, type) {
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const lines = b64.match(/.{1,64}/g).join('\n');
        return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
    }

    function pemToArrayBuffer(pem) {
        const b64Lines = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
        const b64 = atob(b64Lines);
        const buffer = new Uint8Array(b64.length);
        for (let i = 0; i < b64.length; i++) buffer[i] = b64.charCodeAt(i);
        return buffer.buffer;
    }

    async function generarLlavesRSA() {
        const keyPair = await crypto.subtle.generateKey(
            { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true, ["sign", "verify"]
        );
        const pubBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        return { publica: arrayBufferToPem(pubBuffer, "PUBLIC KEY"), privada: arrayBufferToPem(privBuffer, "PRIVATE KEY") };
    }

    async function firmarMensajeRSA(mensaje, pemPrivada) {
        const privBuffer = pemToArrayBuffer(pemPrivada);
        const privateKey = await crypto.subtle.importKey(
            "pkcs8", privBuffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
        );
        const data = new TextEncoder().encode(mensaje);
        const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, data);
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }

    const codificadoresSalida = {
        'AES': (texto, clave) => cifrarAES(texto, clave),
        'Base64': (texto) => btoa(String.fromCodePoint(...new TextEncoder().encode(texto))),
        'Hexadecimal': (texto) => Array.from(new TextEncoder().encode(texto)).map(b => b.toString(16).padStart(2, '0')).join(''),
        'Binario': (texto) => Array.from(new TextEncoder().encode(texto)).map(b => b.toString(2).padStart(8, '0')).join(''),
        'Reverso': (texto) => texto.split('').reverse().join(''),
        'ROT13': (texto) => decodificadores.find(d => d.nombre === 'ROT13').decodificar(texto),
        'Atbash': (texto) => decodificadores.find(d => d.nombre === 'Atbash').decodificar(texto),
        'Cesar': (texto, clave) => cifrarCesar(texto, parseInt(clave) || 0),
        'XOR': (texto, clave) => xorUnByte(texto, parseInt(clave) || 0)
    };

    async function cifrarSalida(texto, metodo, clave) {
        if (!codificadoresSalida[metodo]) throw new Error('Método no soportado');
        const cifrado = codificadoresSalida[metodo](texto, clave);
        const hash = await generarSHA256(cifrado);
        return { cifrado, hash };
    }

    return { generarSHA256, autoDescubrir, cifrarSalida, generarLlavesRSA, firmarMensajeRSA, descifrarAES };
})();
