const MotorCifrado = {
    procesar: function(texto, alfabeto, modulo, tipo_cifrado, accion) {
        let resultado = '';
        const len = texto.length;
        const alpha_len = alfabeto.length;

        if (alpha_len === 0) return "ERROR: Alfabeto erradicado. Sistema comprometido.";

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
        return resultado;
    }
};
