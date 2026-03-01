const MotorCifrado = {
    procesar: async function(texto, alfabeto, modulo, tipo_cifrado, accion, clave_vigenere) {
        let resultado = '';
        const len = texto.length;
        const alpha_len = alfabeto.length;

        if (alpha_len === 0) return "ERROR: Alfabeto erradicado. Sistema comprometido.";

        try {
            if (accion === 'fuerzabruta') {
                if (tipo_cifrado !== 'cesar') {
                    return "ERROR: La fuerza bruta actualmente solo está soportada para el algoritmo César.";
                }
                const alpha_arr = alfabeto.split('');
                for(let m = 1; m < alpha_len; m++) {
                    resultado += `[Módulo ${m}]: `;
                    for (let i = 0; i < len; i++) {
                        const char = texto[i];
                        const pos = alpha_arr.indexOf(char);
                        if (pos !== -1) {
                            let nueva_pos = (pos - m) % alpha_len;
                            if (nueva_pos < 0) nueva_pos += alpha_len;
                            resultado += alpha_arr[nueva_pos];
                        } else {
                            resultado += char;
                        }
                    }
                    resultado += '\n';
                }
                return resultado;
            }

            if (tipo_cifrado === 'base64') {
                if (accion === 'cifrar') resultado = btoa(texto);
                else resultado = atob(texto);
            } else if (tipo_cifrado === 'hex') {
                if (accion === 'cifrar') {
                    resultado = Array.from(texto).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
                } else {
                    let hex = texto.replace(/\s+/g, '').toString();
                    let str = '';
                    for (let n = 0; n < hex.length; n += 2) {
                        str += String.fromCharCode(parseInt(hex.substring(n, n+2), 16));
                    }
                    resultado = str;
                }
            } else if (tipo_cifrado === 'vigenere') {
                const clave_arr = clave_vigenere.split('');
                const alpha_arr = alfabeto.split('');
                let clave_idx = 0;
                
                if (clave_arr.length === 0) return "ERROR: Se requiere una clave para Vigenère.";

                for (let i = 0; i < len; i++) {
                    const char = texto[i];
                    const pos = alpha_arr.indexOf(char);
                    if (pos !== -1) {
                        const shift_char = clave_arr[clave_idx % clave_arr.length];
                        const shift = alpha_arr.indexOf(shift_char);
                        
                        if (shift === -1) {
                            resultado += char; 
                            continue;
                        }

                        let nueva_pos;
                        if (accion === 'cifrar') {
                            nueva_pos = (pos + shift) % alpha_len;
                        } else {
                            nueva_pos = (pos - shift) % alpha_len;
                            if (nueva_pos < 0) nueva_pos += alpha_len;
                        }
                        resultado += alpha_arr[nueva_pos];
                        clave_idx++;
                    } else {
                        resultado += char;
                    }
                }
            } else {
                // César estándar y Atbash
                const alpha_arr = alfabeto.split('');
                for (let i = 0; i < len; i++) {
                    const char = texto[i];
                    const pos = alpha_arr.indexOf(char);

                    if (pos !== -1) {
                        if (tipo_cifrado === 'cesar') {
                            let nueva_pos;
                            if (accion === 'cifrar') {
                                nueva_pos = (pos + modulo) % alpha_len;
                            } else {
                                nueva_pos = (pos - modulo) % alpha_len;
                                if (nueva_pos < 0) nueva_pos += alpha_len;
                            }
                            resultado += alpha_arr[nueva_pos];
                        } else if (tipo_cifrado === 'atbash') {
                            let nueva_pos = (alpha_len - 1) - pos;
                            resultado += alpha_arr[nueva_pos];
                        }
                    } else {
                        resultado += char;
                    }
                }
            }
        } catch (e) {
            resultado = "ERROR de procesamiento (verifica la entrada): " + e.message;
        }

        return resultado;
    },

    generarSHA256: async function(mensaje) {
        const msgBuffer = new TextEncoder().encode(mensaje);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
};
