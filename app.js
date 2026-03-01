document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('nucleo-cifrado');
    const entradas = formulario.querySelectorAll('input, textarea');
    const monitor = document.getElementById('monitor-resultado');
    const monitorSha = document.getElementById('monitor-sha256');

    async function sincronizarDatos() {
        const texto = document.querySelector('[name="texto"]').value;
        const alfabeto = document.querySelector('[name="alfabeto"]').value;
        const moduloElemento = document.querySelector('[name="modulo"]').value;
        const modulo = parseInt(moduloElemento, 10) || 0;
        const claveVigenere = document.querySelector('[name="clave_vigenere"]').value;
        
        const tipo_cifrado = document.querySelector('input[name="tipo_cifrado"]:checked').value;
        const accion = document.querySelector('input[name="accion"]:checked').value;

        if (texto.trim() === '') {
            monitor.textContent = 'Esperando flujo de datos...';
            monitorSha.textContent = '-';
            return;
        }

        // Invocamos al motor de forma asíncrona
        const textoResultante = await MotorCifrado.procesar(texto, alfabeto, modulo, tipo_cifrado, accion, claveVigenere);
        monitor.textContent = textoResultante;

        // Generamos la firma SHA-256 si no hay un error crítico
        if (!textoResultante.startsWith('ERROR')) {
            const sha = await MotorCifrado.generarSHA256(textoResultante);
            monitorSha.textContent = sha;
        } else {
            monitorSha.textContent = '-';
        }
    }

    entradas.forEach(entrada => {
        entrada.addEventListener('input', sincronizarDatos);
        entrada.addEventListener('change', sincronizarDatos);
    });

    sincronizarDatos();
});
