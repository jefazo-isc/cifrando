const MotorCifrado = (function() {
    // Alfabeto ASCII imprimible (32-126) para ciertos cifrados
    const ASCII_PRINTABLE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join('');
    const ALFABETO_COMPLETO = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join('');

    // Palabras comunes en inglés y español para puntuación
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

    // Frecuencia de letras en español (aproximada)
    const LETTER_FREQ_ES = {
        'a': 0.11525, 'b': 0.02215, 'c': 0.04019, 'd': 0.05010, 'e': 0.12181,
        'f': 0.00692, 'g': 0.01768, 'h': 0.00703, 'i': 0.06247, 'j': 0.00493,
        'k': 0.00011, 'l': 0.04967, 'm': 0.03157, 'n': 0.06712, 'o': 0.08683,
        'p': 0.02510, 'q': 0.00877, 'r': 0.06870, 's': 0.07977, 't': 0.04632,
        'u': 0.03927, 'v': 0.01138, 'w': 0.00017, 'x': 0.00215, 'y': 0.01008,
        'z': 0.00467
    };

    // Genera SHA-256 de un mensaje
    async function generarSHA256(mensaje) {
        const msgBuffer = new TextEncoder().encode(mensaje);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Convierte un array de bytes (Uint8Array) a cadena UTF-8
    function utf8FromBytes(bytes) {
        return new TextDecoder('utf-8').decode(bytes);
    }

    // Puntúa un texto según su probabilidad de ser español/inglés (mayor puntuación = más probable)
    function puntuarTexto(texto) {
        if (texto.length === 0) return 0;
        let puntuacion = 0;
        const lower = texto.toLowerCase();
        // 1. Frecuencia de letras (solo letras) - mezcla inglés/español, usamos español como base
        let letras = 0;
        for (let char of lower) {
            if (char >= 'a' && char <= 'z') {
                letras++;
                puntuacion += LETTER_FREQ_ES[char] || 0;
            }
        }
        // Normalizar por número de letras
        if (letras > 0) puntuacion = (puntuacion / letras) * 100;

        // 2. Presencia de palabras comunes (inglés y español)
        const palabras = lower.split(/\s+/);
        for (let palabra of palabras) {
            if (COMMON_WORDS_EN.has(palabra)) puntuacion += 3;
            if (COMMON_WORDS_ES.has(palabra)) puntuacion += 5; // mayor peso para español
        }

        // 3. Proporción de letras vs no letras (incentiva texto alfabético)
        const proporcionLetras = letras / texto.length;
        puntuacion += proporcionLetras * 20;

        return puntuacion;
    }

    // Decodificadores específicos (devuelven cadena UTF-8)
    const decodificadores = [
        {
            nombre: 'Base64',
            test: (texto) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(texto) && texto.length % 4 === 0,
            decodificar: (texto) => {
                const binaryString = atob(texto);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return utf8FromBytes(bytes);
            }
        },
        {
            nombre: 'Base32',
            test: (texto) => /^[A-Z2-7]+=*$/.test(texto) && texto.length % 8 === 0,
            decodificar: (texto) => {
                const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                let bits = '';
                texto = texto.replace(/=+$/, '');
                for (let i = 0; i < texto.length; i++) {
                    const val = base32chars.indexOf(texto[i]);
                    if (val === -1) throw new Error('Carácter inválido');
                    bits += val.toString(2).padStart(5, '0');
                }
                const bytes = [];
                for (let i = 0; i + 8 <= bits.length; i += 8) {
                    bytes.push(parseInt(bits.substr(i, 8), 2));
                }
                return utf8FromBytes(new Uint8Array(bytes));
            }
        },
        {
            nombre: 'Hexadecimal',
            test: (texto) => {
                const limpio = texto.replace(/\s+/g, '');
                return /^[0-9A-Fa-f]+$/.test(limpio) && limpio.length % 2 === 0;
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
                const limpio = texto.replace(/\s+/g, '');
                return /^[01]+$/.test(limpio) && limpio.length % 8 === 0;
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
            nombre: 'ROT13 (solo A-Za-z)',
            test: () => true,
            decodificar: (texto) => {
                return texto.replace(/[A-Za-z]/g, c => {
                    const base = c <= 'Z' ? 65 : 97;
                    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
                });
            }
        },
        {
            nombre: 'ROT47 (!-~)',
            test: () => true,
            decodificar: (texto) => {
                return texto.replace(/[!-~]/g, c => {
                    let code = c.charCodeAt(0);
                    return String.fromCharCode(33 + (code - 33 + 47) % 94);
                });
            }
        },
        {
            nombre: 'Atbash clásico (A-Z, a-z)',
            test: () => true,
            decodificar: (texto) => {
                return texto.replace(/[A-Za-z]/g, c => {
                    if (c >= 'A' && c <= 'Z') {
                        return String.fromCharCode(155 - c.charCodeAt(0));
                    } else {
                        return String.fromCharCode(219 - c.charCodeAt(0));
                    }
                });
            }
        },
        {
            nombre: 'Atbash ASCII imprimible (32-126)',
            test: () => true,
            decodificar: (texto) => {
                let res = '';
                for (let i = 0; i < texto.length; i++) {
                    const code = texto.charCodeAt(i);
                    if (code >= 32 && code <= 126) {
                        res += String.fromCharCode(32 + (126 - code));
                    } else {
                        res += texto[i];
                    }
                }
                return res;
            }
        }
    ];

    // Cifrado César sobre ASCII imprimible (32-126)
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

    // Método principal: descubre todos los posibles textos
    async function autoDescubrir(texto) {
        const resultados = [];
        const t0 = performance.now();

        // 1. Ejecutar decodificadores específicos
        for (let dec of decodificadores) {
            try {
                if (dec.test(texto)) {
                    const decodificado = dec.decodificar(texto);
                    // Evitar duplicados o resultados vacíos
                    if (decodificado && decodificado !== texto) {
                        const sha = await generarSHA256(decodificado);
                        const puntuacion = puntuarTexto(decodificado);
                        resultados.push({
                            metodo: dec.nombre,
                            texto: decodificado,
                            sha256: sha,
                            puntuacion: puntuacion
                        });
                    }
                }
            } catch (e) {
                // Fallo silencioso
            }
        }

        // 2. Fuerza bruta César sobre ASCII imprimible (95 desplazamientos)
        const cesarPromises = [];
        for (let shift = 1; shift < 95; shift++) {
            cesarPromises.push((async () => {
                try {
                    const decodificado = cesarImprimible(texto, shift);
                    if (decodificado && decodificado !== texto) {
                        const sha = await generarSHA256(decodificado);
                        const puntuacion = puntuarTexto(decodificado);
                        resultados.push({
                            metodo: `César ASCII (desplazamiento -${shift})`,
                            texto: decodificado,
                            sha256: sha,
                            puntuacion: puntuacion
                        });
                    }
                } catch (e) {}
            })());
        }
        await Promise.all(cesarPromises);

        // 3. Ordenar por puntuación descendente
        resultados.sort((a, b) => b.puntuacion - a.puntuacion);

        console.log(`Procesado en ${performance.now() - t0} ms`);
        return resultados;
    }

    return {
        generarSHA256,
        autoDescubrir
    };
})();
