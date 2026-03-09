const MotorCifrado = (function() {
    const COMMON_WORDS_EN = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
        'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all',
        'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
        'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
        'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
        'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after',
        'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want',
        'because', 'any', 'these', 'give', 'day', 'most', 'us']);

    const COMMON_WORDS_ES = new Set(['el', 'la', 'los', 'las', 'de', 'que', 'y', 'a', 'en', 'un',
        'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le',
        'yo', 'lo', 'todo', 'pero', 'más', 'hacer', 'bien', 'ahora', 'cuando', 'poder', 'decir',
        'este', 'sin', 'sobre', 'trabajo', 'vez', 'entre', 'nunca', 'gran', 'ella', 'ellas',
        'ellos', 'nos', 'os', 'mi', 'tu', 'te', 'me', 'se', 'ya', 'hay', 'sí', 'así', 'algo',
        'nada', 'casa', 'año', 'día', 'hombre', 'mujer', 'niño', 'amigo', 'ciudad', 'país',
        'vida', 'mundo', 'familia', 'trabajar', 'estudiar', 'examen', 'programa', 'cifrado']);

    const LETTER_FREQ_ES = {
        'a': 0.11525, 'b': 0.02215, 'c': 0.04019, 'd': 0.05010, 'e': 0.12181,
        'f': 0.00692, 'g': 0.01768, 'h': 0.00703, 'i': 0.06247, 'j': 0.00493,
        'k': 0.00011, 'l': 0.04967, 'm': 0.03157, 'n': 0.06712, 'o': 0.08683,
        'p': 0.02510, 'q': 0.00877, 'r': 0.06870, 's': 0.07977, 't': 0.04632,
        'u': 0.03927, 'v': 0.01138, 'w': 0.00017, 'x': 0.00215, 'y': 0.01008,
        'z': 0.00467
    };

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
            // Fallback si hay bytes no válidos para UTF-8 (común en binarios crudos)
            return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        }
    }

    // OPTIMIZACIÓN CRÍTICA PARA ARCHIVOS PESADOS:
    // Solo evalúa los primeros 2500 caracteres. Si el inicio tiene sentido, todo lo tiene.
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

        const proporcionLetras = letras / texto.length;
        puntuacion += proporcionLetras * 20;

        return puntuacion;
    }

    const decodificadores = [
        {
            nombre: 'Base64',
            test: (texto) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(texto.trim().substring(0, 100)) && texto.trim().length % 4 === 0,
            decodificar: (texto) => {
                const binaryString = atob(texto.trim());
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
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
                for (let n = 0; n < limpio.length; n += 2) {
                    bytes[n/2] = parseInt(limpio.substring(n, n+2), 16);
                }
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
                for (let n = 0; n < limpio.length; n += 8) {
                    bytes[n/8] = parseInt(limpio.substr(n, 8), 2);
                }
                return utf8FromBytes(bytes);
            }
        },
        {
            nombre: 'Reverso',
            test: () => true,
            decodificar: (texto) => texto.split('').reverse().join('')
        },
        {
            nombre: 'ROT13',
            test: () => true,
            decodificar: (texto) => {
                return texto.replace(/[A-Za-z]/g, c => {
                    const base = c <= 'Z' ? 65 : 97;
                    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
                });
            }
        },
        {
            nombre: 'Atbash',
            test: () => true,
            decodificar: (texto) => {
                return texto.replace(/[A-Za-z]/g, c => {
                    if (c >= 'A' && c <= 'Z') return String.fromCharCode(155 - c.charCodeAt(0));
                    return String.fromCharCode(219 - c.charCodeAt(0));
                });
            }
        }
    ];

    function cesarImprimible(texto, desplazamiento) {
        let res = '';
        for (let i = 0; i < texto.length; i++) {
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

    function xorUnByte(texto, clave) {
        let res = '';
        for (let i = 0; i < texto.length; i++) {
            res += String.fromCharCode(texto.charCodeAt(i) ^ clave);
        }
        return res;
    }

    async function autoDescubrir(texto) {
        const resultados = [];
        const t0 = performance.now();

        // 1. Decodificadores estándar
        for (let dec of decodificadores) {
            try {
                if (dec.test(texto)) {
                    const decodificado = dec.decodificar(texto);
                    if (decodificado && decodificado !== texto) {
                        const puntuacion = puntuarTexto(decodificado);
                        resultados.push({
                            metodo: dec.nombre,
                            texto: decodificado,
                            puntuacion: puntuacion
                        });
                    }
                }
            } catch (e) {}
        }

        // 2. César (95 variaciones)
        for (let shift = 1; shift < 95; shift++) {
            try {
                const decodificado = cesarImprimible(texto, shift);
                if (decodificado && decodificado !== texto) {
                    const puntuacion = puntuarTexto(decodificado);
                    if (puntuacion > 10) { // Filtrar basura total
                        resultados.push({
                            metodo: `César (desplazamiento -${shift})`,
                            texto: decodificado,
                            puntuacion: puntuacion
                        });
                    }
                }
            } catch (e) {}
        }

        // 3. XOR de 1 Byte (255 variaciones) - Clásico en Hacking de Redes
        for (let key = 1; key < 256; key++) {
            try {
                const decodificado = xorUnByte(texto, key);
                if (decodificado && decodificado !== texto) {
                    const puntuacion = puntuarTexto(decodificado);
                    if (puntuacion > 15) { // Umbral más alto para XOR para evitar ruido
                        resultados.push({
                            metodo: `XOR (Clave: 0x${key.toString(16).padStart(2,'0')})`,
                            texto: decodificado,
                            puntuacion: puntuacion
                        });
                    }
                }
            } catch (e) {}
        }

        // Ordenar, generar SHA-256 diferido solo para los mejores para ahorrar CPU
        resultados.sort((a, b) => b.puntuacion - a.puntuacion);
        
        // Calcular hashes solo de los primeros 30 resultados
        const maxResultados = Math.min(resultados.length, 30);
        for(let i=0; i<maxResultados; i++){
            resultados[i].sha256 = await generarSHA256(resultados[i].texto);
        }

        console.log(`Análisis de ${texto.length} bytes completado en ${Math.round(performance.now() - t0)} ms`);
        return resultados.slice(0, 30);
    }

    const codificadoresSalida = {
        'Base64': (texto) => {
            const bytes = new TextEncoder().encode(texto);
            const binString = String.fromCodePoint(...bytes);
            return btoa(binString);
        },
        'Hexadecimal': (texto) => {
            const bytes = new TextEncoder().encode(texto);
            return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        },
        'Binario': (texto) => {
            const bytes = new TextEncoder().encode(texto);
            return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join('');
        },
        'Reverso': (texto) => texto.split('').reverse().join(''),
        'ROT13': (texto) => decodificadores.find(d => d.nombre === 'ROT13').decodificar(texto),
        'Atbash': (texto) => decodificadores.find(d => d.nombre === 'Atbash').decodificar(texto)
    };

    async function cifrarSalida(texto, metodo) {
        if (!codificadoresSalida[metodo]) throw new Error('Método no soportado');
        const cifrado = codificadoresSalida[metodo](texto);
        const hash = await generarSHA256(cifrado);
        return { cifrado, hash };
    }

    return {
        generarSHA256,
        autoDescubrir,
        cifrarSalida
    };
})();
