document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('nucleo-cifrado');
    const entradas = formulario.querySelectorAll('input, textarea');
    const monitor = document.getElementById('monitor-resultado');

    function sincronizarDatos() {
        const texto = document.querySelector('[name="texto"]').value;
        const alfabeto = document.querySelector('[name="alfabeto"]').value;
        const moduloElemento = document.querySelector('[name="modulo"]').value;
        const modulo = parseInt(moduloElemento, 10) || 0;
        
        const tipo_cifrado = document.querySelector('input[name="tipo_cifrado"]:checked').value;
        const accion = document.querySelector('input[name="accion"]:checked').value;

        // Invocamos al motor aislado del archivo cipher.js
        const textoResultante = MotorCifrado.procesar(texto, alfabeto, modulo, tipo_cifrado, accion);
        
        if (texto.trim() === '') {
            monitor.textContent = 'Esperando flujo de datos...';
        } else {
            monitor.textContent = textoResultante;
        }
    }

    entradas.forEach(entrada => {
        entrada.addEventListener('input', sincronizarDatos);
        entrada.addEventListener('change', sincronizarDatos);
    });

    sincronizarDatos();
});
